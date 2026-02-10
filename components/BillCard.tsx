import React from 'react';
import { BillRecord } from '../types';
import { ArrowLeft, CheckCircle2, Trash2, XCircle } from 'lucide-react';

interface BillCardProps {
  data: BillRecord;
  onBack: () => void;
  onToggleStatus: (id: string, currentStatus: 'paid' | 'unpaid') => void;
  onDelete: (id: string) => void;
}

export const BillCard: React.FC<BillCardProps> = ({ data, onBack, onToggleStatus, onDelete }) => {
  const isPaid = data.status === 'paid';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center text-sm font-medium text-slate-400 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </button>

        <button 
          onClick={() => onDelete(data.id)}
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
          title="Delete Bill"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white relative">
        {/* Status Badge */}
        <div className="flex justify-center mb-6">
          <button
            onClick={() => onToggleStatus(data.id, data.status)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${
              isPaid 
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {isPaid ? 'Paid' : 'Mark as Paid'}
          </button>
        </div>

        <div className="text-center mb-10">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
            Total Charges
          </p>
          <h2 className={`text-6xl font-bold tracking-tighter transition-colors duration-300 ${isPaid ? 'text-emerald-600' : 'text-slate-900'}`}>
            {data.currency}{data.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-slate-500">Biller</span>
            <span className="font-semibold text-slate-900">{data.billName}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-slate-500">Period</span>
            <span className="font-medium text-slate-900">{data.dateOfPeriod}</span>
          </div>

          {data.summary && (
            <div className="pt-2 text-center">
              <p className="text-sm text-slate-500 leading-relaxed italic">
                {data.summary}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};