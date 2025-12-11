import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';

import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SupabaseService } from '../supabase/supabase.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // HELPERS
  // ============================================================
  generateAccessToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });
  }

  generateRefreshToken(payload: any) {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: '7d',
    });
  }

  // ============================================================
  // LOGIN
  // ============================================================
  async validateUser(email: string, password: string) {
    const supabase = this.supabaseService.getClient();

    const { data: user, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user)
      throw new UnauthorizedException('Usuario no encontrado');

    const match = await bcrypt.compare(password, user.pass_hash);
    if (!match)
      throw new UnauthorizedException('Contraseña incorrecta');

    // Si es usuario temporal / inactivo
    if (user.activo === false) {
      return {
        mustChangePassword: true,
        message: 'Debe cambiar su contraseña temporal.',
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
        },
      };
    }

    // Token payload
    const payload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
    };

    // Crear tokens
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Guardar refresh token hasheado
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    await supabase
      .from('usuario')
      .update({ refresh_token: refreshHash })
      .eq('id', user.id);

    const { pass_hash, refresh_token, ...clean } = user;

    return {
      message: 'Inicio de sesión exitoso',
      user: clean,
      accessToken,
      refreshToken,
    };
  }

  // ============================================================
  // REFRESH TOKENS
  // ============================================================
  async refreshTokens(userId: number, refreshToken: string) {
    const supabase = this.supabaseService.getClient();

    const { data: user } = await supabase
      .from('usuario')
      .select('id, email, rol, refresh_token')
      .eq('id', userId)
      .maybeSingle();

    if (!user || !user.refresh_token)
      throw new ForbiddenException('Refresh token no registrado');

    const valid = await bcrypt.compare(refreshToken, user.refresh_token);

    if (!valid)
      throw new ForbiddenException('Refresh token inválido');

    const payload = { sub: user.id, email: user.email, rol: user.rol };

    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken(payload);

    const newHash = await bcrypt.hash(newRefreshToken, 10);

    await supabase
      .from('usuario')
      .update({ refresh_token: newHash })
      .eq('id', user.id);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  async logout(userId: number) {
    await this.supabaseService
      .getClient()
      .from('usuario')
      .update({ refresh_token: null })
      .eq('id', userId);

    return { message: 'Sesión cerrada correctamente' };
  }

  // ============================================================
  // REGISTRO COMPLETO
  // ============================================================
  async registerUser(dto: any) {
    const { email, password, nombre, rol } = dto;

    if (!email || !password || !nombre || !rol)
      throw new BadRequestException('Faltan campos obligatorios');

    const supabase = this.supabaseService.getClient();

    const { data: exists } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (exists)
      throw new BadRequestException('El correo ya está registrado');

    const hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('usuario')
      .insert([
        {
          nombre,
          email,
          pass_hash: hash,
          rol,
          activo: true,
        },
      ])
      .select('id, nombre, email, rol')
      .single();

    if (error)
      throw new InternalServerErrorException('Error al registrar usuario');

    return { message: 'Usuario registrado exitosamente', user: data };
  }

  // ============================================================
  // CAMBIAR CONTRASEÑA
  // ============================================================
  async changePassword(dto: any) {
    const { email, currentPassword, newPassword } = dto;

    const supabase = this.supabaseService.getClient();

    const { data: user } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .single();

    if (!user)
      throw new BadRequestException('Usuario no encontrado');

    const match = await bcrypt.compare(currentPassword, user.pass_hash);
    if (!match)
      throw new BadRequestException('Contraseña actual incorrecta');

    const newHash = await bcrypt.hash(newPassword, 10);

    await supabase
      .from('usuario')
      .update({
        pass_hash: newHash,
        activo: true,
        actualizado_en: new Date().toISOString(),
      })
      .eq('email', email);

    return { message: 'Contraseña actualizada correctamente' };
  }

  // ============================================================
  // RECUPERAR CONTRASEÑA
  // ============================================================
  async sendResetLink(email: string) {
    const supabase = this.supabaseService.getClient();

    const { data: user } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user)
      throw new BadRequestException('El correo no está registrado');

    const token = this.jwtService.sign(
      { email },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '15m',
      },
    );

    const resetUrl = `${process.env.FRONT_URL}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Soporte Beta LCA" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Restablecer contraseña',
      html: `
      <p>Hola ${user.nombre},</p>
      <p>Haz clic aquí para restablecer tu contraseña:</p>
      <a href="${resetUrl}">Restablecer contraseña</a>
    `,
    });

    return { message: 'Correo enviado correctamente' };
  }

  // ============================================================
  // RESTABLECER CONTRASEÑA
  // ============================================================
  async resetPassword(body: { token: string; newPassword: string }) {
    const { token, newPassword } = body;

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      const email = payload.email;

      const hash = await bcrypt.hash(newPassword, 10);

      await this.supabaseService
        .getClient()
        .from('usuario')
        .update({
          pass_hash: hash,
          activo: true,
        })
        .eq('email', email);

      return { message: 'Contraseña restablecida correctamente' };
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }
  }
}
