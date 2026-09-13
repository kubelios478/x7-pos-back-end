import { Repository } from 'typeorm';
import { LoyaltyTier } from './entities/loyalty-tier.entity';
import { LoyaltyTierBenefit } from './constants/loyalty-tier-benefit.enum';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';

interface TierSeed {
  name: string;
  level: number;
  min_points: number;
  multiplier: number;
  benefits: LoyaltyTierBenefit[];
}

export const DEFAULT_PROGRAM_TIERS: TierSeed[] = [
  {
    name: 'Base',
    level: 1,
    min_points: 0,
    multiplier: 1.0,
    benefits: [],
  },
];

export async function findOrCreateAvailableTier(
  loyaltyProgramId: number,
  merchantId: number,
  tierRepo: Repository<LoyaltyTier>,
): Promise<LoyaltyTier> {
  // To find the base level (the one with the fewest points) for this program in the new system, the base level will be the one with level >= 11 or the one with the fewest points
  const baseTier = await tierRepo.findOne({
    where: {
      loyalty_program_id: loyaltyProgramId,
      is_active: true,
    },
    order: { min_points: 'ASC' },
  });

  if (baseTier) {
    return baseTier;
  }

  // If for some reason it does not exist, we create the default ("Level 1")
  const defaultData = DEFAULT_PROGRAM_TIERS[0];
  const tier = tierRepo.create({
    ...defaultData,
    loyalty_program_id: loyaltyProgramId,
    is_active: true,
  });

  return tierRepo.save(tier);
}

/**
 * Recalculates the levels of all active tiers in a program.
 * Sorts by min_points DESC → the one with the most points receives level 1 (best),
 * and so on. The merchant defines the names; the system only
 * assigns the level number based on the minimum points.
 */
export async function recalculateProgramLevels(
  loyaltyProgramId: number,
  tierRepo: Repository<LoyaltyTier>,
): Promise<void> {
  const tiers = await tierRepo.find({
    where: {
      loyalty_program_id: loyaltyProgramId,
      is_active: true,
    },
    order: { min_points: 'DESC' },
  });

  console.log(
    `[Recalculate] Program ${loyaltyProgramId}: ${tiers.length} tier(s). Order:`,
    tiers.map((t) => `${t.name}(${t.min_points}pts)`),
  );

  let currentLevel = 0;
  let lastPoints = -1;

  for (const tier of tiers) {
    if (tier.min_points !== lastPoints) {
      currentLevel++;
      lastPoints = tier.min_points;
    }
    tier.level = Math.min(currentLevel, 10);
    await tierRepo.save(tier);
  }
}

/**
 * Evaluates if a loyalty customer should upgrade their tier based on their lifetimePoints.
 */
export async function evaluateTierUpgrade(
  loyaltyCustomer: LoyaltyCustomer,
  tierRepo: Repository<LoyaltyTier>,
): Promise<LoyaltyTier | null> {
  const programId =
    loyaltyCustomer.loyaltyProgramId ||
    (loyaltyCustomer.loyaltyProgram ? loyaltyCustomer.loyaltyProgram.id : null);

  if (!programId) {
    console.error(
      'Upgrade Error: No program ID found for customer',
      loyaltyCustomer.id,
    );
    return null;
  }

  // Retrieve all active tiers of the program, ordered from highest to lowest min_points
  const tiers = await tierRepo.find({
    where: {
      loyalty_program_id: programId,
      is_active: true,
    },
    order: { min_points: 'DESC' },
  });

  console.log(
    `Evaluating upgrade for Customer ${loyaltyCustomer.id}. Points: ${loyaltyCustomer.lifetimePoints}. Current Tier ID: ${loyaltyCustomer.loyaltyTierId}. Found ${tiers.length} tiers in program ${programId}`,
  );

  // Find the tier with the highest threshold that the customer has already exceeded
  const eligibleTier = tiers.find(
    (t) => loyaltyCustomer.lifetimePoints >= t.min_points,
  );

  if (!eligibleTier) {
    console.log(
      'No eligible tier found for points',
      loyaltyCustomer.lifetimePoints,
    );
    return null;
  }

  console.log(
    `Eligible tier found: ${eligibleTier.name} (ID: ${eligibleTier.id}, MinPoints: ${eligibleTier.min_points})`,
  );

  if (!eligibleTier) return null;

  // Only upgrade if the eligible tier differs from the current one.
  if (loyaltyCustomer.loyaltyTierId === eligibleTier.id) return null;

  return eligibleTier;
}
