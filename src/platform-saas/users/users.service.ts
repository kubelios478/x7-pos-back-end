// src/platform-saas/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import {
  OneUserResponseDto,
  AllUsersResponseDto,
} from './dtos/user-response.dto';
import { UserHrSummaryResponseDto } from './dtos/user-hr-summary.dto';
import { UserRole } from './constants/role.enum';
// import * as bcrypt from 'bcrypt';
import * as bcrypt from 'bcryptjs';
// import { console } from 'inspector';
import { ErrorHandler } from '../../common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { MailService } from '../../mail/mail.service';

function toSafeUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    scope: user.scope,
    isActive: user.isActive,
    merchantId: user.merchantId,
    merchant: user.merchant,
  };
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,

    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateUserDto,
    currentUser?: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    // Merchant admins can only provision users inside their own merchant (AC 3).
    // We ignore any client-provided merchantId and anchor to the admin's merchant.
    const isMerchantAdmin = currentUser?.role === UserRole.MERCHANT_ADMIN;
    const resolvedMerchantId = isMerchantAdmin
      ? currentUser?.merchant?.id
      : dto.merchantId;

    // Validate input ID parameters
    if (dto.companyId && dto.companyId <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }
    if (resolvedMerchantId && resolvedMerchantId <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive number');
    }
    if (!resolvedMerchantId) {
      ErrorHandler.invalidId('Merchant ID is required to create a user');
    }

    const company = dto.companyId
      ? await this.companyRepo.findOne({ where: { id: dto.companyId } })
      : undefined;

    if (dto.companyId && !company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id: resolvedMerchantId },
    });

    if (!merchant) {
      ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    }

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      password: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      scope: dto.scope,
      isActive: true,
      merchant: merchant,
      merchantId: resolvedMerchantId,
    } as Partial<User>);

    try {
      const savedUser = await this.userRepo.save(user);

      return {
        statusCode: 201,
        message: 'User created successfully',
        data: toSafeUser(savedUser),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(): Promise<AllUsersResponseDto> {
    const users = await this.userRepo.find({
      relations: ['merchant'],
    });

    return {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: users.map(toSafeUser),
    };
  }

  async findById(id: number) {
    const user = await this.userRepo.findOneBy({ id });
    return user;
  }

  async findOne(id: number): Promise<OneUserResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    return {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: toSafeUser(user),
    };
  }

  async findByMerchant(
    merchantId: number,
    user: AuthenticatedUser,
  ): Promise<AllUsersResponseDto> {
    // Validate merchant ID
    if (!merchantId || merchantId <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive number');
    }

    // Check permissions
    if (!user.merchant || user.merchant.id !== merchantId) {
      ErrorHandler.differentMerchant();
    }

    const users = await this.userRepo.find({
      where: { merchant: { id: merchantId } },
      relations: ['merchant'],
    });

    return {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: users.map(toSafeUser),
    };
  }

  async findByEmail(email: string): Promise<OneUserResponseDto> {
    // Validate email format
    if (!email || !email.includes('@')) {
      ErrorHandler.invalidFormat('Please provide a valid email address');
    }

    const foundUser = await this.userRepo.findOne({
      where: { email },
      relations: ['merchant'],
    });

    if (!foundUser) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    return {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: toSafeUser(foundUser),
    };
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { resetToken: token } });
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { refreshToken: token } });
  }

  async saveResetToken(userId: number, token: string): Promise<void> {
    await this.userRepo.update(userId, { resetToken: token });
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<void> {
    await this.userRepo.update(userId, {
      password: hashedPassword,
      resetToken: null,
    });
  }

  async saveRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.userRepo.update(userId, { refreshToken });
  }

  async updateRefreshToken(userId: number, token: string) {
    await this.userRepo.update(userId, { refreshToken: token });
  }

  async update(
    id: number,
    dto: UpdateUserDto,
    currentUser: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    // Validate ID parameter
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, currentUser);

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      Object.assign(user, dto);
      const updatedUser = await this.userRepo.save(user);

      return {
        statusCode: 200,
        message: 'User updated successfully',
        data: toSafeUser(updatedUser),
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  /**
   * Soft-activate / deactivate a user without deleting the record (AC: deactivate access).
   */
  async setActiveStatus(
    id: number,
    isActive: boolean,
    currentUser: AuthenticatedUser,
  ): Promise<OneUserResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, currentUser);

    user.isActive = isActive;
    const updatedUser = await this.userRepo.save(user);

    return {
      statusCode: 200,
      message: isActive
        ? 'User reactivated successfully'
        : 'User deactivated successfully',
      data: toSafeUser(updatedUser),
    };
  }

  /**
   * Admin-triggered password reset. Generates a reset token and emails the target
   * user a recovery link — the admin never sees or sets the password (AC: Password Isolation).
   */
  async triggerPasswordReset(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<{ statusCode: number; message: string }> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, currentUser);

    const resetToken = uuidv4();
    await this.saveResetToken(user.id, resetToken);

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    void this.mailService.sendMail({
      to: user.email,
      subject: 'Reset Password',
      text: `A password reset was requested for your account. Click the following link to set a new password: ${resetUrl}`,
      html: `<p>A password reset was requested for your account. Click <a href="${resetUrl}">here</a> to set a new password.</p>`,
    });

    return {
      statusCode: 200,
      message: 'Password reset link sent to the user email.',
    };
  }

  /**
   * Returns the user together with linked HR collaborator records so the admin can
   * cross-reference system accounts with human-resource files (AC: HR dashboard).
   */
  async getHrSummary(
    id: number,
    currentUser: AuthenticatedUser,
  ): Promise<UserHrSummaryResponseDto> {
    if (!id || id <= 0) {
      ErrorHandler.invalidId('User ID must be a positive number');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant', 'collaborators'],
    });

    if (!user) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    this.assertCanManageUser(user, currentUser);

    const collaborators = (user.collaborators ?? []).map((collaborator) => ({
      id: collaborator.id,
      name: collaborator.name,
      employeeId: collaborator.employeeId ?? null,
      department: collaborator.department ?? null,
      role: collaborator.role,
      status: collaborator.status,
      merchantId: collaborator.merchant_id,
    }));

    return {
      statusCode: 200,
      message: 'User HR summary retrieved successfully',
      data: {
        user: toSafeUser(user),
        collaborators,
      },
    };
  }

  private assertCanManageUser(
    user: User,
    currentUser: AuthenticatedUser,
  ): void {
    if (currentUser.role === UserRole.PORTAL_ADMIN) {
      return;
    }

    const isSelf = user.id === currentUser.id;
    const sameMerchant =
      user.merchant?.id &&
      currentUser.merchant?.id &&
      user.merchant.id === currentUser.merchant.id;

    if (!isSelf && !sameMerchant) {
      ErrorHandler.insufficientPermissions(
        'You can only manage your own profile or users from your merchant',
      );
    }
  }
}
