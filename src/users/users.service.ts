// src/users/users.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import * as bcrypt from 'bcrypt';
import { console } from 'inspector';

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

  async create(dto: CreateUserDto) {
    const company = dto.companyId
      ? await this.companyRepo.findOne({ where: { id: dto.companyId } })
      : undefined;
    console.log('Company:', company);
    if (dto.companyId && !company) {
      throw new NotFoundException('Company not found');
    }

    const merchant = dto.merchantId
      ? await this.merchantRepo.findOne({ where: { id: dto.merchantId } })
      : undefined;

    if (dto.merchantId && !merchant) {
      throw new NotFoundException('Merchant not found');
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
      const response = await this.userRepo.save(user);
      return response;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error.code === '23505') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async findAll() {
    const users = await this.userRepo.find({
      relations: ['merchant'],
    });
    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: user.merchant
        ? { id: user.merchant.id, name: user.merchant.name }
        : null,
    }));
  }

  async findById(id: number) {
    const user = await this.userRepo.findOneBy({ id });
    return user;
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: user.merchant
        ? { id: user.merchant.id, name: user.merchant.name }
        : null,
    };
  }

  async findByMerchant(merchantId: number, user: AuthenticatedUser) {
    if (user.merchant.id !== merchantId) {
      throw new ForbiddenException(
        'You do not have permission to list this merchant users',
      );
    }
    const users = await this.userRepo.find({
      where: { merchant: { id: merchantId } },
      relations: ['merchant'],
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: user.merchant
        ? { id: user.merchant.id, name: user.merchant.name }
        : null,
    }));
  }

  async findByEmail(email: string) {
    console.log('Searching for user by email:', email);
    const foundUser = await this.userRepo.findOne({
      where: { email },
      relations: ['merchant'],
    });
    if (foundUser) {
      console.log('User found:', foundUser);
      return {
        id: foundUser.id,
        username: foundUser.username,
        email: foundUser.email,
        role: foundUser.role,
        scope: foundUser.scope,
        merchant: foundUser.merchant
          ? { id: foundUser.merchant.id, name: foundUser.merchant.name }
          : null,
      };
    } else {
      throw new ForbiddenException(
        'You do not have permission to list this merchant users',
      );
    }
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

  async update(id: number, dto: UpdateUserDto, currentUser: AuthenticatedUser) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['merchant'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isSelf = user.id === currentUser.id;
    const sameMerchant =
      user.merchant?.id &&
      currentUser.merchant?.id &&
      user.merchant.id === currentUser.merchant.id;

    if (!isSelf && !sameMerchant) {
      throw new ForbiddenException(
        'You do not have permission to update this user',
      );
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }

    Object.assign(user, dto);
    const updatedUser = await this.userRepo.save(user);
    return {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      scope: updatedUser.scope,
      merchant: updatedUser.merchant
        ? { id: updatedUser.merchant.id, name: updatedUser.merchant.name }
        : null,
    };
  }
}
