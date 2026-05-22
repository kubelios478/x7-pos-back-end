import { Shift } from '../shifts/entities/shift.entity';

export interface RequestWithActiveShift extends Request {
  user: any;
  activeShift: Shift;
}
