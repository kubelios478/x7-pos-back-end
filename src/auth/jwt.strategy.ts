// src/auth/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { UserRole } from '../users/constants/role.enum';
import { Scope } from '../users/constants/scope.enum';
import { Merchant } from 'src/merchants/entities/merchant.entity';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  scope: Scope;
  merchant: Merchant;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken() as (
        req: any,
      ) => string,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const userId = parseInt(payload.sub, 10);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['merchant'],
    });

    if (!user || !user.merchant) throw new Error('Invalid token');

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      scope: user.scope,
      merchant: user.merchant,
    };
  }
}
