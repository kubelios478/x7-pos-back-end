// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import * as bcrypt from 'bcrypt';
import { console } from 'inspector';
import { ErrorHandler } from '../common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,

    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
  ) {}

  async create(dto: CreateUserDto): Promise<OneUserResponseDto> {
    // Validate input ID parameters
    if (dto.companyId && dto.companyId <= 0) {
      ErrorHandler.invalidId('Company ID must be a positive number');
    }
    if (dto.merchantId && dto.merchantId <= 0) {
      ErrorHandler.invalidId('Merchant ID must be a positive number');
    }

    const company = dto.companyId
      ? await this.companyRepo.findOne({ where: { id: dto.companyId } })
      : undefined;
    console.log('Company:', company);

    if (dto.companyId && !company) {
      ErrorHandler.notFound(ErrorMessage.COMPANY_NOT_FOUND);
    }

    const merchant = dto.merchantId
      ? await this.merchantRepo.findOne({ where: { id: dto.merchantId } })
      : undefined;

    if (dto.merchantId && !merchant) {
      ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    }
    console.log('Merchant:', merchant);

    const user = this.userRepo.create({
      username: dto.username,
      email: dto.email,
      password: await bcrypt.hash(dto.password, 10),
      role: dto.role,
      scope: dto.scope,
      company: company,
      merchant: merchant,
    } as Partial<User>);

    try {
      const savedUser = await this.userRepo.save(user);

      const safeUserData = {
        id: savedUser.id,
        username: savedUser.username,
        email: savedUser.email,
        role: savedUser.role,
        scope: savedUser.scope,
        merchantId: savedUser.merchantId,
        merchant: savedUser.merchant,
      };

      return {
        statusCode: 201,
        message: 'User created successfully',
        data: safeUserData,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(): Promise<AllUsersResponseDto> {
    const users = await this.userRepo.find({
      relations: ['merchant'],
    });
    const mappedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchantId: user.merchantId,
      merchant: user.merchant,
    }));

    return {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: mappedUsers,
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

    const safeUserData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchantId: user.merchantId,
      merchant: user.merchant,
    };

    return {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: safeUserData,
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

    const mappedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchantId: user.merchantId,
      merchant: user.merchant,
    }));

    return {
      statusCode: 200,
      message: 'Users retrieved successfully',
      data: mappedUsers,
    };
  }

  async findByEmail(email: string): Promise<OneUserResponseDto> {
    // Validate email format
    if (!email || !email.includes('@')) {
      ErrorHandler.invalidFormat('Please provide a valid email address');
    }

    console.log('Searching for user by email:', email);
    const foundUser = await this.userRepo.findOne({
      where: { email },
      relations: ['merchant'],
    });

    if (!foundUser) {
      ErrorHandler.notFound(ErrorMessage.USER_NOT_FOUND);
    }

    console.log('User found:', foundUser);

    const safeUserData = {
      id: foundUser.id,
      username: foundUser.username,
      email: foundUser.email,
      role: foundUser.role,
      scope: foundUser.scope,
      merchantId: foundUser.merchantId,
      merchant: foundUser.merchant,
    };

    return {
      statusCode: 200,
      message: 'User retrieved successfully',
      data: safeUserData,
    };
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { resetToken: token } });
  }

  async findByRefreshToken(token: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { refreshToken: token } });
  }

  async saveResetToken(userId: number, token: string): Promise<void> {
    console.log('In a saveResetToken');
    console.log('Saving reset token for user:', userId, 'Token:', token);
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

    const isSelf = user.id === currentUser.id;
    const sameMerchant =
      user.merchant?.id &&
      currentUser.merchant?.id &&
      user.merchant.id === currentUser.merchant.id;

    if (!isSelf && !sameMerchant) {
      ErrorHandler.insufficientPermissions(
        'You can only update your own profile or users from your merchant',
      );
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    try {
      Object.assign(user, dto);
      const updatedUser = await this.userRepo.save(user);

      const safeUserData = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        scope: updatedUser.scope,
        merchantId: updatedUser.merchantId,
        merchant: updatedUser.merchant,
      };

      return {
        statusCode: 200,
        message: 'User updated successfully',
        data: safeUserData,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
