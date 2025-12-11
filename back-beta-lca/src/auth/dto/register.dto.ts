import { IsString, IsEmail} from 'class-validator';
import { UUID } from 'typeorm/driver/mongodb/bson.typings.js';

export class RegisterDto {
  @IsString()
  nombre: string;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  rol: string;
}
