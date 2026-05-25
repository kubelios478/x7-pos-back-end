import { SettlementStatus } from '../constants/settlement-status.enum';
export class QueryTipSettlementReportDto {
  merchantId: number;

  collaboratorId?: number;

  shiftId?: number;

  startDate?: string;

  endDate?: string;

  status?: SettlementStatus;
}
