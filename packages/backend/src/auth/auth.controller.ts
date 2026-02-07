import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthService, AuthResponse } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

/**
 * DTO for the refresh token request body.
 */
class RefreshTokenDto {
  refreshToken: string;
}

/**
 * Controller handling authentication endpoints:
 * - POST /auth/register
 * - POST /auth/login
 * - POST /auth/refresh
 * - POST /auth/logout
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user account.
   *
   * @param registerDto - Registration details (email, password, firstName, lastName)
   * @returns Access token, refresh token, and user info
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * Authenticate a user and return tokens.
   *
   * @param loginDto - Login credentials (email, password)
   * @returns Access token, refresh token, and user info
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  /**
   * Refresh an access token using a valid refresh token.
   *
   * @param body - Object containing the refresh token
   * @returns New access token, refresh token, and user info
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: RefreshTokenDto): Promise<AuthResponse> {
    return this.authService.refresh(body.refreshToken);
  }

  /**
   * Logout a user by invalidating their refresh token.
   *
   * @param body - Object containing the refresh token to invalidate
   * @param _user - The currently authenticated user (unused but validates auth)
   * @returns Success message
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() body: RefreshTokenDto,
    @CurrentUser() _user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.authService.logout(body.refreshToken);
  }
}
