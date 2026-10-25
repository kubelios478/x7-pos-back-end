import { DataSource } from 'typeorm';
import { RecipesService } from './recipes.service';
import { RecipesV1Controller } from './recipes-v1.controller';
import { RecipeTheoreticalCostService } from './recipe-theoretical-cost.service';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';

// GET /v1/recipes devolvía siempre todas las recetas del comercio con sus líneas.
describe('GET /v1/recipes listing', () => {
  const findAndCount = jest.fn();
  const service = new RecipesService(
    { manager: { findAndCount } } as unknown as DataSource,
    {} as RecipeTheoreticalCostService,
  );
  const controller = new RecipesV1Controller(service);
  const user = { merchant: { id: 7 } } as AuthenticatedUser;
  const recipes = [{ id: 2 }, { id: 1 }];

  beforeEach(() => findAndCount.mockReset());

  it('returns every recipe without page or limit, and no total header', async () => {
    findAndCount.mockResolvedValueOnce([recipes, 2]);
    const res = { setHeader: jest.fn() };

    const result = await controller.findAllForMerchant(user, {}, res as never);

    expect(result).toEqual(recipes);
    const options = findAndCount.mock.calls[0][1] as Record<string, unknown>;
    expect(options).toMatchObject({ where: { merchantId: 7 } });
    expect(options).not.toHaveProperty('take');
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('pages in the database and sends X-Total-Count when asked', async () => {
    findAndCount.mockResolvedValueOnce([recipes, 41]);
    const res = { setHeader: jest.fn() };

    const result = await controller.findAllForMerchant(
      user,
      { page: 2, limit: 20 },
      res as never,
    );

    expect(result).toEqual(recipes);
    expect(findAndCount.mock.calls[0][1]).toMatchObject({
      skip: 20,
      take: 20,
      order: { id: 'DESC' },
    });
    expect(res.setHeader).toHaveBeenCalledWith('X-Total-Count', '41');
  });
});
