import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * The payload embedded in the JWT token.
 */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * The user object attached to the request after JWT validation.
 */
export interface ValidatedUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

/**
 * Passport strategy for validating JWT access tokens.
 * Extracts the token from the Authorization Bearer header,
 * validates the payload, and looks up the user in the database.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'flowforge-jwt-secret-change-me',
    });
  }

  /**
   * Validates the JWT payload and returns the user object
   * that will be attached to the request.
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.$queryRaw<
      Array<{
        id: string;
        email: string;
        role: string;
        first_name: string;
        last_name: string;
        is_active: boolean;
      }>
    >`
      SELECT id, email, role, first_name, last_name, is_active
      FROM users
      WHERE id = ${payload.sub}
      LIMIT 1
    `;

    if (!user || user.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const foundUser = user[0];

    if (!foundUser.is_active) {
      throw new UnauthorizedException('User account is deactivated');
    }

    return {
      id: foundUser.id,
      email: foundUser.email,
      role: foundUser.role,
      firstName: foundUser.first_name,
      lastName: foundUser.last_name,
    };
  }
}
