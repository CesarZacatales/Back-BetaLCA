import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
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

  // INICIAR SESIÓN
  async validateUser(email: string, password: string) {
    const supabase = this.supabaseService.getClient();

    // Buscar usuario
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const user = data;

    // Validar contraseña
    const passwordMatch = await bcrypt.compare(password, user.pass_hash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    // Si el usuario aún no activó su cuenta (contraseña temporal)
    if (user.activo === false) {
      return {
        mustChangePassword: true,
        message: 'Debe cambiar su contraseña temporal antes de continuar.',
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
        },
      };
    }

    // Generar token JWT
    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const token = await this.jwtService.signAsync(payload);

    const { pass_hash, ...safeUser } = user;

    return {
      message: 'Inicio de sesión exitoso',
      user: safeUser,
      token,
    };
  }

  // REGISTRO NORMAL (no para invitados)
  async registerUser(registerDto: any) {
    const { email, password, nombre, rol } = registerDto;

    if (!email || !password || !nombre || !rol) {
      throw new BadRequestException('Faltan campos obligatorios');
    }

    const supabase = this.supabaseService.getClient();

    const { data: existingUser } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new BadRequestException('El correo ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('usuario')
      .insert([
        {
          nombre,
          email,
          pass_hash: hashedPassword,
          rol,
          activo: true,
        },
      ])
      .select('id, nombre, email, rol')
      .single();

    if (error) throw new BadRequestException('Error al registrar usuario');

    return {
      message: 'Usuario registrado exitosamente',
      user: data,
    };
  }

  // CAMBIO DE CONTRASEÑA (usado por invitados y usuarios activos)
  async changePassword(dto: any) {
    const { email, currentPassword, newPassword } = dto;
    const supabase = this.supabaseService.getClient();

    // Verificar usuario
    const { data: user, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) throw new BadRequestException('Usuario no encontrado');

    // Verificar contraseña actual
    const match = await bcrypt.compare(currentPassword, user.pass_hash);
    if (!match) throw new BadRequestException('Contraseña actual incorrecta');

    // Encriptar nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 10);

    // Actualizar en BD → activar la cuenta
    const { error: updateError } = await supabase
      .from('usuario')
      .update({
        pass_hash: newHash,
        activo: true,
        actualizado_en: new Date().toISOString(),
      })
      .eq('email', email);

    if (updateError)
      throw new BadRequestException('Error al actualizar la contraseña');

    return {
      message: 'Contraseña actualizada correctamente. Ahora puede iniciar sesión.',
    };
  }

  // OLVIDÉ MI CONTRASEÑA → Enviar enlace por correo
  async sendResetLink(email: string) {
    const supabase = this.supabaseService.getClient();

    // Buscar usuario
    const { data: user } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (!user)
      throw new BadRequestException('No existe un usuario con ese correo.');

    // Generar token JWT con expiración de 15 min
    const token = await this.jwtService.signAsync(
      { email },
      { expiresIn: '15m' },
    );

    // Construir enlace con variable del entorno
    const resetUrl = `${process.env.FRONT_URL}/reset-password?token=${token}`;

    // Crear transporte seguro
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Correo HTML elegante
    const mailOptions = {
      from: `"Soporte Beta LCA" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Restablecimiento de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f6fa; padding: 30px;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color:#2563eb; text-align:center;">Restablecer contraseña</h2>
            <p>Hola <strong>${user.nombre}</strong>,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña. Puedes hacerlo haciendo clic en el siguiente botón:</p>
            <div style="text-align:center; margin:24px 0;">
              <a href="${resetUrl}"
                 style="background-color:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">
                 Restablecer contraseña
              </a>
            </div>
            <p>Este enlace es válido por <strong>15 minutos</strong>.</p>
            <hr style="margin:24px 0;"/>
            <p style="font-size:13px; color:#666;">Si no solicitaste este cambio, ignora este mensaje.</p>
          </div>
        </div>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Enlace de recuperación enviado a ${email}`);
    } catch (err) {
      console.error('Error al enviar correo:', err.message);
      throw new InternalServerErrorException(
        'Error al enviar el correo de recuperación.',
      );
    }

    return {
      message: 'Correo de recuperación enviado correctamente.',
    };
  }

  // RESETEAR CONTRASEÑA (desde el enlace del correo)
  async resetPassword(body: { token: string; newPassword: string }) {
    const { token, newPassword } = body;

    try {
      const payload = await this.jwtService.verifyAsync(token);
      const email = payload.email;

      const supabase = this.supabaseService.getClient();
      const hashed = await bcrypt.hash(newPassword, 10);

      const { error } = await supabase
        .from('usuario')
        .update({
          pass_hash: hashed,
          activo: true,
          actualizado_en: new Date().toISOString(),
        })
        .eq('email', email);

      if (error)
        throw new InternalServerErrorException('Error al actualizar contraseña');

      return { message: 'Contraseña restablecida correctamente' };
    } catch {
      throw new BadRequestException('Token inválido o expirado. Solicita otro enlace.');
    }
  }
}
