import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ======================================================
  // LOGIN
  // ======================================================
  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;

    const result = await this.authService.validateUser(email, password);

    return {
      message: result.message,
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      mustChangePassword: result.mustChangePassword || false,
    };
  }

  // ======================================================
  // REGISTRO
  // ======================================================
  @Post('register')
  async register(@Body() data: any) {
    return this.authService.registerUser(data);
  }

  // ======================================================
  // CAMBIO DE CONTRASEÑA
  // ======================================================
  @Post('changePassword')
  async changePassword(@Body() body: any) {
    return this.authService.changePassword(body);
  }

  // ======================================================
  // RECUPERAR → SEND RESET LINK
  // ======================================================
  @Post('forgotPassword')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.sendResetLink(body.email);
  }

  // ======================================================
  // RESET PASSWORD
  // ======================================================
  @Post('resetPassword')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body);
  }

  // ======================================================
  // 🔐 RUTA QUE PRUEBA EL TOKEN
  // ======================================================
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return {
      message: 'Token válido',
      user: req.user,
    };
  }

  // ======================================================
  // 🔁 REFRESH TOKEN
  // ======================================================
  @Post('refresh')
  async refresh(@Body() body: { userId: number; refreshToken: string }) {
    if (!body.userId || !body.refreshToken)
      throw new ForbiddenException('Datos incompletos');

    return this.authService.refreshTokens(body.userId, body.refreshToken);
  }

  // ======================================================
  // 🚪 LOGOUT (NECESARIO INVALIDAR REFRESH TOKEN)
  // ======================================================
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req) {
    const userId = req.user?.sub;

    if (!userId) throw new ForbiddenException('No autenticado');

    return this.authService.logout(userId);
  }
}
