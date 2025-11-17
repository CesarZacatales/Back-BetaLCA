import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private readonly secret = process.env.JWT_SECRET || 'mysecretkey';

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      this.logger.warn(
        `No se proporcionó cabecera Authorization - [${request.method}] ${request.url}`
      );
      throw new UnauthorizedException({
        table: [{ numberResponse: 0, messageResponse: 'No se ha proporcionado un token.' }],
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      this.logger.warn(
        `No se encontró token en Authorization - [${request.method}] ${request.url}`
      );
      throw new UnauthorizedException({
        table: [{ numberResponse: 0, messageResponse: 'No se ha proporcionado un token.' }],
      });
    }

    try {
      const decoded = this.jwtService.decode(token);
      this.logger.debug(`Token decodificado: ${JSON.stringify(decoded)}`);

      // Usar explicitamente la misma clave que para generar el token
      const payload = this.jwtService.verify(token, { secret: this.secret });
      this.logger.debug(`Token verificado correctamente, payload: ${JSON.stringify(payload)}`);

      request['user'] = payload;
      return true;
    } catch (err) {
      this.logger.error(`Error verificando token: ${err.message || err}`);
      throw new UnauthorizedException({
        table: [{ numberResponse: 0, messageResponse: 'Token inválido o expirado.' }],
      });
    }
  }
}