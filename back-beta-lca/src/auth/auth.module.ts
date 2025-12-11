import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { SupabaseModule } from '../supabase/supabase.module';

// Estrategias y guards
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    SupabaseModule,

    // 🔐 JWT Access Token (NO debe tener refresh aquí)
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,  // <-- Access Token secret
      signOptions: { expiresIn: '15m' }, // se usa SOLO para AccessToken
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy, // Necesaria para validar el AccessToken
    RolesGuard,  // Opcional para RBAC
  ],

  exports: [
    AuthService,
    JwtStrategy,
    JwtModule,
    RolesGuard,
  ],
})
export class AuthModule {}
