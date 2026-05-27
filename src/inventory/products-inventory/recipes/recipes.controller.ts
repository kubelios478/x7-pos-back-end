import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { FeatureAccessGuard } from 'src/auth/guards/feature-access.guard';
import { RequireFeature } from 'src/auth/decorators/require-feature.decorator';
import { SUBSCRIPTION_FEATURE_IDS } from 'src/common/subscription/subscription-feature-ids';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/platform-saas/users/constants/role.enum';
import { Scope } from 'src/platform-saas/users/constants/scope.enum';
import { Scopes } from 'src/auth/decorators/scopes.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from 'src/auth/interfaces/authenticated-user.interface';
import { ErrorResponse } from 'src/common/dtos/error-response.dto';
import { RecipesService } from './recipes.service';
import { UpsertProductRecipeDto } from './dto/upsert-product-recipe.dto';
import { ProductRecipe } from './entities/product-recipe.entity';

@ApiTags('recipes')
@ApiExtraModels(ErrorResponse, UpsertProductRecipeDto)
@ApiBearerAuth()
@Controller('products/:productId/recipes')
@RequireFeature(SUBSCRIPTION_FEATURE_IDS.PRODUCT_MANAGEMENT)
@UseGuards(JwtAuthGuard, RolesGuard, FeatureAccessGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @Roles(UserRole.MERCHANT_ADMIN, UserRole.MERCHANT_USER)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'List product recipes (BOM) for the merchant',
    description:
      'Returns all recipes for the finished product, including lines and cached theoreticalCostCached.',
  })
  @ApiParam({ name: 'productId', type: Number, description: 'Finished product ID' })
  @ApiOkResponse({ type: ProductRecipe, isArray: true })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<ProductRecipe[]> {
    return this.recipesService.findAllForProduct(user.merchant.id, productId);
  }

  @Post()
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Create a recipe with lines (atomic)',
    description:
      'Use POST for the first recipe. Lines use supplyProductId/supplyVariantId and quantityPerSoldUnit per one sold unit. Deduction runs when the order is fully paid.',
  })
  @ApiParam({ name: 'productId', type: Number, description: 'Finished product ID' })
  @ApiBody({ type: UpsertProductRecipeDto })
  @ApiCreatedResponse({ type: ProductRecipe })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpsertProductRecipeDto,
  ): Promise<ProductRecipe> {
    return this.recipesService.create(user.merchant.id, productId, dto);
  }

  @Put(':recipeId')
  @Roles(UserRole.MERCHANT_ADMIN)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({
    summary: 'Replace recipe lines (atomic)',
    description: 'Replaces all lines for an existing recipe. Requires recipeId from GET.',
  })
  @ApiParam({ name: 'productId', type: Number, description: 'Finished product ID' })
  @ApiParam({ name: 'recipeId', type: Number, description: 'Recipe ID' })
  @ApiBody({ type: UpsertProductRecipeDto })
  @ApiOkResponse({ type: ProductRecipe })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
    @Body() dto: UpsertProductRecipeDto,
  ): Promise<ProductRecipe> {
    return this.recipesService.update(
      user.merchant.id,
      productId,
      recipeId,
      dto,
    );
  }

  @Delete(':recipeId')
  @Roles(UserRole.MERCHANT_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Scopes(
    Scope.ADMIN_PORTAL,
    Scope.MERCHANT_WEB,
    Scope.MERCHANT_ANDROID,
    Scope.MERCHANT_IOS,
    Scope.MERCHANT_CLOVER,
  )
  @ApiOperation({ summary: 'Delete a recipe' })
  @ApiParam({ name: 'productId', type: Number, description: 'Finished product ID' })
  @ApiParam({ name: 'recipeId', type: Number, description: 'Recipe ID' })
  @ApiNoContentResponse({ description: 'Recipe deleted' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId', ParseIntPipe) productId: number,
    @Param('recipeId', ParseIntPipe) recipeId: number,
  ): Promise<void> {
    await this.recipesService.remove(user.merchant.id, productId, recipeId);
  }
}
