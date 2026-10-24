import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateOrderDto } from './create-order.dto';
import { UpdateOrderDto } from './update-order.dto';
import { OrderType } from '../constants/order-type.enum';

const base = {
  merchantId: 1,
  collaboratorId: 1,
  subscriptionId: 1,
  customerId: 1,
};

async function tableIdErrors(
  cls: typeof CreateOrderDto | typeof UpdateOrderDto,
  payload: object,
) {
  const errors = await validate(plainToInstance(cls, payload) as object);
  return errors.filter((e) => e.property === 'tableId');
}

describe('CreateOrderDto.tableId', () => {
  it.each([OrderType.TAKE_OUT, OrderType.DELIVERY])(
    'is optional for %s orders',
    async (type) => {
      expect(await tableIdErrors(CreateOrderDto, { ...base, type })).toEqual(
        [],
      );
    },
  );

  it('is required for dine_in orders', async () => {
    const errors = await tableIdErrors(CreateOrderDto, {
      ...base,
      type: OrderType.DINE_IN,
    });
    expect(errors).toHaveLength(1);
  });

  it('is still validated when sent with a take_out order', async () => {
    const errors = await tableIdErrors(CreateOrderDto, {
      ...base,
      type: OrderType.TAKE_OUT,
      tableId: -1,
    });
    expect(errors).toHaveLength(1);
  });

  it('can be omitted or cleared in an update', async () => {
    expect(
      await tableIdErrors(UpdateOrderDto, { type: OrderType.DINE_IN }),
    ).toEqual([]);
    expect(await tableIdErrors(UpdateOrderDto, { tableId: null })).toEqual([]);
  });
});
