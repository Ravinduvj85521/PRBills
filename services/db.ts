import { supabase } from './supabaseClient';
import { BillRecord, BillData } from '../types';

// Helper to map DB snake_case to App camelCase
const mapRowToRecord = (row: any): BillRecord => ({
  id: row.id,
  billName: row.bill_name,
  dateOfPeriod: row.date_of_period,
  dueDate: row.due_date, // Map new column
  amount: Number(row.amount),
  currency: row.currency,
  summary: row.summary,
  status: row.status as 'paid' | 'unpaid',
  createdAt: new Date(row.created_at).getTime(),
});

export const saveBill = async (data: BillData): Promise<BillRecord> => {
  const { data: insertedData, error } = await supabase
    .from('bills')
    .insert({
      bill_name: data.billName,
      date_of_period: data.dateOfPeriod,
      due_date: data.dueDate, // Insert new column
      amount: data.amount,
      currency: data.currency,
      summary: data.summary,
      status: 'unpaid',
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error(error.message);
  }

  return mapRowToRecord(insertedData);
};

export const getBills = async (): Promise<BillRecord[]> => {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase select error:", error);
    throw new Error(error.message);
  }

  return (data || []).map(mapRowToRecord);
};

export const updateBillStatus = async (id: string, status: 'paid' | 'unpaid'): Promise<void> => {
  const { error } = await supabase
    .from('bills')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error("Supabase update error:", error);
    throw new Error(error.message);
  }
};

export const deleteBill = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('bills')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Supabase delete error:", error);
    throw new Error(error.message);
  }
};