// src/auth/service/auth.service.ts
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from '../platform-saas/users/users.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { LoginDto } from './dto/login.dto';
import { OnboardingRegisterDto } from './dto/onboarding-register.dto';
import { JwtPayload } from 'src/auth/interfaces/JwtPayload.interface';
import {
  MSG_COMPANY_SUBSCRIPTION_OUTDATED,
  MSG_NO_COMPANY_PLAN,
  SubscriptionAccessService,
} from './subscription-access.service';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { getAllSubscriptionFeatureIds } from 'src/common/subscription/subscription-feature-ids';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private usersService: UsersService,
    private readonly subscriptionAccessService: SubscriptionAccessService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      relations: ['merchant'],
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid Credentials');
    }

    if (!user.merchant) {
      throw new UnauthorizedException(
        'User does not have an associated company',
      );
    }

    const isPortalStaff =
      user.role === UserRole.PORTAL_ADMIN || user.role === UserRole.PORTAL_USER;

    let planId: number | undefined;
    let authorizedFeatureIds: number[];
    if (isPortalStaff) {
      // Platform users are not limited by a merchant plan for login; they can access all catalog features.
      planId = undefined;
      authorizedFeatureIds = getAllSubscriptionFeatureIds();
    } else {
      const companyId = user.merchant.companyId;
      if (!companyId) {
        throw new UnauthorizedException(
          'User does not have an associated company',
        );
      }
      try {
        const access =
          await this.subscriptionAccessService.getSubscriptionAccessForCompany(
            companyId,
          );
        planId = access.planId;
        authorizedFeatureIds = access.authorizedFeatureIds;
      } catch (err) {
        const message = (err as { message?: string }).message ?? '';
        if (
          message === MSG_NO_COMPANY_PLAN ||
          message === MSG_COMPANY_SUBSCRIPTION_OUTDATED
        ) {
          planId = undefined;
          authorizedFeatureIds = [];
        } else {
          throw err;
        }
      }
    }

    console.log('User found:', user);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '200m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    await this.usersService.updateRefreshToken(user.id, refreshToken);

    return {
      access_token: accessToken,
      refreshToken: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        scope: user.scope,
        merchant: { id: user.merchant.id },
        planId,
        authorizedFeatureIds,
      },
    };
  }
  async sendResetLink(email: string) {
    const userResponse = await this.usersService.findByEmail(email);
    if (!userResponse) throw new NotFoundException('User not found');

    const user = userResponse.data;
    const resetToken = uuidv4();
    console.log('email:', email);
    console.log('resetToken:', resetToken);
    console.log('user.id:', user.id);
    console.log('BEFORE CALL A saveResetToken');
    await this.usersService.saveResetToken(user.id, resetToken);
    console.log('AFTER CALL A saveResetToken');

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.mailService.sendMail({
      to: user.email,
      subject: 'Reset Password',
      text: `Click the following link to reset your password: ${resetUrl}`,
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
    });

    return { message: 'Recovery link sent to email.' };
  }

  async resetPassword(token: string, newPassword: string) {
    // const testToken = 'fe211622-e117-4c95-8c87-de59d058fc96';
    // const user = await this.usersService.findByResetToken(testToken);
    const user = await this.usersService.findByResetToken(token);
    if (!user) throw new NotFoundException('Invalid or expired token');
    console.log('token:', token);
    console.log('newPassword:', newPassword);
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashed);
    return { message: 'Password updated successfully' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        { sub: user.id, email: user.email },
        { expiresIn: '15m' },
      );

      return { accessToken: newAccessToken };
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
  }

  async registerOnboarding(dto: OnboardingRegisterDto) {
    const emailTaken = await this.userRepository.exists({
      where: { email: dto.adminEmail },
    });
    if (emailTaken) {
      throw new ConflictException('Admin email is already registered');
    }

    const rutTaken = await this.companyRepository.exists({
      where: { rut: dto.rut },
    });
    if (rutTaken) {
      throw new ConflictException('A company with this tax ID already exists');
    }

    const resolvedUsername =
      (dto.username?.trim() || dto.adminEmail.split('@')[0]) ?? '';

    if (resolvedUsername.length > 0) {
      const usernameTaken = await this.userRepository.exists({
        where: { username: resolvedUsername },
      });
      if (usernameTaken) {
        throw new ConflictException('Username is already taken');
      }
    }

    const merchantName = `${dto.branchName} (${dto.rut})`;
    const nameTaken = await this.merchantRepository.exists({
      where: { name: merchantName },
    });
    if (nameTaken) {
      throw new ConflictException(
        'An outlet with this name and tax ID combination already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedUser: User;
    try {
      const company = queryRunner.manager.create(Company, {
        name: dto.companyName,
        email: dto.companyEmail,
        phone: dto.companyPhone,
        rut: dto.rut,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
      });
      const savedCompany = await queryRunner.manager.save(Company, company);

      const merchant = queryRunner.manager.create(Merchant, {
        name: merchantName,
        email: dto.companyEmail,
        phone: dto.companyPhone,
        rut: dto.rut,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        country: dto.country,
        companyId: savedCompany.id,
      });
      const savedMerchant = await queryRunner.manager.save(Merchant, merchant);

      const user = queryRunner.manager.create(User, {
        email: dto.adminEmail,
        username: resolvedUsername,
        password: hashedPassword,
        role: UserRole.MERCHANT_ADMIN,
        scope: Scope.MERCHANT_WEB,
        merchantId: savedMerchant.id,
      });
      savedUser = await queryRunner.manager.save(User, user);

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      scope: savedUser.scope,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '200m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    await this.usersService.updateRefreshToken(savedUser.id, refreshToken);

    return {
      access_token: accessToken,
      refreshToken,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        scope: savedUser.scope,
        merchant: { id: savedUser.merchantId },
        planId: undefined,
        authorizedFeatureIds: [],
      },
    };
  }

  // async refreshToken(refreshToken: string) {
  //   const user = await this.usersService.findByRefreshToken(refreshToken);
  //   if (!user) throw new UnauthorizedException('Invalid refresh token');

  //   const payload = { sub: user.id, email: user.email };
  //   const newAccessToken = this.jwtService.sign(payload);
  //   return { accessToken: newAccessToken };
  // }
}
