import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], 
})
export class UsersModule {}
