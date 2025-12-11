import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './userDto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import * as nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  // =====================================================================
  // 🔍 OBTENER SOLO USUARIOS (NO ADMIN)
  // =====================================================================
  async getAllUsers() {
    const supabase = this.supabaseService.getClient();

    // Solo devolver usuarios con rol "usuario"
    const { data, error } = await supabase
      .from('usuario')
      .select('id, nombre, email, rol, activo')
      .eq('rol', 'usuario'); 

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // =====================================================================
  // 📝 CREAR USUARIO (CON CONTRASEÑA TEMPORAL)
  // =====================================================================
  async createUser(createUserDto: CreateUserDto) {
    const { nombre, email } = createUserDto;
    const rol = 'usuario'; // Admin solo crea usuarios

    const supabase = this.supabaseService.getClient();

    // Validar duplicado
    const { data: existingUser } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) throw new BadRequestException('El correo ya está registrado');

    // Crear contraseña temporal
    const tempPassword = randomBytes(5).toString('hex');
    const pass_hash = await bcrypt.hash(tempPassword, 10);

    // Insertar usuario
    const { data, error } = await supabase
      .from('usuario')
      .insert([
        {
          nombre,
          email,
          rol,
          pass_hash,
          activo: false, // debe cambiarla al entrar
        },
      ])
      .select('id, nombre, email, rol, activo')
      .single();

    if (error) throw new BadRequestException(error.message);

    // Enviar el correo
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Beta LCA" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Invitación a Beta LCA',
      html: `
        <h2>Bienvenido ${nombre}</h2>
        <p>Tu contraseña temporal es:</p>
        <p style="font-family: monospace; background: #eee; padding: 5px 10px;">${tempPassword}</p>
        <a href="${process.env.FRONT_URL}/login">Iniciar sesión</a>
      `,
    });

    return {
      message: 'Usuario creado correctamente y correo enviado',
      user: data,
    };
  }

  // =====================================================================
  // 🗑 ELIMINAR USUARIO
  // =====================================================================
  async deleteUser(id: number) {
    const supabase = this.supabaseService.getClient();

    // Verificar existencia
    const { data: user } = await supabase
      .from('usuario')
      .select('id')
      .eq('id', id)
      .eq('rol', 'usuario') // ⬅️ IMPORTANTE: solo se pueden eliminar usuarios
      .maybeSingle();

    if (!user) throw new NotFoundException('Usuario no encontrado o no autorizado');

    const { error } = await supabase
      .from('usuario')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);

    return { message: 'Usuario eliminado correctamente' };
  }
}
