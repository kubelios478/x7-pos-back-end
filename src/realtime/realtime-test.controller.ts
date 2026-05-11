import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { companyRoom } from './realtime.constants';
import { RealtimeEventBusService } from './realtime-event-bus.service';
import { RealtimeTestBroadcastDto } from './dto/realtime-test-broadcast.dto';

@ApiTags('Realtime (test)')
@ApiBearerAuth()
@Controller('realtime/test')
export class RealtimeTestController {
  constructor(
    private readonly eventBus: RealtimeEventBusService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Post('broadcast')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Emit a test notification to the authenticated company room',
    description:
      'Dev/testing helper. Emits a Socket.IO event to room company:<companyId>.',
  })
  async broadcastToCompany(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RealtimeTestBroadcastDto,
  ) {
    const dbUser = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ['merchant'],
    });

    const companyId = dbUser?.merchant?.companyId;
    if (!companyId) {
      return {
        statusCode: 400,
        message: 'User is not associated with a company',
      };
    }

    const event = dto.event?.trim() || 'test.notification';
    this.eventBus.emitToRoom(companyRoom(companyId), event, {
      message: dto.message,
      companyId,
      emittedAt: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      message: 'Notification emitted',
      data: { event, room: companyRoom(companyId) },
    };
  }
}

