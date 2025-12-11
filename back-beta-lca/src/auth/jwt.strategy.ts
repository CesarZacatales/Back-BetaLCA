import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // Validación temprana del SECRET (solo AccessToken)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'FATAL ERROR: JWT_SECRET no está definido en el archivo .env'
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false, // NO saltar expiración

      secretOrKey: secret, // AccessToken secret
    });
  }

  async validate(payload: any) {
    // Este objeto se asignará automáticamente a req.user en los guards
    return {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
    };
  }
}
