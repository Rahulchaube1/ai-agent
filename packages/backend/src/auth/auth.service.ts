import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../common/prisma/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * Shape of the user row from the database.
 */
interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Shape of the sanitized user returned in API responses.
 */
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: Date;
}

/**
 * Shape of the authentication response containing tokens and user info.
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

/**
 * Service handling all authentication logic including registration,
 * login, token generation, token refresh, and logout.
 */
@Injectable()
export class AuthService {
  private readonly logger: Logger = new Logger(AuthService.name);
  private readonly saltRounds: number = 12;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.accessTokenExpiry =
      this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    this.refreshTokenExpiry =
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'flowforge-jwt-secret-change-me';
    this.refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') || 'flowforge-refresh-secret-change-me';
  }

  /**
   * Register a new user account.
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUsers = await this.prisma.$queryRaw<UserRow[]>`
      SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
    `;

    if (existingUsers.length > 0) {
      throw new ConflictException('A user with this email already exists');
    }

    // Hash the password
    const passwordHash: string = await bcrypt.hash(password, this.saltRounds);
    const userId: string = uuidv4();
    const now: Date = new Date();

    // Create the user
    await this.prisma.$executeRaw`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
      VALUES (${userId}, ${email.toLowerCase()}, ${passwordHash}, ${firstName}, ${lastName}, 'member', true, ${now}, ${now})
    `;

    const user: UserResponse = {
      id: userId,
      email: email.toLowerCase(),
      firstName,
      lastName,
      role: 'member',
      createdAt: now,
    };

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User registered: ${email}`);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Authenticate a user with email and password.
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user by email
    const users = await this.prisma.$queryRaw<UserRow[]>`
      SELECT id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at
      FROM users
      WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `;

    if (users.length === 0) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const foundUser: UserRow = users[0];

    if (!foundUser.is_active) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Verify password
    const isPasswordValid: boolean = await bcrypt.compare(
      password,
      foundUser.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user: UserResponse = {
      id: foundUser.id,
      email: foundUser.email,
      firstName: foundUser.first_name,
      lastName: foundUser.last_name,
      role: foundUser.role,
      createdAt: foundUser.created_at,
    };

    // Generate tokens
    const tokens = await this.generateTokens(user);

    this.logger.log(`User logged in: ${email}`);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Refresh the access token using a valid refresh token.
   */
  async refresh(refreshToken: string): Promise<AuthResponse> {
    // Check if the refresh token has been blacklisted
    const isBlacklisted: boolean = await this.isTokenBlacklisted(refreshToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Fetch user from database
    const users = await this.prisma.$queryRaw<UserRow[]>`
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users
      WHERE id = ${payload.sub}
      LIMIT 1
    `;

    if (users.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    const foundUser: UserRow = users[0];

    if (!foundUser.is_active) {
      throw new UnauthorizedException('User account is deactivated');
    }

    // Blacklist the old refresh token
    await this.blacklistToken(refreshToken);

    const user: UserResponse = {
      id: foundUser.id,
      email: foundUser.email,
      firstName: foundUser.first_name,
      lastName: foundUser.last_name,
      role: foundUser.role,
      createdAt: foundUser.created_at,
    };

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user,
    };
  }

  /**
   * Logout a user by blacklisting their refresh token.
   */
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.blacklistToken(refreshToken);

    return { message: 'Logged out successfully' };
  }

  /**
   * Generate both access and refresh JWT tokens for a user.
   */
  private async generateTokens(
    user: UserResponse,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.jwtSecret,
        expiresIn: this.accessTokenExpiry,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTokenExpiry,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Blacklist a token by storing it in Redis with a TTL.
   */
  private async blacklistToken(token: string): Promise<void> {
    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    await this.redisService.setWithExpiry(
      `blacklisted_token:${token}`,
      '1',
      sevenDaysInSeconds,
    );
  }

  /**
   * Check if a token has been blacklisted.
   */
  private async isTokenBlacklisted(token: string): Promise<boolean> {
    return this.redisService.exists(`blacklisted_token:${token}`);
  }
}
