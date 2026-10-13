//src/commerce/delivery-system/delivery-assignment/constants/assignment-type.enum.ts
//
// Reparto híbrido: con repartidor propio o subcontratado a un DSP (Delivery Service Provider).
export enum AssignmentType {
  IN_HOUSE = 'in_house',
  DOORDASH_DRIVE = 'doordash_drive',
  UBER_DIRECT = 'uber_direct',
}

export const DSP_ASSIGNMENT_TYPES: readonly AssignmentType[] = [
  AssignmentType.DOORDASH_DRIVE,
  AssignmentType.UBER_DIRECT,
];

export const isDspAssignment = (type: AssignmentType): boolean =>
  DSP_ASSIGNMENT_TYPES.includes(type);
