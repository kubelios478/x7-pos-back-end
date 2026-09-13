import { In, Repository } from 'typeorm';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { OnlineOrderItemStatus } from '../online-order-item/constants/online-order-item-status.enum';

/**
 * Unit price from catalog (without persisting in online rows).
 * JSON modifiers are not included here; the total POS after acceptance is the source of truth.
 */
export function resolveCatalogUnitPrice(
  product: Product,
  variant: Variant | null,
): number {
  if (variant) {
    return Number(variant.price);
  }
  return Number(product.basePrice);
}

/** LLine with loaded relationships: POS linked wins over catalog. */
export function resolveUnitPriceForOnlineOrderItem(
  line: OnlineOrderItem,
): number {
  if (line.orderItem) {
    return Number(line.orderItem.price);
  }
  return resolveCatalogUnitPrice(line.product, line.variant);
}

export async function computeOnlineOrderTotalAmount(
  onlineOrder: OnlineOrder,
  itemRepo: Repository<OnlineOrderItem>,
): Promise<number> {
  if (onlineOrder.order_id && onlineOrder.order) {
    return Number(onlineOrder.order.total ?? 0);
  }

  const lines = await itemRepo.find({
    where: {
      online_order_id: onlineOrder.id,
      status: OnlineOrderItemStatus.ACTIVE,
    },
    relations: ['product', 'variant', 'orderItem'],
  });

  return lines.reduce((sum, line) => {
    const unit = resolveUnitPriceForOnlineOrderItem(line);
    return sum + unit * line.quantity;
  }, 0);
}

/** Totals for a list of orders (avoid N+1 with an item query). */
export async function computeOnlineOrderTotalAmountsForMany(
  orders: OnlineOrder[],
  itemRepo: Repository<OnlineOrderItem>,
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  if (orders.length === 0) {
    return result;
  }

  for (const o of orders) {
    if (o.order_id && o.order) {
      result.set(o.id, Number(o.order.total ?? 0));
    }
  }

  const needCatalog = orders
    .filter((o) => !o.order_id || !o.order)
    .map((o) => o.id);
  if (needCatalog.length === 0) {
    return result;
  }

  const lines = await itemRepo.find({
    where: {
      online_order_id: In(needCatalog),
      status: OnlineOrderItemStatus.ACTIVE,
    },
    relations: ['product', 'variant', 'orderItem'],
  });

  const byOrder = new Map<number, OnlineOrderItem[]>();
  for (const line of lines) {
    const list = byOrder.get(line.online_order_id) ?? [];
    list.push(line);
    byOrder.set(line.online_order_id, list);
  }

  for (const id of needCatalog) {
    const list = byOrder.get(id) ?? [];
    const total = list.reduce((sum, line) => {
      const unit = resolveUnitPriceForOnlineOrderItem(line);
      return sum + unit * line.quantity;
    }, 0);
    result.set(id, total);
  }

  return result;
}
