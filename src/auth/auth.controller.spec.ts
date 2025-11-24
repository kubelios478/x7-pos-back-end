import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { User } from '../users/entities/user.entity';

/* eslint-disable @typescript-eslint/unbound-method */
describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    sendResetLink: jest.fn(),
    resetPassword: jest.fn(),
    refreshToken: jest.fn(),
  };

  const mockJwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const validLoginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const mockLoginResult = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'merchant_admin',
          scope: 'merchant',
          merchant: { id: 1, name: 'Test Merchant' },
        },
      };

      mockAuthService.login.mockResolvedValue(mockLoginResult);

      const result = await controller.login(validLoginDto);

      expect(authService.login).toHaveBeenCalledWith(validLoginDto);
      expect(result).toEqual(mockLoginResult);
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(validLoginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(authService.login).toHaveBeenCalledWith(validLoginDto);
    });

    it('should validate email format', async () => {
      const invalidLoginDto = {
        email: 'invalid-email',
        password: 'password123',
      } as LoginDto;

      mockAuthService.login.mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        user: { id: 1, email: 'invalid-email' },
      });

      await controller.login(invalidLoginDto);

      expect(authService.login).toHaveBeenCalledWith(invalidLoginDto);
    });

    it('should validate required fields', async () => {
      const incompleteLoginDto = {
        email: 'test@example.com',
      } as LoginDto;

      mockAuthService.login.mockResolvedValue({
        access_token: 'token',
        refresh_token: 'refresh',
        user: { id: 1, email: 'test@example.com' },
      });

      await controller.login(incompleteLoginDto);

      expect(authService.login).toHaveBeenCalledWith(incompleteLoginDto);
    });
  });

  describe('getProfile', () => {
    it('should return user profile', () => {
      const mockUser = {
        id: 1,
        username: 'test_user',
        password: 'hashedPassword',
        email: 'test@example.com',
        role: 'merchant_admin',
        scope: 'merchant',
        resetToken: null,
        refreshToken: 'refresh-token-123',
        merchantId: 1,
        merchant: { id: 1, name: 'Test Merchant' },
        collaborators: [],
      } as unknown as User;

      const result = controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });

    it('should handle user without merchant', () => {
      const mockUser = {
        id: 1,
        username: 'admin_user',
        password: 'hashedPassword',
        email: 'test@example.com',
        role: 'admin',
        scope: 'global',
        resetToken: null,
        refreshToken: null,
        merchantId: 1,
        merchant: undefined,
        collaborators: [],
      } as unknown as User;

      const result = controller.getProfile(mockUser);

      expect(result).toEqual(mockUser);
    });
  });

  describe('requestReset', () => {
    const validRequestResetDto: RequestResetPasswordDto = {
      email: 'test@example.com',
    };

    it('should send reset link successfully', async () => {
      const mockResponse = {
        message: 'Reset link sent successfully',
      };

      mockAuthService.sendResetLink.mockResolvedValue(mockResponse);

      const result = await controller.requestReset(validRequestResetDto);

      expect(authService.sendResetLink).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('User not found');
      mockAuthService.sendResetLink.mockRejectedValue(error);

      await expect(
        controller.requestReset(validRequestResetDto),
      ).rejects.toThrow('User not found');
      expect(authService.sendResetLink).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('should validate email format', async () => {
      const invalidRequestResetDto = {
        email: 'invalid-email',
      } as RequestResetPasswordDto;

      mockAuthService.sendResetLink.mockResolvedValue({
        message: 'Reset link sent',
      });

      await controller.requestReset(invalidRequestResetDto);

      expect(authService.sendResetLink).toHaveBeenCalledWith('invalid-email');
    });
  });

  describe('resetPassword', () => {
    const validResetPasswordDto: ResetPasswordDto = {
      token: 'reset-token-123',
      newPassword: 'newPassword456',
    };

    it('should reset password successfully', async () => {
      const mockResponse = {
        message: 'Password reset successfully',
      };

      mockAuthService.resetPassword.mockResolvedValue(mockResponse);

      const result = await controller.resetPassword(validResetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'reset-token-123',
        'newPassword456',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle invalid token', async () => {
      const error = new Error('Invalid or expired token');
      mockAuthService.resetPassword.mockRejectedValue(error);

      await expect(
        controller.resetPassword(validResetPasswordDto),
      ).rejects.toThrow('Invalid or expired token');
      expect(authService.resetPassword).toHaveBeenCalledWith(
        'reset-token-123',
        'newPassword456',
      );
    });

    it('should validate required fields', async () => {
      const incompleteResetPasswordDto = {
        token: 'reset-token-123',
      } as ResetPasswordDto;

      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset',
      });

      await controller.resetPassword(incompleteResetPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'reset-token-123',
        undefined,
      );
    });

    it('should handle password validation errors', async () => {
      const weakPasswordDto = {
        token: 'reset-token-123',
        newPassword: '123',
      } as ResetPasswordDto;

      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset',
      });

      await controller.resetPassword(weakPasswordDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'reset-token-123',
        '123',
      );
    });
  });

  describe('refreshToken', () => {
    const validRefreshTokenDto: RefreshTokenDto = {
      refreshToken: 'refresh-token-123',
    };

    it('should refresh token successfully', async () => {
      const mockRefreshResult = {
        access_token: 'new-access-token-123',
        refresh_token: 'new-refresh-token-123',
        user: {
          id: 1,
          email: 'test@example.com',
          role: 'merchant_admin',
          scope: 'merchant',
        },
      };

      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResult);

      const result = await controller.refreshToken(validRefreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(
        'refresh-token-123',
      );
      expect(result).toEqual(mockRefreshResult);
    });

    it('should handle invalid refresh token', async () => {
      const error = new Error('Invalid refresh token');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(
        controller.refreshToken(validRefreshTokenDto),
      ).rejects.toThrow('Invalid refresh token');
      expect(authService.refreshToken).toHaveBeenCalledWith(
        'refresh-token-123',
      );
    });

    it('should handle expired refresh token', async () => {
      const error = new Error('Refresh token expired');
      mockAuthService.refreshToken.mockRejectedValue(error);

      await expect(
        controller.refreshToken(validRefreshTokenDto),
      ).rejects.toThrow('Refresh token expired');
      expect(authService.refreshToken).toHaveBeenCalledWith(
        'refresh-token-123',
      );
    });

    it('should validate required refresh token', async () => {
      const invalidRefreshTokenDto = {
        refreshToken: '',
      } as RefreshTokenDto;

      mockAuthService.refreshToken.mockResolvedValue({
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        user: { id: 1, email: 'test@example.com' },
      });

      await controller.refreshToken(invalidRefreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith('');
    });

    it('should handle null refresh token body', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await expect(controller.refreshToken(null as any)).rejects.toThrow(
        'No refresh token provided',
      );
    });
  });

  describe('error handling', () => {
    it('should handle service unavailable', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const error = new Error('Service unavailable');
      mockAuthService.login.mockRejectedValue(error);

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Service unavailable',
      );
    });

    it('should handle network errors', async () => {
      const requestResetDto = { email: 'test@example.com' };
      const error = new Error('Network error');
      mockAuthService.sendResetLink.mockRejectedValue(error);

      await expect(controller.requestReset(requestResetDto)).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle database errors', async () => {
      const resetPasswordDto = {
        token: 'token-123',
        newPassword: 'newPass123',
      };
      const error = new Error('Database connection failed');
      mockAuthService.resetPassword.mockRejectedValue(error);

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('authentication flow', () => {
    it('should complete full authentication cycle', async () => {
      // Login
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const loginResult = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: { id: 1, email: 'test@example.com' },
      };
      mockAuthService.login.mockResolvedValue(loginResult);

      const loginResponse = await controller.login(loginDto);
      expect(loginResponse).toEqual(loginResult);

      // Get Profile (simulated)
      const mockUser = loginResult.user as User;
      const profileResponse = controller.getProfile(mockUser);
      expect(profileResponse).toEqual(loginResult.user);

      // Refresh Token
      const refreshDto = { refreshToken: 'refresh-token' };
      const refreshResult = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: loginResult.user,
      };
      mockAuthService.refreshToken.mockResolvedValue(refreshResult);

      const refreshResponse = await controller.refreshToken(refreshDto);
      expect(refreshResponse).toEqual(refreshResult);
    });

    it('should complete password reset flow', async () => {
      // Request reset
      const requestResetDto = { email: 'test@example.com' };
      const forgotResult = { message: 'Reset link sent' };
      mockAuthService.sendResetLink.mockResolvedValue(forgotResult);

      const forgotResponse = await controller.requestReset(requestResetDto);
      expect(forgotResponse).toEqual(forgotResult);

      // Reset password
      const resetPasswordDto = {
        token: 'reset-token',
        newPassword: 'newPassword123',
      };
      const resetResult = { message: 'Password reset successfully' };
      mockAuthService.resetPassword.mockResolvedValue(resetResult);

      const resetResponse = await controller.resetPassword(resetPasswordDto);
      expect(resetResponse).toEqual(resetResult);
    });
  });
});
