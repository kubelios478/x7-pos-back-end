import { CashShiftStatus } from '../constants/cash-shift-status.enum';

export class CashShiftResponseDto {
  id: number;
  merchantId: number;
  cashDrawerId: number;
  openedBy: number;
  closedBy: number | null;
  openingBalance: number;
  systemAmount: number | null;
  declaredAmount: number | null;
  difference: number | null;
  status: CashShiftStatus;
  openedAt: Date;
  closedAt: Date | null;
  salesSummary?: { method: string; amount: number }[];
}

export class OneCashShiftResponseDto {
  statusCode: number;
  message: string;
  data: CashShiftResponseDto;
}

export class AllCashShiftsResponseDto {
  statusCode: number;
  message: string;
  data: CashShiftResponseDto[];
}
