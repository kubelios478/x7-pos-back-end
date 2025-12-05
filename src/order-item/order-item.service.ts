import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { Product } from '../products-inventory/products/entities/product.entity';
import { Variant } from '../products-inventory/variants/entities/variant.entity';
import { Modifier } from '../products-inventory/modifiers/entities/modifier.entity';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';
import { GetOrderItemQueryDto, OrderItemSortBy } from './dto/get-order-item-query.dto';
import { OrderItemResponseDto, OneOrderItemResponseDto } from './dto/order-item-response.dto';
import { PaginatedOrderItemResponseDto } from './dto/paginated-order-item-response.dto';
import { OrderItemStatus } from './constants/order-item-status.enum';
import { OrderStatus } from '../orders/constants/order-status.enum';

@Injectable()
export class OrderItemService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Variant)
    private readonly variantRepository: Repository<Variant>,
    @InjectRepository(Modifier)
    private readonly modifierRepository: Repository<Modifier>,
  ) {}

  async create(createOrderItemDto: CreateOrderItemDto, authenticatedUserMerchantId: number): Promise<OneOrderItemResponseDto> {


    // Validate user permissions - must be associated with a merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to create order items');
    }

    // Validate order exists and belongs to merchant
    const order = await this.orderRepository.findOne({
      where: { id: createOrderItemDto.orderId },
      relations: ['merchant'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.merchant_id !== authenticatedUserMerchantId) {
  throw new ForbiddenException('You can only create order items for orders belonging to your merchant');
    }

    if (order.logical_status !== OrderStatus.ACTIVE) {
      throw new BadRequestException('Cannot add items to a deleted order');
    }

    // Validate product exists and belongs to merchant
    const product = await this.productRepository.findOne({
      where: { id: createOrderItemDto.productId },
      relations: ['merchant'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.merchantId !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only use products from your merchant');
    }

    // Validate variant if provided
    if (createOrderItemDto.variantId) {
      const variant = await this.variantRepository.findOne({
        where: { id: createOrderItemDto.variantId },
        relations: ['product', 'product.merchant'],
      });

      if (!variant) {
        throw new NotFoundException('Variant not found');
      }

      if (variant.product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException('You can only use variants from your merchant');
      }

      if (variant.productId !== createOrderItemDto.productId) {
        throw new BadRequestException('Variant does not belong to the specified product');
      }
    }

    // Validate modifier if provided
    if (createOrderItemDto.modifierId) {
      const modifier = await this.modifierRepository.findOne({
        where: { id: createOrderItemDto.modifierId },
        relations: ['product', 'product.merchant'],
      });

      if (!modifier) {
        throw new NotFoundException('Modifier not found');
      }

      if (modifier.product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException('You can only use modifiers from your merchant');
      }

      if (modifier.productId !== createOrderItemDto.productId) {
        throw new BadRequestException('Modifier does not belong to the specified product');
      }
    }

    // Business rule validation: quantity must be positive
    if (createOrderItemDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    // Business rule validation: price must be non-negative
    if (createOrderItemDto.price < 0) {
      throw new BadRequestException('Price must be non-negative');
    }

    // Business rule validation: discount must be non-negative
    const discount = createOrderItemDto.discount || 0;
    if (discount < 0) {
      throw new BadRequestException('Discount must be non-negative');
    }

    // Create order item
    const orderItem = new OrderItem();
    orderItem.order_id = createOrderItemDto.orderId;
    orderItem.product_id = createOrderItemDto.productId;
    orderItem.variant_id = createOrderItemDto.variantId || null;
    orderItem.quantity = createOrderItemDto.quantity;
    orderItem.price = createOrderItemDto.price;
    orderItem.discount = discount;
    orderItem.modifier_id = createOrderItemDto.modifierId || null;
    orderItem.notes = createOrderItemDto.notes || null;
    orderItem.status = OrderItemStatus.ACTIVE;

    const savedOrderItem = await this.orderItemRepository.save(orderItem);

    // Fetch the complete order item with relations
    const completeOrderItem = await this.orderItemRepository.findOne({
      where: { id: savedOrderItem.id },
      relations: ['order', 'order.merchant', 'product', 'product.merchant', 'variant', 'variant.product', 'modifier', 'modifier.product'],
    });

    if (!completeOrderItem) {
      throw new NotFoundException('Order item not found after creation');
    }

    return {
      statusCode: 201,
      message: 'Order item created successfully',
      data: this.formatOrderItemResponse(completeOrderItem),
    };
  }

  async findAll(query: GetOrderItemQueryDto, authenticatedUserMerchantId: number): Promise<PaginatedOrderItemResponseDto> {

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access order items');
    }

    // Validate pagination parameters
    if (query.page && query.page < 1) {
      throw new BadRequestException('Page number must be greater than 0');
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    // Validate date format if provided
    if (query.createdDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(query.createdDate)) {
        throw new BadRequestException('Created date must be in YYYY-MM-DD format');
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where conditions - filter by merchant through order
    const whereConditions: any = {
      status: query.status || OrderItemStatus.ACTIVE,
    };

    if (query.orderId) {
      // Validate order exists and belongs to merchant
      const order = await this.orderRepository.findOne({
        where: { id: query.orderId },
        relations: ['merchant'],
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${query.orderId} not found`);
      }
      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Order does not belong to your merchant');
      }
      whereConditions.order_id = query.orderId;
    } else {
      // If no order filter, get all orders for the merchant and filter by them
      const merchantOrders = await this.orderRepository.find({
        where: { merchant_id: authenticatedUserMerchantId },
        select: ['id'],
      });
      const merchantOrderIds = merchantOrders.map(o => o.id);
      if (merchantOrderIds.length === 0) {
        // No orders for this merchant, return empty result
        return {
          statusCode: 200,
          message: 'Order items retrieved successfully',
          data: [],
          paginationMeta: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        };
      }
      // Use In operator when there are multiple order IDs
      whereConditions.order_id = merchantOrderIds.length === 1 
        ? merchantOrderIds[0] 
        : In(merchantOrderIds);
    }

    if (query.productId) {
      // Validate product exists and belongs to merchant
      const product = await this.productRepository.findOne({
        where: { id: query.productId },
        relations: ['merchant'],
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${query.productId} not found`);
      }
      if (product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException('Product does not belong to your merchant');
      }
      whereConditions.product_id = query.productId;
    }

    if (query.variantId) {
      whereConditions.variant_id = query.variantId;
    }

    if (query.modifierId) {
      whereConditions.modifier_id = query.modifierId;
    }

    if (query.createdDate) {
      const startDate = new Date(query.createdDate);
      const endDate = new Date(query.createdDate);
      endDate.setDate(endDate.getDate() + 1);
      whereConditions.created_at = Between(startDate, endDate);
    }

    // Build order conditions
    const orderConditions: any = {};
    if (query.sortBy) {
      const sortField = query.sortBy === OrderItemSortBy.QUANTITY ? 'quantity' :
                       query.sortBy === OrderItemSortBy.PRICE ? 'price' :
                       query.sortBy === OrderItemSortBy.DISCOUNT ? 'discount' :
                       query.sortBy === OrderItemSortBy.CREATED_AT ? 'created_at' :
                       query.sortBy === OrderItemSortBy.UPDATED_AT ? 'updated_at' : 'id';
      orderConditions[sortField] = query.sortOrder || 'DESC';
    } else {
      orderConditions.created_at = 'DESC';
    }

    // Execute query
    const [orderItems, total] = await this.orderItemRepository.findAndCount({
      where: whereConditions,
      relations: ['order', 'order.merchant', 'product', 'product.merchant', 'variant', 'variant.product', 'modifier', 'modifier.product'],
      order: orderConditions,
      skip,
      take: limit,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const paginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    };

    return {
      statusCode: 200,
      message: 'Order items retrieved successfully',
      data: orderItems.map(item => this.formatOrderItemResponse(item)),
      paginationMeta,
    };
  }

  async findOne(id: number, authenticatedUserMerchantId: number): Promise<OneOrderItemResponseDto> {

    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Order item ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to access order items');
    }

    // Find order item
    const orderItem = await this.orderItemRepository.findOne({
      where: { 
        id,
        status: OrderItemStatus.ACTIVE,
      },
      relations: ['order', 'order.merchant', 'product', 'product.merchant', 'variant', 'variant.product', 'modifier', 'modifier.product'],
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Validate merchant ownership through order
    if (orderItem.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only access order items from your merchant');
    }

    return {
      statusCode: 200,
      message: 'Order item retrieved successfully',
      data: this.formatOrderItemResponse(orderItem),
    };
  }

  async update(id: number, updateOrderItemDto: UpdateOrderItemDto, authenticatedUserMerchantId: number): Promise<OneOrderItemResponseDto> {

    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Order item ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to update order items');
    }

    // Find existing order item
    const existingOrderItem = await this.orderItemRepository.findOne({
      where: { 
        id,
        status: OrderItemStatus.ACTIVE,
      },
      relations: ['order', 'order.merchant', 'product', 'product.merchant', 'variant', 'variant.product', 'modifier', 'modifier.product'],
    });

    if (!existingOrderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Validate merchant ownership
    if (existingOrderItem.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only update order items from your merchant');
    }

    // Validate order if provided
    if (updateOrderItemDto.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: updateOrderItemDto.orderId },
        relations: ['merchant'],
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.merchant_id !== authenticatedUserMerchantId) {
        throw new ForbiddenException('You can only assign orders from your merchant');
      }
    }

    // Validate product if provided
    if (updateOrderItemDto.productId) {
      const product = await this.productRepository.findOne({
        where: { id: updateOrderItemDto.productId },
        relations: ['merchant'],
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.merchantId !== authenticatedUserMerchantId) {
        throw new ForbiddenException('You can only use products from your merchant');
      }
    }

    // Validate variant if provided
    if (updateOrderItemDto.variantId !== undefined) {
      if (updateOrderItemDto.variantId === null) {
        // Allowing null to remove variant
      } else {
        const variant = await this.variantRepository.findOne({
          where: { id: updateOrderItemDto.variantId },
          relations: ['product', 'product.merchant'],
        });

        if (!variant) {
          throw new NotFoundException('Variant not found');
        }

        if (variant.product.merchantId !== authenticatedUserMerchantId) {
          throw new ForbiddenException('You can only use variants from your merchant');
        }

        const productId = updateOrderItemDto.productId || existingOrderItem.product_id;
        if (variant.productId !== productId) {
          throw new BadRequestException('Variant does not belong to the specified product');
        }
      }
    }

    // Validate modifier if provided
    if (updateOrderItemDto.modifierId !== undefined) {
      if (updateOrderItemDto.modifierId === null) {
        // Allowing null to remove modifier
      } else {
        const modifier = await this.modifierRepository.findOne({
          where: { id: updateOrderItemDto.modifierId },
          relations: ['product', 'product.merchant'],
        });

        if (!modifier) {
          throw new NotFoundException('Modifier not found');
        }

        if (modifier.product.merchantId !== authenticatedUserMerchantId) {
          throw new ForbiddenException('You can only use modifiers from your merchant');
        }

        const productId = updateOrderItemDto.productId || existingOrderItem.product_id;
        if (modifier.productId !== productId) {
          throw new BadRequestException('Modifier does not belong to the specified product');
        }
      }
    }

    // Business rule validation: amounts
    if (updateOrderItemDto.quantity !== undefined && updateOrderItemDto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }
    if (updateOrderItemDto.price !== undefined && updateOrderItemDto.price < 0) {
      throw new BadRequestException('Price must be non-negative');
    }
    if (updateOrderItemDto.discount !== undefined && updateOrderItemDto.discount < 0) {
      throw new BadRequestException('Discount must be non-negative');
    }

    // Update order item
    const updateData: any = {};
    if (updateOrderItemDto.orderId !== undefined) updateData.order_id = updateOrderItemDto.orderId;
    if (updateOrderItemDto.productId !== undefined) updateData.product_id = updateOrderItemDto.productId;
    if (updateOrderItemDto.variantId !== undefined) updateData.variant_id = updateOrderItemDto.variantId;
    if (updateOrderItemDto.quantity !== undefined) updateData.quantity = updateOrderItemDto.quantity;
    if (updateOrderItemDto.price !== undefined) updateData.price = updateOrderItemDto.price;
    if (updateOrderItemDto.discount !== undefined) updateData.discount = updateOrderItemDto.discount;
    if (updateOrderItemDto.modifierId !== undefined) updateData.modifier_id = updateOrderItemDto.modifierId;
    if (updateOrderItemDto.notes !== undefined) updateData.notes = updateOrderItemDto.notes || null;

    await this.orderItemRepository.update(id, updateData);

    // Fetch updated order item
    const updatedOrderItem = await this.orderItemRepository.findOne({
      where: { id },
      relations: ['order', 'order.merchant', 'product', 'product.merchant', 'variant', 'variant.product', 'modifier', 'modifier.product'],
    });

    if (!updatedOrderItem) {
      throw new NotFoundException('Order item not found after update');
    }

    return {
      statusCode: 200,
      message: 'Order item updated successfully',
      data: this.formatOrderItemResponse(updatedOrderItem),
    };
  }

  async remove(id: number, authenticatedUserMerchantId: number): Promise<OneOrderItemResponseDto> {

    // Validate ID
    if (!id || id <= 0) {
      throw new BadRequestException('Order item ID must be a valid positive number');
    }

    // Validate user has merchant
    if (!authenticatedUserMerchantId) {
      throw new ForbiddenException('You must be associated with a merchant to delete order items');
    }

    // Find existing order item
    const existingOrderItem = await this.orderItemRepository.findOne({
      where: { 
        id,
        status: OrderItemStatus.ACTIVE,
      },
      relations: ['order', 'order.merchant', 'product', 'product.merchant', 'variant', 'variant.product', 'modifier', 'modifier.product'],
    });

    if (!existingOrderItem) {
      throw new NotFoundException('Order item not found');
    }

    // Validate merchant ownership
    if (existingOrderItem.order.merchant_id !== authenticatedUserMerchantId) {
      throw new ForbiddenException('You can only delete order items from your merchant');
    }

    // Check if already deleted
    if (existingOrderItem.status === OrderItemStatus.DELETED) {
      throw new ConflictException('Order item is already deleted');
    }

    // Perform logical deletion
    existingOrderItem.status = OrderItemStatus.DELETED;
    await this.orderItemRepository.save(existingOrderItem);

    return {
      statusCode: 200,
      message: 'Order item deleted successfully',
      data: this.formatOrderItemResponse(existingOrderItem),
    };
  }

  private formatOrderItemResponse(orderItem: OrderItem): OrderItemResponseDto {
    return {
      id: orderItem.id,
      orderId: orderItem.order_id,
      order: {
        id: orderItem.order.id,
        businessStatus: orderItem.order.status,
        type: orderItem.order.type,
      },
      productId: orderItem.product_id,
      product: {
        id: orderItem.product.id,
        name: orderItem.product.name,
        sku: orderItem.product.sku,
        basePrice: Number(orderItem.product.basePrice),
      },
      variantId: orderItem.variant_id,
      variant: orderItem.variant ? {
        id: orderItem.variant.id,
        name: orderItem.variant.name,
        price: Number(orderItem.variant.price),
        sku: orderItem.variant.sku,
      } : null,
      quantity: orderItem.quantity,
      price: Number(orderItem.price),
      discount: Number(orderItem.discount),
      modifierId: orderItem.modifier_id,
      modifier: orderItem.modifier ? {
        id: orderItem.modifier.id,
        name: orderItem.modifier.name,
        priceDelta: Number(orderItem.modifier.priceDelta),
      } : null,
      notes: orderItem.notes,
      status: orderItem.status,
      createdAt: orderItem.created_at,
      updatedAt: orderItem.updated_at,
    };
  }
}
