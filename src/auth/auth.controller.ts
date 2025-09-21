// auth/controllers/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from './decorators/current-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Login with credentials to get access and refresh tokens',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve the authenticated user profile' })
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link' })
  requestReset(@Body() dto: RequestResetPasswordDto) {
    console.log('Request Reset DTO:', dto);
    return this.authService.sendResetLink(dto.email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using recovery token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    console.log('Reset Password DTO:', dto);
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // @ApiBody({ schema: { example: { refreshToken: '...' } } })
  @Post('refresh-token')
  @ApiOperation({
    summary: 'Refresh access token using a valid refresh token',
  })
  async refreshToken(@Body() body: RefreshTokenDto) {
    if (!body) {
      throw new BadRequestException('No refresh token provided');
    }
    return this.authService.refreshToken(body.refreshToken);
  }
}
