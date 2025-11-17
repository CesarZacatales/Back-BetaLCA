import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.validateUser(body.email, body.password);
  }

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.registerUser(body);
  }

  @Post('changePassword')
  async changePassword(@Body() body: any) {
    return this.authService.changePassword(body);
  }

  @Post('forgotPassword')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.sendResetLink(body.email);
  }

  @Post('resetPassword')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body);
  }
}
