import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    // 👌 Carga variables .env de manera global
    ConfigModule.forRoot({ isGlobal: true }),

    // 🔐 Autenticación con JWT + Refresh
    AuthModule,

    // 👥 Usuarios (CRUD)
    UsersModule,

    // 🛢️ Cliente Supabase centralizado
    SupabaseModule,
  ],
})
export class AppModule {}
