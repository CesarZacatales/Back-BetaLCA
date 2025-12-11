import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obtener roles requeridos con el decorator @Roles(...)
    const requiredRoles =
      this.reflector.get<string[]>('roles', context.getHandler()) ||
      this.reflector.get<string[]>('roles', context.getClass());

    // Si la ruta no tiene roles requeridos, permitir acceso
    if (!requiredRoles) return true;

    // Obtener usuario del request (inyectado por JwtStrategy.validate)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No hay usuario autenticado');
    }

    // Validar rol
    if (!requiredRoles.includes(user.rol)) {
      throw new ForbiddenException(
        `Acceso denegado: requiere rol (${requiredRoles.join(', ')})`,
      );
    }

    return true;
  }
}
