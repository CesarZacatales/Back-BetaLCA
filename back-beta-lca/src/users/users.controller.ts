import { Body, Controller, Delete, Get, Param, Post, ParseIntPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './userDto/create-user.dto';

@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('getAllUsers')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @Post('registerUser')
  async register(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body);
  }

  @Delete('deleteUser/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteUser(id);
  }
}
