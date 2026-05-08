import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeEventBusService } from './realtime-event-bus.service';
import { RealtimeAuthService } from './realtime-auth.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
    }),
  ],
  providers: [RealtimeGateway, RealtimeEventBusService, RealtimeAuthService],
  exports: [RealtimeEventBusService],
})
export class RealtimeModule {}
