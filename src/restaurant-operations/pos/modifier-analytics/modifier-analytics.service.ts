import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { GetModifierAnalyticsQueryDto } from './dto/get-modifier-analytics-query.dto';
import { PaginatedModifierAnalyticsResponseDto } from './dto/paginated-modifier-analytics-response.dto';

@Injectable()
export class ModifierAnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getTopModifiers(
    merchantId: number,
    queryDto: GetModifierAnalyticsQueryDto,
  ): Promise<PaginatedModifierAnalyticsResponseDto> {
    const query = this.dataSource
      .createQueryBuilder()
      .select('m.id', 'modifierId')
      .addSelect('m.name', 'modifierName')
      .addSelect('m."productId"', 'productId')
      .addSelect('COUNT(oim.id)', 'usageCount')
      .addSelect('SUM(oim.price)', 'totalRevenue')

      .from('order_item_modifiers', 'oim')

      .innerJoin('modifier', 'm', 'm.id = oim.modifier_id')

      .innerJoin('order_item', 'oi', 'oi.id = oim.order_item_id')

      .innerJoin('orders', 'o', 'o.id = oi.order_id')

      .where('o.status = :status', {
        status: 'paid',
      })

      .andWhere('o.merchant_id = :merchantId', {
        merchantId,
      });

    if (queryDto.startDate) {
      query.andWhere('o.created_at >= :startDate', {
        startDate: queryDto.startDate,
      });
    }

    if (queryDto.endDate) {
      query.andWhere('o.created_at <= :endDate', {
        endDate: queryDto.endDate,
      });
    }

    query
      .groupBy('m.id')
      .addGroupBy('m.name')
      .addGroupBy('m."productId"')

      .orderBy('"usageCount"', 'DESC');

    const result = await query.getRawMany();

    return {
      statusCode: 200,
      message: 'Modifier analytics retrieved successfully',
      data: result.map((r) => ({
        modifierId: Number(r.modifierId),
        modifierName: r.modifierName,
        productId: Number(r.productId),
        usageCount: Number(r.usageCount),
        totalRevenue: Number(r.totalRevenue),
      })),
    };
  }
}
