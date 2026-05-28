import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { KitchenOrderStatus } from '../kitchen-order/constants/kitchen-order-status.enum';
import { KitchenCancellationReason } from '../kitchen-order/constants/kitchen-order-cancellation-reason.dto';

@Injectable()
export class KitchenAnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async getAveragePrepTime(merchantId: number) {
    const query = this.dataSource
      .createQueryBuilder()
      .select('p."categoryId"', 'categoryId')
      .addSelect('sub.station_id', 'stationId')
      .addSelect('EXTRACT(DOW FROM sub.completed_at)', 'dayOfWeek')
      .addSelect('EXTRACT(HOUR FROM sub.completed_at)', 'hourOfDay')
      .addSelect('AVG(sub.prep_time_seconds)', 'avgPrepTimeSeconds')

      .from((subQuery) => {
        return subQuery
          .select('ko.id', 'order_id')
          .addSelect('koi.product_id', 'product_id')
          .addSelect('ko.station_id', 'station_id')
          .addSelect('ko.completed_at', 'completed_at')
          .addSelect('ko.started_at', 'started_at')
          .addSelect(
            'EXTRACT(EPOCH FROM (ko.completed_at - ko.started_at))',
            'prep_time_seconds',
          )
          .from('kitchen_order', 'ko')
          .innerJoin(
            'kitchen_order_item',
            'koi',
            'koi.kitchen_order_id = ko.id',
          )
          .where('ko.business_status = :status', { status: 'completed' })
          .andWhere('ko.completed_at IS NOT NULL')
          .andWhere('ko.started_at IS NOT NULL');
      }, 'sub')

      .innerJoin('product', 'p', 'p.id = sub.product_id')
      .innerJoin('category', 'c', 'c.id = p."categoryId"')

      .where('p."merchantId" = :merchantId', { merchantId })
      .andWhere('p."isActive" = true')
      .andWhere('c."isActive" = true')
      .andWhere('p."categoryId" IS NOT NULL')

      .groupBy('p."categoryId"')
      .addGroupBy('sub.station_id')
      .addGroupBy('EXTRACT(DOW FROM sub.completed_at)')
      .addGroupBy('EXTRACT(HOUR FROM sub.completed_at)');

    const result = await query.getRawMany();

    return result.map((r) => ({
      categoryId: Number(r.categoryId),
      stationId: Number(r.stationId),
      dayOfWeek: Number(r.dayOfWeek),
      hourOfDay: Number(r.hourOfDay),
      avgPrepTimeSeconds: Number(r.avgPrepTimeSeconds),
    }));
  }

  async getCancelledKitchenOrders(
    merchantId: number,
    startDate?: string,
    endDate?: string,
  ) {
    const query = this.dataSource
      .createQueryBuilder()
      .select('ko.id', 'kitchenOrderId')
      .addSelect('ko.cancellation_reason', 'reason')
      .addSelect('ko.cancelled_by_user_id', 'cancelledBy')
      .addSelect('ko.cancelled_at', 'cancelledAt')
      .addSelect('SUM("koi"."quantity" * "p"."basePrice")', 'estimatedLoss')

      .from('kitchen_order', 'ko')

      .innerJoin('kitchen_order_item', 'koi', 'koi.kitchen_order_id = ko.id')
      .innerJoin('product', 'p', 'p.id = koi.product_id')

      .where('ko.status = :status', {
        status: KitchenOrderStatus.CANCELLED,
      })
      .andWhere('p."merchantId" = :merchantId', { merchantId })
      .andWhere('ko.started_at IS NOT NULL');

    // 🔥 filtro opcional por fecha
    if (startDate && endDate) {
      query.andWhere('ko.cancelled_at BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });
    }

    query
      .groupBy('ko.id')
      .addGroupBy('ko.cancellation_reason')
      .addGroupBy('ko.cancelled_by_user_id')
      .addGroupBy('ko.cancelled_at');

    const result = await query.getRawMany();

    return result.map((r) => ({
      kitchenOrderId: Number(r.kitchenOrderId),
      reason: r.reason,
      cancelledBy: Number(r.cancelledBy),
      cancelledAt: r.cancelledAt,
      estimatedLoss: Number(r.estimatedLoss),
    }));
  }

  async getCancellationSummary(merchantId: number) {
    const query = this.dataSource
      .createQueryBuilder()
      .select('ko.cancellation_reason', 'reason')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM("koi"."quantity" * "p"."basePrice")', 'estimatedLoss')

      .from('kitchen_order', 'ko')

      .innerJoin('kitchen_order_item', 'koi', 'koi.kitchen_order_id = ko.id')
      .innerJoin('product', 'p', 'p.id = koi.product_id')

      .where('ko.status = :status', {
        status: KitchenOrderStatus.CANCELLED,
      })
      .andWhere('p."merchantId" = :merchantId', { merchantId })
      .andWhere('ko.started_at IS NOT NULL')

      .groupBy('ko.cancellation_reason');

    return query.getRawMany();
  }
}
