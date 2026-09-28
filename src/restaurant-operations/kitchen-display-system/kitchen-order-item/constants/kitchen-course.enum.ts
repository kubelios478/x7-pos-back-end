/**
 * Courses in restaurant dining and kitchen sequencing.
 */
export enum KitchenCourse {
  APPETIZER = 'appetizer',
  MAIN_COURSE = 'main_course',
  DESSERT = 'dessert',
  BEVERAGE = 'beverage',
}

export const KITCHEN_COURSE_SEQUENCE = [
  KitchenCourse.BEVERAGE,
  KitchenCourse.APPETIZER,
  KitchenCourse.MAIN_COURSE,
  KitchenCourse.DESSERT,
] as const;

export function getCourseLabel(course: KitchenCourse): string {
  switch (course) {
    case KitchenCourse.APPETIZER:
      return 'Appetizer';
    case KitchenCourse.MAIN_COURSE:
      return 'Main Course';
    case KitchenCourse.DESSERT:
      return 'Dessert';
    case KitchenCourse.BEVERAGE:
      return 'Beverage';
    default:
      return 'Main Course';
  }
}

/**
 * Calculates dynamic pacing hold time according to ticket priority.
 * Higher priority tickets have accelerated pacing (shorter hold delay).
 */
export function calculatePacingHoldMinutes(
  course: KitchenCourse,
  priority: number = 0,
): { isHeld: boolean; delayMinutes: number } {
  const isEligibleForHold = course === KitchenCourse.MAIN_COURSE || course === KitchenCourse.DESSERT;
  if (!isEligibleForHold) {
    return { isHeld: false, delayMinutes: 0 };
  }

  // VIP Rush (+3 or higher): Direct fire for Main Courses, minimal hold for desserts
  if (priority >= 3) {
    if (course === KitchenCourse.MAIN_COURSE) {
      return { isHeld: false, delayMinutes: 0 };
    }
    return { isHeld: true, delayMinutes: 3 };
  }

  // High (+2): Accelerated pacing (4m mains, 8m desserts)
  if (priority === 2) {
    return { isHeld: true, delayMinutes: course === KitchenCourse.DESSERT ? 8 : 4 };
  }

  // Medium (+1): Moderate pacing (7m mains, 14m desserts)
  if (priority === 1) {
    return { isHeld: true, delayMinutes: course === KitchenCourse.DESSERT ? 14 : 7 };
  }

  // Normal (0 or less): Standard pacing (10m mains, 20m desserts)
  return { isHeld: true, delayMinutes: course === KitchenCourse.DESSERT ? 20 : 10 };
}

