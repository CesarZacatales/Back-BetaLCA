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

  async getAllUsers() {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('usuario')
      .select('id, nombre, email, rol');

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async createUser(createUserDto: CreateUserDto) {
    const { nombre, email } = createUserDto;
    const rol = 'usuario'; // Forzar rol a 'usuario'

    const supabase = this.supabaseService.getClient();

    // Verificar si ya existe
    const { data: existingUser } = await supabase
      .from('usuario')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser) {
      throw new BadRequestException('El correo ya está registrado');
    }

    // Generar contraseña temporal
    const tempPassword = randomBytes(5).toString('hex');
    const pass_hash = await bcrypt.hash(tempPassword, 10);

    // Insertar nuevo usuario
    const { data, error } = await supabase
      .from('usuario')
      .insert([{ nombre, email, rol, pass_hash }])
      .select('id, nombre, email, rol')
      .single();

    if (error) throw new BadRequestException(error.message);

    // Enviar correo de invitación
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
        <!DOCTYPE html>
        <html lang="es">
          <body style="background-color:#f6f8fb;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:40px 0;color:#333;">
            <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
              <tr>
                <td style="padding:30px 40px;text-align:center;background:#0f172a;border-top-left-radius:12px;border-top-right-radius:12px;">
                  <h1 style="color:#fff;margin:0;font-size:22px;">Beta LCA</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:35px 40px;">
                  <h2 style="color:#111827;margin-bottom:12px;">Hola <b>${nombre}</b>,</h2>
                  <p style="margin-bottom:16px;line-height:1.5;">
                    Has sido invitado a la plataforma <b>Beta LCA</b>.
                    Ya puedes acceder con las credenciales que se te indican a continuación:
                  </p>
                  <table cellpadding="8" cellspacing="0" style="background:#f3f4f6;border-radius:8px;margin:20px 0;width:100%;font-size:15px;">
                    <tr>
                      <td style="width:35%;font-weight:600;">Correo electrónico:</td>
                      <td><a href="mailto:${email}" style="color:#2563eb;">${email}</a></td>
                    </tr>
                    <tr>
                      <td style="width:35%;font-weight:600;">Contraseña temporal:</td>
                      <td style="font-family:monospace;background:#e5e7eb;padding:4px 8px;border-radius:4px;display:inline-block;">${tempPassword}</td>
                    </tr>
                  </table>
                  <p style="margin-bottom:20px;line-height:1.5;">
                    Para ingresar, haz clic en el siguiente botón e inicia sesión con tus credenciales.
                  </p>
                  <p style="text-align:center;">
                    <a href="${process.env.FRONT_URL}/login" style="background:#2563eb;color:white;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;" target="_blank">
                      Iniciar sesión
                    </a>
                  </p>
                  <p style="margin-top:30px;font-size:13px;color:#6b7280;">
                    🔒 Por seguridad, recuerda cambiar tu contraseña al ingresar por primera vez.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="text-align:center;padding:20px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;">
                  &copy; 2025 Beta LCA. Todos los derechos reservados.
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    return {
      message: 'Usuario creado y correo de invitación enviado',
      user: data,
    };
  }

  async deleteUser(id: number) {
    const supabase = this.supabaseService.getClient();

    const { data: user, error: findError } = await supabase
      .from('usuario')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw new BadRequestException(findError.message);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const { error } = await supabase.from('usuario').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);

    return { message: 'Usuario eliminado correctamente' };
  }
}
