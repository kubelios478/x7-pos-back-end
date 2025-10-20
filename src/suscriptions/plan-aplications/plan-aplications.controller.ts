import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { PlanAplicationsService } from './plan-aplications.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { UserRole } from 'src/users/constants/role.enum';
import { Scope } from 'src/users/constants/scope.enum';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { CreatePlanAplicationDto } from './dto/create-plan-aplication.dto';
import { PlanAplication } from './entity/plan-aplications.entity';

@ApiTags('Plan Aplications')
@Controller('plan-aplications')
export class PlanAplicationsController {
  constructor(private readonly planAppService: PlanAplicationsService) {}

  @ApiOperation({ summary: 'Create a new Plan Aplication' })
  @ApiCreatedResponse({
    description: 'The Plan Aplication has been created successfully.',
    type: PlanAplication,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data.' })
  @ApiConflictResponse({
    description: 'Plan Aplication with this combination already exists.',
  })
  @ApiForbiddenResponse({ description: 'Forbidden. Insufficient role.' })
  @Post()
  @Roles(UserRole.PORTAL_ADMIN, UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_CLOVER,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_WEB,
  )
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() dto: CreatePlanAplicationDto): Promise<PlanAplication> {
    return await this.planAppService.create(dto);
  }
}
