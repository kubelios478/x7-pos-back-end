//src/subscriptions/plan-applications/plan-applications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanApplication } from './entity/plan-applications.entity';
import { CreatePlanApplicationDto } from './dto/create-plan-application.dto';
import {
  AllPlanApplicationsResponseDto,
  OnePlanApplicationResponseDto,
} from './dto/summary-plan-applications.dto';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { UpdatePlanApplicationDto } from './dto/update-plan-application.dto';

@Injectable()
export class PlanApplicationsService {
  constructor(
    @InjectRepository(PlanApplication)
    private readonly planAplicationRepository: Repository<PlanApplication>,

    @InjectRepository(SubscriptionPlan)
    private readonly suscriptionPlanRepository: Repository<SubscriptionPlan>,

    @InjectRepository(ApplicationEntity)
    private readonly aplicationRepository: Repository<ApplicationEntity>,
  ) {}
  async create(
    dto: CreatePlanApplicationDto,
  ): Promise<OnePlanApplicationResponseDto> {
    if (
      (dto.subscriptionPlan &&
        (!Number.isInteger(dto.subscriptionPlan) ||
          dto.subscriptionPlan <= 0)) ||
      (dto.application &&
        (!Number.isInteger(dto.application) || dto.application <= 0))
    ) {
      ErrorHandler.invalidId(
        'Subscription Plan ID and Application ID must be positive integers',
      );
    }

    try {
      let subscriptionPlan: SubscriptionPlan | null = null;
      let application: ApplicationEntity | null = null;

      if (dto.subscriptionPlan) {
        subscriptionPlan = await this.suscriptionPlanRepository.findOne({
          where: { id: dto.subscriptionPlan },
        });
        if (!subscriptionPlan) {
          ErrorHandler.resourceNotFound(
            'Subscription Plan',
            dto.subscriptionPlan,
          );
        }
      }

      if (dto.application) {
        application = await this.aplicationRepository.findOne({
          where: { id: dto.application },
        });
        if (!application) {
          ErrorHandler.resourceNotFound('Application', dto.application);
        }
      }
      const newPlanApp = this.planAplicationRepository.create({
        suscriptionPlan: subscriptionPlan,
        aplication: application,
        limits: dto.limits,
      } as Partial<PlanApplication>);

      const savedPlanApp = await this.planAplicationRepository.save(newPlanApp);

      return {
        statusCode: 201,
        message: 'Plan Application created successfully',
        data: savedPlanApp,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }

  async findAll(): Promise<AllPlanApplicationsResponseDto> {
    const planApps = await this.planAplicationRepository.find({
      relations: ['subscriptionPlan', 'application'],
      select: {
        subscriptionPlan: {
          id: true,
          name: true,
        },
        application: {
          id: true,
          name: true,
        },
      },
    });
    return {
      statusCode: 200,
      message: 'Plan Applications retrieved successfully',
      data: planApps,
    };
  }

  async findOne(id: number): Promise<OnePlanApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Application ID must be a positive integer');
    }
    const planApp = await this.planAplicationRepository.findOne({
      where: { planApplication: id },
      relations: ['subscriptionPlan', 'application'],
      select: {
        subscriptionPlan: {
          id: true,
          name: true,
        },
        application: {
          id: true,
          name: true,
        },
      },
    });
    if (!planApp) {
      ErrorHandler.planApplicationNotFound();
    }
    return {
      statusCode: 200,
      message: 'Plan Application retrieved successfully',
      data: planApp,
    };
  }
  async update(
    id: number,
    dto: UpdatePlanApplicationDto,
  ): Promise<OnePlanApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Application ID must be a positive integer');
    }
    try {
      const planApp = await this.planAplicationRepository.findOne({
        where: { planApplication: id },
        relations: ['subscriptionPlan', 'application'],
        select: {
          subscriptionPlan: {
            id: true,
            name: true,
          },
          application: {
            id: true,
            name: true,
          },
        },
      });
      if (!planApp) {
        ErrorHandler.resourceNotFound('Plan Application', id);
      }
      Object.assign(planApp, dto);

      const updatedPlanApp = await this.planAplicationRepository.save(planApp);

      return {
        statusCode: 200,
        message: 'Plan Application updated successfully',
        data: updatedPlanApp,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
  async remove(id: number): Promise<OnePlanApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId('Plan Application ID must be a positive integer');
    }
    try {
      const planApp = await this.planAplicationRepository.findOne({
        where: { planApplication: id },
      });
      if (!planApp) {
        ErrorHandler.planApplicationNotFound();
      }
      await this.planAplicationRepository.remove(planApp);
      return {
        statusCode: 200,
        message: 'Plan Application deleted successfully',
        data: planApp,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
