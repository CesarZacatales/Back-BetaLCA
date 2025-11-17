import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
//import { DatabaseService } from './database/database.service';
import { AuthModule } from './auth/auth.module';
import { UsersService } from './users/users.service';
import { UsersModule } from './users/users.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    SupabaseModule,
  ],
  //providers: [DatabaseService, UsersService],
  providers: [UsersService],
})
export class AppModule {}
