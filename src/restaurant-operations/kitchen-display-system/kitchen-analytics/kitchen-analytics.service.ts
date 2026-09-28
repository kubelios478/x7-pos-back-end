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

  async getExecutiveAnalytics(
    merchantId: number,
    startDate?: string,
    endDate?: string,
    stationId?: number,
    targetSlaMinutes: number = 12,
  ) {
    const slaLimitSeconds = Math.max(1, targetSlaMinutes) * 60;

    // 1. Fetch all kitchen orders for the merchant within optional date range and station
    const qb = this.dataSource
      .createQueryBuilder()
      .select('ko.id', 'id')
      .addSelect('ko.business_status', 'businessStatus')
      .addSelect('ko.status', 'status')
      .addSelect('ko.station_id', 'stationId')
      .addSelect('ks.name', 'stationName')
      .addSelect('ko.created_at', 'createdAt')
      .addSelect('ko.started_at', 'started_at')
      .addSelect('ko.completed_at', 'completed_at')
      .addSelect('ko.cancelled_at', 'cancelled_at')
      .addSelect(
        'CASE WHEN ko.completed_at IS NOT NULL AND ko.started_at IS NOT NULL ' +
          'THEN EXTRACT(EPOCH FROM (ko.completed_at - ko.started_at)) ' +
          'ELSE NULL END',
        'prepSeconds',
      )
      .from('kitchen_order', 'ko')
      .leftJoin('kitchen_station', 'ks', 'ks.id = ko.station_id')
      .where('ko.merchant_id = :merchantId', { merchantId });

    if (stationId) {
      qb.andWhere('ko.station_id = :stationId', { stationId });
    }

    if (startDate) {
      qb.andWhere('ko.created_at >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('ko.created_at <= :endDate', { endDate });
    }

    const orders = await qb.getRawMany();

    const totalOrders = orders.length;
    const completedOrdersList = orders.filter(
      (o) => o.businessStatus === 'completed' || o.completed_at !== null,
    );
    const completedCount = completedOrdersList.length;
    const startedCount = orders.filter((o) => o.businessStatus === 'started').length;
    const pendingCount = orders.filter((o) => o.businessStatus === 'pending').length;
    const cancelledCount = orders.filter(
      (o) => o.status === 'cancelled' || o.businessStatus === 'cancelled' || o.cancelled_at !== null,
    );
    const cancelledCountNumber = cancelledCount.length;

    // Cancellation rate
    const cancellationRate = totalOrders > 0 ? (cancelledCountNumber / totalOrders) * 100 : 0;
    const isHighCancellation = cancellationRate > 5.0;

    // Speed of service calculations (prepSeconds)
    const validPrepTimes = completedOrdersList
      .map((o) => (o.prepSeconds !== null ? Number(o.prepSeconds) : null))
      .filter((s): s is number => s !== null && !isNaN(s) && s >= 0);

    const sumPrepSeconds = validPrepTimes.reduce((acc, curr) => acc + curr, 0);
    const avgPrepTimeSeconds = validPrepTimes.length > 0 ? Math.round(sumPrepSeconds / validPrepTimes.length) : 0;
    const minPrepTimeSeconds = validPrepTimes.length > 0 ? Math.round(Math.min(...validPrepTimes)) : 0;
    const maxPrepTimeSeconds = validPrepTimes.length > 0 ? Math.round(Math.max(...validPrepTimes)) : 0;

    // Formatter
    const formatSeconds = (sec: number) => {
      if (sec <= 0) return '0m 00s';
      const mins = Math.floor(sec / 60);
      const remainingSecs = Math.round(sec % 60);
      return `${mins}m ${remainingSecs.toString().padStart(2, '0')}s`;
    };
    const avgPrepTimeFormatted = formatSeconds(avgPrepTimeSeconds);

    // SLA Compliance: orders with prepSeconds <= targetSlaMinutes * 60
    const compliantCount = validPrepTimes.filter((s) => s <= slaLimitSeconds).length;
    const slaComplianceRate = validPrepTimes.length > 0
      ? Number(((compliantCount / validPrepTimes.length) * 100).toFixed(1))
      : 100.0;

    // SLA Distribution (3 categories)
    // 1. Under target: < 8 mins (480s)
    // 2. Acceptable: 8-12 mins (480s - 720s)
    // 3. Over target / Delayed: > 12 mins (> 720s)
    const underTarget = validPrepTimes.filter((s) => s < 480).length;
    const acceptable = validPrepTimes.filter((s) => s >= 480 && s <= 720).length;
    const overTarget = validPrepTimes.filter((s) => s > 720).length;
    const totalValid = validPrepTimes.length || 1;

    const slaDistribution = {
      underTargetCount: underTarget,
      underTargetPercent: Number(((underTarget / totalValid) * 100).toFixed(1)),
      acceptableCount: acceptable,
      acceptablePercent: Number(((acceptable / totalValid) * 100).toFixed(1)),
      overTargetCount: overTarget,
      overTargetPercent: Number(((overTarget / totalValid) * 100).toFixed(1)),
    };

    // Hourly Heatmap (24 hours: 0..23)
    const hourStatsMap: Record<number, { count: number; prepSum: number; validPrepCount: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourStatsMap[h] = { count: 0, prepSum: 0, validPrepCount: 0 };
    }

    orders.forEach((o) => {
      const dateToUse = o.completed_at ? new Date(o.completed_at) : new Date(o.createdAt);
      if (!isNaN(dateToUse.getTime())) {
        const hour = dateToUse.getHours();
        hourStatsMap[hour].count += 1;
        if (o.prepSeconds !== null) {
          const s = Number(o.prepSeconds);
          if (!isNaN(s) && s >= 0) {
            hourStatsMap[hour].prepSum += s;
            hourStatsMap[hour].validPrepCount += 1;
          }
        }
      }
    });

    // Find maximum count for peak rush calculation
    const maxHourCount = Math.max(...Object.values(hourStatsMap).map((m) => m.count), 0);

    const formatHourLabel = (h: number) => {
      if (h === 0) return '12 AM';
      if (h < 12) return `${h} AM`;
      if (h === 12) return '12 PM';
      return `${h - 12} PM`;
    };

    const hourlyHeatmap = Object.entries(hourStatsMap).map(([hStr, stats]) => {
      const h = Number(hStr);
      const avgMinutes = stats.validPrepCount > 0
        ? Number((stats.prepSum / stats.validPrepCount / 60).toFixed(1))
        : 0;
      const isPeakRush = maxHourCount > 0 && stats.count >= maxHourCount * 0.75;
      return {
        hour: h,
        label: formatHourLabel(h),
        orderCount: stats.count,
        avgPrepTimeMinutes: avgMinutes,
        isPeakRush,
      };
    });

    // Station SOS Breakdown
    const stationMap: Record<string, {
      stationId: number;
      stationName: string;
      totalOrders: number;
      completedOrders: number;
      prepSecondsList: number[];
    }> = {};

    orders.forEach((o) => {
      const stId = o.stationId ? Number(o.stationId) : 0;
      const stName = o.stationName || (stId === 0 ? 'Unassigned / Global' : `Station #${stId}`);
      const key = `${stId}_${stName}`;

      if (!stationMap[key]) {
        stationMap[key] = {
          stationId: stId,
          stationName: stName,
          totalOrders: 0,
          completedOrders: 0,
          prepSecondsList: [],
        };
      }

      stationMap[key].totalOrders += 1;
      if (o.businessStatus === 'completed' || o.completed_at !== null) {
        stationMap[key].completedOrders += 1;
        if (o.prepSeconds !== null) {
          const s = Number(o.prepSeconds);
          if (!isNaN(s) && s >= 0) {
            stationMap[key].prepSecondsList.push(s);
          }
        }
      }
    });

    const stationBreakdown = Object.values(stationMap).map((st) => {
      const prepList = st.prepSecondsList;
      const avgSec = prepList.length > 0
        ? Math.round(prepList.reduce((a, b) => a + b, 0) / prepList.length)
        : 0;
      const compliantSt = prepList.filter((s) => s <= slaLimitSeconds).length;
      const slaRate = prepList.length > 0
        ? Number(((compliantSt / prepList.length) * 100).toFixed(1))
        : 100.0;

      return {
        stationId: st.stationId,
        stationName: st.stationName,
        totalOrders: st.totalOrders,
        completedOrders: st.completedOrders,
        avgPrepTimeSeconds: avgSec,
        avgPrepTimeFormatted: formatSeconds(avgSec),
        slaComplianceRate: slaRate,
      };
    });

    return {
      totalOrdersProcessed: completedCount,
      completedOrders: completedCount,
      startedOrders: startedCount,
      pendingOrders: pendingCount,
      cancelledOrders: cancelledCountNumber,
      cancellationRate: Number(cancellationRate.toFixed(1)),
      isHighCancellation,
      avgPrepTimeSeconds,
      avgPrepTimeFormatted,
      minPrepTimeSeconds,
      maxPrepTimeSeconds,
      slaTargetMinutes: targetSlaMinutes,
      slaComplianceRate,
      hourlyHeatmap,
      slaDistribution,
      stationBreakdown,
    };
  }
}
