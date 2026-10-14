import { CalculatorMode } from './calculator.model';

/** Một bản ghi lịch sử phép tính. */
export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
  mode?: CalculatorMode;
  tags?: string[];
  note?: string;
}