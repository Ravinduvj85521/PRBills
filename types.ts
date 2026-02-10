export type BillStatus = 'paid' | 'unpaid';

export interface BillData {
  billName: string;
  dateOfPeriod: string;
  dueDate?: string;
  amount: number;
  currency: string;
  summary?: string;
}

export interface BillRecord extends BillData {
  id: string;
  createdAt: number;
  status: BillStatus;
}

export interface ExtractionResult {
  data?: BillData;
  error?: string;
}