import { IsOptional, IsDateString, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum AnalyticsGranularity {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

export class GetExecutiveAnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  targetSlaMinutes?: number;

  @IsOptional()
  @IsEnum(AnalyticsGranularity)
  granularity?: AnalyticsGranularity;
}

export interface HourlyHeatmapItem {
  hour: number;
  label: string;
  orderCount: number;
  avgPrepTimeMinutes: number;
  isPeakRush: boolean;
}

export interface SlaDistribution {
  underTargetCount: number;
  underTargetPercent: number;
  acceptableCount: number;
  acceptablePercent: number;
  overTargetCount: number;
  overTargetPercent: number;
}

export interface StationSosBreakdownItem {
  stationId: number;
  stationName: string;
  totalOrders: number;
  completedOrders: number;
  avgPrepTimeSeconds: number;
  avgPrepTimeFormatted: string;
  slaComplianceRate: number;
}

export type StationEfficiencyRating = 'optimal' | 'warning' | 'critical';

export interface StationEfficiencyItem {
  stationId: number;
  stationName: string;
  stationType: string;
  totalItemsPrepared: number;
  avgPrepTimeSeconds: number;
  avgPrepTimeFormatted: string;
  peakQueueCapacity: number;
  efficiencyRating: StationEfficiencyRating;
}

export interface ItemBottleneckItem {
  productId: number;
  productName: string;
  variantId: number | null;
  variantName: string | null;
  totalQuantityPrepared: number;
  avgPrepTimeSeconds: number;
  avgPrepTimeFormatted: string;
  standardCookingTimeSeconds: number;
  standardCookingTimeFormatted: string;
  varianceSeconds: number;
  varianceFormatted: string;
  isBottleneck: boolean;
}

export interface ExecutiveAnalyticsData {
  totalOrdersProcessed: number;
  completedOrders: number;
  startedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  cancellationRate: number;
  isHighCancellation: boolean;
  avgPrepTimeSeconds: number;
  avgPrepTimeFormatted: string;
  minPrepTimeSeconds: number;
  maxPrepTimeSeconds: number;
  slaTargetMinutes: number;
  slaComplianceRate: number;
  hourlyHeatmap: HourlyHeatmapItem[];
  slaDistribution: SlaDistribution;
  stationBreakdown: StationSosBreakdownItem[];
  stationEfficiencyMatrix: StationEfficiencyItem[];
  bottlenecks: ItemBottleneckItem[];
}
