import React, { useMemo } from 'react';
import { BillRecord } from '../types';
import { SearchX, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface BillHistoryProps {
  bills: BillRecord[];
  onSelectBill: (bill: BillRecord) => void;
  groupByBiller?: boolean;
}

export const BillHistory: React.FC<BillHistoryProps> = ({ bills, onSelectBill, groupByBiller = false }) => {
  
  // Helper to format period as "ShortMonth Year" (e.g., "Oct 2023")
  // MUST MATCH App.tsx logic exactly for filtering to work visually
  const formatPeriod = (bill: BillRecord): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const text = `${bill.dateOfPeriod} ${bill.dueDate || ''}`;

    // 1. Numeric Date Pattern (e.g. 15/10/2023 for SL Telecom)
    const numericMatch = bill.dateOfPeriod.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (numericMatch) {
        const p2 = parseInt(numericMatch[2]);
        const p3 = parseInt(numericMatch[3]); // Year
        // Assuming DD/MM/YYYY
        if (p2 >= 1 && p2 <= 12) {
             return `${months[p2 - 1]} ${p3}`;
        }
    }

    // 2. Text Search for Month + Year
    const yearMatch = text.match(/20[2-3]\d/); 
    const year = yearMatch ? yearMatch[0] : new Date(bill.createdAt).getFullYear().toString();
    
    // Match full or short month names
    const monthMatch = text.match(new RegExp(`(${months.join('|')}|January|February|March|April|May|June|July|August|September|October|November|December)`, 'i'));
    
    if (monthMatch) {
      // Extract first 3 chars to get short month (e.g. Oct from October)
      const shortMonth = monthMatch[0].substring(0, 3); 
      // Normalize to title case 'Jan'
      const normalized = shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1).toLowerCase();
      // Verify it is a valid month
      if (months.includes(normalized)) {
          return `${normalized} ${year}`;
      }
    }

    // 3. Fallback: Parse dateOfPeriod as a standard date
    const dateAttempt = new Date(bill.dateOfPeriod);
    if (!isNaN(dateAttempt.getTime()) && dateAttempt.getFullYear() > 2000) {
       return dateAttempt.toLocaleString('default', { month: 'short', year: 'numeric' });
    }

    // 4. Ultimate fallback to createdAt
    return new Date(bill.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  const groupedBills = useMemo(() => {
    if (!groupByBiller) return null;

    // Grouping logic
    const groups: Record<string, BillRecord[]> = {};
    bills.forEach(bill => {
      const name = bill.billName || 'Unknown';
      if (!groups[name]) groups[name] = [];
      groups[name].push(bill);
    });

    // Convert to array and sort by latest bill in group
    return Object.entries(groups)
      .map(([name, items]) => ({
        name,
        items,
        total: items.reduce((sum, item) => sum + item.amount, 0),
        latest: Math.max(...items.map(i => i.createdAt || 0))
      }))
      .sort((a, b) => b.latest - a.latest);
  }, [bills, groupByBiller]);

  if (bills.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 mb-3">
          <SearchX className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500">No bills found</p>
      </div>
    );
  }

  const getRef = (id: string) => `#${id.slice(0, 8).toUpperCase()}`;

  // Sub-component for a Row (to avoid duplication)
  const BillRow = ({ bill, showBillerName = true }: { bill: BillRecord, showBillerName?: boolean }) => (
    <tr 
      onClick={() => onSelectBill(bill)}
      className="group hover:bg-slate-50/80 transition-colors cursor-pointer border-b border-slate-50 last:border-0"
    >
      <td className="px-6 py-4 font-mono text-xs text-slate-400 group-hover:text-indigo-500 transition-colors w-24">
        {getRef(bill.id)}
      </td>
      {showBillerName && (
        <td className="px-6 py-4 font-medium text-slate-900">
            <div className="flex flex-col">
            <span>{bill.billName}</span>
            {bill.summary && <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{bill.summary}</span>}
            </div>
        </td>
      )}
      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
        {formatPeriod(bill)}
      </td>
      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
        {bill.dueDate || <span className="text-slate-300">-</span>}
      </td>
      <td className="px-6 py-4 font-semibold text-slate-900 text-right whitespace-nowrap">
        {bill.currency}{bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      <td className="px-6 py-4 text-center w-32">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          bill.status === 'paid' 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
            : 'bg-amber-50 text-amber-700 border border-amber-100'
        }`}>
          {bill.status === 'paid' ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> Paid
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3" /> Unpaid
            </>
          )}
        </span>
      </td>
      <td className="px-6 py-4 text-right w-12">
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
      </td>
    </tr>
  );

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {groupByBiller ? 'Grouped by Biller' : 'Recent Bills'}
        </h3>
        <span className="text-xs font-medium text-slate-400">{bills.length} total</span>
      </div>
      
      {groupByBiller && groupedBills ? (
          <div className="space-y-6">
              {groupedBills.map((group) => (
                  <div key={group.name} className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                      <div className="bg-slate-50/50 px-6 py-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800">{group.name}</h4>
                              <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-medium">{group.items.length}</span>
                          </div>
                          <div className="text-sm font-semibold text-slate-600">
                              Total: <span className="text-slate-900">${group.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-slate-50/30 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold w-24">Ref</th>
                                    <th className="px-6 py-3 font-semibold">Period</th>
                                    <th className="px-6 py-3 font-semibold">Due Date</th>
                                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                                    <th className="px-6 py-3 font-semibold text-center w-32">Status</th>
                                    <th className="px-6 py-3 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {group.items.map(bill => (
                                    <BillRow key={bill.id} bill={bill} showBillerName={false} />
                                ))}
                            </tbody>
                        </table>
                      </div>
                  </div>
              ))}
          </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider w-24">Ref Number</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Biller Name</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Period</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Total Charges</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center w-32">Status</th>
                    <th className="px-6 py-4 font-semibold text-slate-500 text-xs uppercase tracking-wider w-12"></th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {bills.map((bill) => (
                    <BillRow key={bill.id} bill={bill} showBillerName={true} />
                ))}
                </tbody>
            </table>
            </div>
        </div>
      )}
    </div>
  );
};