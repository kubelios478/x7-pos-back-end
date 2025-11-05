// src/subscriptions/subscription-application/subscription-application.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { MerchantSubscription } from '../merchant-subscriptions/entities/merchant-subscription.entity';
import { SubscriptionApplication } from './entity/subscription-application.entity';
import { ApplicationEntity } from '../applications/entity/application-entity';
import {
  AllSubscriptionApplicationsResponseDto,
  OneSubscriptionApplicationResponseDto,
} from './dto/subscription-application-response.dto';
import { CreateSubscriptionApplicationDto } from './dto/create-subscription-application.dto';
import { UpdateSubscriptionApplicationDto } from './dto/update-subscription-application.dto';

@Injectable()
export class SubscriptionApplicationService {
  constructor(
    @InjectRepository(SubscriptionApplication)
    private readonly subscriptionApplicationRepository: Repository<SubscriptionApplication>,

    @InjectRepository(MerchantSubscription)
    private readonly merchantSubscriptionRepository: Repository<MerchantSubscription>,

    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
  ) {}
  async create(
    dto: CreateSubscriptionApplicationDto,
  ): Promise<OneSubscriptionApplicationResponseDto> {
    // Validate merchantSubscriptionId and applicationId
    if (
      (dto.merchantSubscriptionId &&
        (!Number.isInteger(dto.merchantSubscriptionId) ||
          dto.merchantSubscriptionId <= 0)) ||
      (dto.applicationId &&
        (!Number.isInteger(dto.applicationId) || dto.applicationId <= 0))
    ) {
      ErrorHandler.invalidId(
        'Merchant Subscription ID and Application ID must be positive integers',
      );
    }
    try {
      let merchantSubscription: MerchantSubscription | null = null;
      let application: ApplicationEntity | null = null;

      if (dto.merchantSubscriptionId || dto.applicationId) {
        if (dto.merchantSubscriptionId) {
          merchantSubscription =
            await this.merchantSubscriptionRepository.findOne({
              where: { id: dto.merchantSubscriptionId },
            });
          if (!merchantSubscription) {
            ErrorHandler.merchantSubscriptionNotFound();
          }
        }
        if (dto.applicationId) {
          application = await this.applicationRepository.findOne({
            where: { id: dto.applicationId },
          });
          if (!application) {
            ErrorHandler.applicationNotFound();
          }
        }
      }

      const subscriptionApplication =
        this.subscriptionApplicationRepository.create({
          merchantSubscription: merchantSubscription,
          application: application,
          status: dto.status,
        } as Partial<SubscriptionApplication>);

      const savedApplication =
        await this.subscriptionApplicationRepository.save(
          subscriptionApplication,
        );

      return {
        statusCode: 201,
        message: 'Subscription-Application created successfully',
        data: savedApplication,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
  async findAll(): Promise<AllSubscriptionApplicationsResponseDto> {
    const subscriptionApplications =
      await this.subscriptionApplicationRepository.find({
        relations: ['merchantSubscription', 'application'],
        select: {
          application: { id: true, name: true },
          merchantSubscription: { id: true, plan: true },
          status: true,
        },
      });
    return {
      statusCode: 200,
      message: 'Subscription Applications retrieved successfully',
      data: subscriptionApplications,
    };
  }
  async findOne(id: number): Promise<OneSubscriptionApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Application ID must be a positive integer',
      );
    }
    const subscriptionApplication =
      await this.subscriptionApplicationRepository.findOne({
        where: { subscriptionApplication: id },
        relations: ['merchantSubscription', 'application'],
      });
    if (!subscriptionApplication) {
      ErrorHandler.subscriptionApplicationNotFound();
    }
    return {
      statusCode: 200,
      message: 'Subscription Application retrieved successfully',
      data: subscriptionApplication,
    };
  }
  async update(
    id: number,
    dto: UpdateSubscriptionApplicationDto,
  ): Promise<OneSubscriptionApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Application ID must be a positive integer',
      );
    }
    try {
      const subscriptionApplication =
        await this.subscriptionApplicationRepository.findOne({
          where: { subscriptionApplication: id },
        });
      if (!subscriptionApplication) {
        ErrorHandler.subscriptionApplicationNotFound();
      }

      if (dto.status !== undefined) {
        subscriptionApplication.status = dto.status;
      }

      const updatedApplication =
        await this.subscriptionApplicationRepository.save(
          subscriptionApplication,
        );

      return {
        statusCode: 200,
        message: `Subscription Application with ID ${id} updated successfully`,
        data: updatedApplication,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
  async remove(id: number): Promise<OneSubscriptionApplicationResponseDto> {
    if (!Number.isInteger(id) || id <= 0) {
      ErrorHandler.invalidId(
        'Subscription Application ID must be a positive integer',
      );
    }
    try {
      const subscriptionApplication =
        await this.subscriptionApplicationRepository.findOne({
          where: { subscriptionApplication: id },
        });
      if (!subscriptionApplication) {
        ErrorHandler.subscriptionApplicationNotFound();
      }

      await this.subscriptionApplicationRepository.remove(
        subscriptionApplication,
      );

      return {
        statusCode: 200,
        message: `Subscription Application with ID ${id} deleted successfully`,
        data: subscriptionApplication,
      };
    } catch (error) {
      ErrorHandler.handleDatabaseError(error);
    }
  }
}
