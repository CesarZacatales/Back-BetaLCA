import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      // info contiene detalles del error del token
      const message =
        info?.message ||
        'Token inválido o no proporcionado. Inicia sesión nuevamente.';

      throw new UnauthorizedException(message);
    }

    return user;
  }
}
