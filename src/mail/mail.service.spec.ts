import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';

// Mock nodemailer
const mockSendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

describe('MailService', () => {
  let service: MailService;

  // Mock environment variables
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();

    // Set up environment variables
    process.env = {
      ...originalEnv,
      SMTP_HOST: 'smtp.test.com',
      SMTP_PORT: '587',
      SMTP_USER: 'test@example.com',
      SMTP_PASS: 'testpassword',
      SMTP_FROM: '"Test App" <no-reply@test.com>',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService],
    }).compile();

    service = module.get<MailService>(MailService);

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should be created with transporter', () => {
      // Service should be created successfully with transporter
      expect(service).toBeDefined();
      expect(service['transporter']).toBeDefined();
    });

    it('should handle different environment configurations', () => {
      // Test that service can be created with different env configs
      const testService = new MailService();
      expect(testService).toBeDefined();
    });
  });

  describe('sendMail', () => {
    const validMailOptions = {
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test message body',
      html: '<p>Test HTML message</p>',
    };

    it('should send email with text content', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      };

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendMail(options);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This is a test email',
      });
    });

    it('should send email with HTML content', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'HTML Test Email',
        html: '<h1>Test Email</h1><p>This is a test email</p>',
      };

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendMail(options);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        to: 'test@example.com',
        subject: 'HTML Test Email',
        html: '<h1>Test Email</h1><p>This is a test email</p>',
      });
    });

    it('should send email with both text and HTML content', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendMail(validMailOptions);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test message body',
        html: '<p>Test HTML message</p>',
      });
    });

    it('should use default FROM address when SMTP_FROM is not set', async () => {
      delete process.env.SMTP_FROM;

      const newService = new MailService();
      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await newService.sendMail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message',
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Paperroll" <no-reply@paperroll.com>',
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test message',
      });
    });

    it('should handle multiple recipients', async () => {
      const options = {
        to: 'user1@example.com, user2@example.com',
        subject: 'Multiple Recipients',
        text: 'This email goes to multiple recipients',
      };

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendMail(options);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        to: 'user1@example.com, user2@example.com',
        subject: 'Multiple Recipients',
        text: 'This email goes to multiple recipients',
      });
    });

    it('should handle email with only subject and recipient', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Subject Only Email',
      };

      mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await service.sendMail(options);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        to: 'test@example.com',
        subject: 'Subject Only Email',
      });
    });

    it('should handle SMTP connection errors', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This should fail',
      };

      const smtpError = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(smtpError);

      await expect(service.sendMail(options)).rejects.toThrow(
        'SMTP connection failed',
      );
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication errors', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This should fail with auth error',
      };

      const authError = new Error(
        'Invalid login: 535 5.7.8 Username and Password not accepted',
      );
      mockSendMail.mockRejectedValue(authError);

      await expect(service.sendMail(options)).rejects.toThrow(
        'Invalid login: 535 5.7.8 Username and Password not accepted',
      );
    });

    it('should handle invalid recipient errors', async () => {
      const options = {
        to: 'invalid-email',
        subject: 'Test Email',
        text: 'This should fail with invalid recipient',
      };

      const recipientError = new Error('Invalid recipient email address');
      mockSendMail.mockRejectedValue(recipientError);

      await expect(service.sendMail(options)).rejects.toThrow(
        'Invalid recipient email address',
      );
    });

    it('should handle quota exceeded errors', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This should fail with quota exceeded',
      };

      const quotaError = new Error('Daily quota exceeded');
      mockSendMail.mockRejectedValue(quotaError);

      await expect(service.sendMail(options)).rejects.toThrow(
        'Daily quota exceeded',
      );
    });

    it('should handle network timeout errors', async () => {
      const options = {
        to: 'test@example.com',
        subject: 'Test Email',
        text: 'This should timeout',
      };

      const timeoutError = new Error('Network timeout');
      mockSendMail.mockRejectedValue(timeoutError);

      await expect(service.sendMail(options)).rejects.toThrow(
        'Network timeout',
      );
    });
  });

  describe('email formatting', () => {
    it('should preserve email formatting for password reset', async () => {
      const resetOptions = {
        to: 'user@example.com',
        subject: 'Password Reset Request',
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Password Reset</h2>
            <p>Click the link below to reset your password:</p>
            <a href="https://example.com/reset?token=abc123">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
          </div>
        `,
      };

      mockSendMail.mockResolvedValue({ messageId: 'reset-message-id' });

      await service.sendMail(resetOptions);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        ...resetOptions,
      });
    });

    it('should handle special characters in subject and content', async () => {
      const specialCharsOptions = {
        to: 'test@example.com',
        subject: '🔐 Password Reset - Special Characters: àáâãäåæçèé',
        text: 'Special characters: ñáéíóú ¿¡ €$£¥',
        html: '<p>Special characters: ñáéíóú ¿¡ €$£¥</p>',
      };

      mockSendMail.mockResolvedValue({ messageId: 'special-chars-id' });

      await service.sendMail(specialCharsOptions);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        ...specialCharsOptions,
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle authentication module password reset flow', async () => {
      const resetEmail = {
        to: 'user@merchant.com',
        subject: 'Password Reset Request',
        html: expect.stringContaining('reset your password') as string,
      };

      mockSendMail.mockResolvedValue({
        messageId: 'auth-reset-id',
        response: '250 2.0.0 OK',
      });

      await service.sendMail(resetEmail);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Test App" <no-reply@test.com>',
          to: 'user@merchant.com',
          subject: 'Password Reset Request',
        }),
      );
    });

    it('should handle welcome email for new users', async () => {
      const welcomeEmail = {
        to: 'newuser@company.com',
        subject: 'Welcome to X7-POS System',
        html: `
          <h1>Welcome!</h1>
          <p>Your account has been created successfully.</p>
          <p>Please log in with your credentials.</p>
        `,
      };

      mockSendMail.mockResolvedValue({ messageId: 'welcome-email-id' });

      await service.sendMail(welcomeEmail);

      expect(mockSendMail).toHaveBeenCalledWith({
        from: '"Test App" <no-reply@test.com>',
        ...welcomeEmail,
      });
    });
  });
});
