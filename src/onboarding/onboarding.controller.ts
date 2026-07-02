import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { SelectSubscriptionDto } from './dto/select-subscription.dto';
import {
  BusinessProfileDto,
  BusinessProfileResponseDto,
} from './dto/business-profile.dto';
import {
  MerchantProfileDto,
  MerchantProfileResponseDto,
} from './dto/merchant-profile.dto';
import {
  AdminIdentityResponseDto,
  ProvisionAccountDto,
} from './dto/provision-account.dto';
import {
  ProvisionAccountResponseDto,
  SaveOnboardingDraftDto,
  SelectSubscriptionResponseDto,
} from './dto/onboarding-draft.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('subscription-tiers')
  @ApiOperation({ summary: 'List available subscription tiers for onboarding' })
  getSubscriptionTiers() {
    return this.onboardingService.getSubscriptionTiers();
  }

  @Post('select-subscription')
  @ApiOperation({ summary: 'Start onboarding session with selected tier' })
  selectSubscription(
    @Body() dto: SelectSubscriptionDto,
  ): Promise<SelectSubscriptionResponseDto> {
    return this.onboardingService.selectSubscription(dto.tierId);
  }

  @Get('business-profile/:sessionId')
  @ApiOperation({ summary: 'Get saved business profile draft' })
  getBusinessProfile(
    @Param('sessionId') sessionId: string,
  ): Promise<BusinessProfileResponseDto> {
    return this.onboardingService.getBusinessProfile(sessionId);
  }

  @Post('business-profile')
  @ApiOperation({ summary: 'Save business profile for onboarding session' })
  saveBusinessProfile(@Body() dto: BusinessProfileDto): Promise<void> {
    return this.onboardingService.saveBusinessProfile(dto);
  }

  @Get('merchant-profile/:sessionId')
  @ApiOperation({ summary: 'Get saved merchant profile draft' })
  getMerchantProfile(
    @Param('sessionId') sessionId: string,
  ): Promise<MerchantProfileResponseDto> {
    return this.onboardingService.getMerchantProfile(sessionId);
  }

  @Post('merchant-profile')
  @ApiOperation({ summary: 'Save merchant profile for onboarding session' })
  saveMerchantProfile(@Body() dto: MerchantProfileDto): Promise<void> {
    return this.onboardingService.saveMerchantProfile(dto);
  }

  @Get('admin-identity/:sessionId')
  @ApiOperation({ summary: 'Get saved admin identity draft' })
  getAdminIdentity(
    @Param('sessionId') sessionId: string,
  ): Promise<AdminIdentityResponseDto> {
    return this.onboardingService.getAdminIdentity(sessionId);
  }

  @Post('provision-account')
  @ApiOperation({
    summary: 'Complete onboarding and provision merchant admin account',
  })
  provisionAccount(
    @Body() dto: ProvisionAccountDto,
  ): Promise<ProvisionAccountResponseDto> {
    return this.onboardingService.provisionAccount(dto);
  }

  @Post('draft')
  @ApiOperation({ summary: 'Partially persist onboarding wizard progress' })
  saveDraft(@Body() dto: SaveOnboardingDraftDto): Promise<void> {
    return this.onboardingService.saveDraft(dto);
  }
}
