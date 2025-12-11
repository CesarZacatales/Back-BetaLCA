import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './userDto/create-user.dto';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =====================================================================
  // 🔐 OBTENER TODOS LOS USUARIOS — SOLO ADMIN
  // =====================================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('getAllUsers')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  // =====================================================================
  // 🔐 REGISTRAR USUARIO — SOLO ADMIN
  // (tu frontend de admin hace esto)
  // =====================================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('registerUser')
  async register(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  // =====================================================================
  // 🔐 ELIMINAR USUARIO — SOLO ADMIN
  // =====================================================================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('deleteUser/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }
}
