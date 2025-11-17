import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
//import { DatabaseService } from '../database/database.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'clave-secreta-super-segura',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [AuthController],
  //providers: [AuthService, DatabaseService],
  providers: [AuthService],
})
export class AuthModule {}
