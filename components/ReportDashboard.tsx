import React, { useState, useMemo } from 'react';
import { BillRecord } from '../types';
import { TrendingUp, BarChart3, PieChart as PieIcon, LineChart as LineIcon, Filter, Calendar, Building2 } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface ReportDashboardProps {
  bills: BillRecord[];
}

type ChartType = 'line' | 'bar' | 'pie';
type GroupByType = 'period' | 'biller';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// Helper for month sorting
const MONTH_ORDER: Record<string, number> = {
  'jan': 0, 'january': 0,
  'feb': 1, 'february': 1,
  'mar': 2, 'march': 2,
  'apr': 3, 'april': 3,
  'may': 4,
  'jun': 5, 'june': 5,
  'jul': 6, 'july': 6,
  'aug': 7, 'august': 7,
  'sep': 8, 'september': 8,
  'oct': 9, 'october': 9,
  'nov': 10, 'november': 10,
  'dec': 11, 'december': 11
};

export const ReportDashboard: React.FC<ReportDashboardProps> = ({ bills }) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedBiller, setSelectedBiller] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<GroupByType>('period');

  // --- Helpers ---
  const getYearFromPeriod = (period: string) => {
    const match = period.match(/20\d{2}/);
    return match ? match[0] : 'Unknown';
  };

  const getMonthFromPeriod = (period: string) => {
    // Extract text part "October 2023" -> "October"
    return period.replace(/[^a-zA-Z]/g, '').toLowerCase();
  };

  // --- Derived Lists for Dropdowns ---
  const { uniqueBillers, uniqueYears } = useMemo(() => {
    const billers = new Set<string>();
    const years = new Set<string>();

    bills.forEach(b => {
      if (b.billName) billers.add(b.billName);
      if (b.dateOfPeriod) years.add(getYearFromPeriod(b.dateOfPeriod));
    });

    return {
      uniqueBillers: Array.from(billers).sort(),
      uniqueYears: Array.from(years).sort((a, b) => b.localeCompare(a)) // Descending years
    };
  }, [bills]);

  // --- Data Processing ---
  const chartData = useMemo(() => {
    // 1. Filter Data
    const filtered = bills.filter(bill => {
      const billYear = getYearFromPeriod(bill.dateOfPeriod || '');
      const matchBiller = selectedBiller === 'all' || bill.billName === selectedBiller;
      const matchYear = selectedYear === 'all' || billYear === selectedYear;
      return matchBiller && matchYear;
    });

    // 2. Determine Grouping Key
    // If a specific biller is selected, we force grouping by 'period' to show timeline
    const effectiveGroupBy = selectedBiller !== 'all' ? 'period' : groupBy;

    const grouped = filtered.reduce((acc, bill) => {
      let key = 'Unknown';
      
      if (effectiveGroupBy === 'period') {
        // If viewing a specific year, just show Month Name (e.g. "October")
        // If viewing All Years, show "October 2023"
        if (selectedYear !== 'all') {
            // Try to extract just the month part for cleaner x-axis
            const parts = bill.dateOfPeriod.split(' ');
            key = parts[0] || bill.dateOfPeriod;
        } else {
            key = bill.dateOfPeriod || 'Unknown';
        }
      } else {
        key = bill.billName || 'Unknown';
      }
      
      if (!acc[key]) acc[key] = 0;
      acc[key] += bill.amount;
      return acc;
    }, {} as Record<string, number>);

    const result = Object.entries(grouped).map(([name, value]) => ({ name, value }));

    // 3. Sorting
    if (effectiveGroupBy === 'period') {
        result.sort((a, b) => {
            if (selectedYear !== 'all') {
                // Sort by Month Index (Jan -> Dec)
                const monthA = getMonthFromPeriod(a.name);
                const monthB = getMonthFromPeriod(b.name);
                return (MONTH_ORDER[monthA] ?? 99) - (MONTH_ORDER[monthB] ?? 99);
            } else {
                // Sort by Full Date
                const dateA = new Date(a.name);
                const dateB = new Date(b.name);
                if (isNaN(dateA.getTime())) return 1;
                if (isNaN(dateB.getTime())) return -1;
                return dateA.getTime() - dateB.getTime();
            }
        });
    } else {
        // Sort by highest amount
        result.sort((a, b) => b.value - a.value);
    }
    
    return result;
  }, [bills, selectedBiller, selectedYear, groupBy]);


  // --- Custom Tooltip ---
  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg z-50">
          <p className="text-xs font-semibold text-slate-700 mb-1">{label || payload[0].name}</p>
          <p className="text-sm font-bold text-indigo-600">
            Rs. {Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* Filters Section */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3" /> Filters
            </span>

            {/* Biller Select */}
            <div className="relative group">
                <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                <select
                    value={selectedBiller}
                    onChange={(e) => setSelectedBiller(e.target.value)}
                    className="appearance-none pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-slate-100 transition-colors cursor-pointer min-w-[140px]"
                >
                    <option value="all">All Billers</option>
                    {uniqueBillers.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
            </div>

            {/* Year Select */}
            <div className="relative group">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors pointer-events-none" />
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="appearance-none pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                    <option value="all">All Years</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>

        <div className="flex gap-3 items-center w-full md:w-auto justify-end">
             {/* Group By (Only show if viewing All Billers) */}
            {selectedBiller === 'all' && (
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setGroupBy('period')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            groupBy === 'period' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        By Time
                    </button>
                    <button 
                        onClick={() => setGroupBy('biller')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                            groupBy === 'biller' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        By Biller
                    </button>
                </div>
            )}

            {/* Chart Type Selector */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setChartType('line')} className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Line Chart"><LineIcon className="w-4 h-4" /></button>
                <button onClick={() => setChartType('bar')} className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Bar Chart"><BarChart3 className="w-4 h-4" /></button>
                <button onClick={() => setChartType('pie')} className={`p-1.5 rounded-md transition-all ${chartType === 'pie' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`} title="Pie Chart"><PieIcon className="w-4 h-4" /></button>
            </div>
        </div>

      </div>

      {/* Chart Display */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 relative">
        <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            {selectedBiller !== 'all' ? `${selectedBiller} Analysis` : 'Total Spending'}
            {selectedYear !== 'all' && <span className="text-slate-400 font-normal text-sm">({selectedYear})</span>}
        </h3>

        <div className="h-80 w-full">
            {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => `${val}`}
                            />
                            <Tooltip content={renderTooltip} />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#6366f1" 
                                strokeWidth={3} 
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 4, stroke: '#fff' }} 
                                activeDot={{ r: 6 }} 
                                name="Amount"
                            />
                        </LineChart>
                    ) : chartType === 'bar' ? (
                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10}
                            />
                            <YAxis 
                                tick={{fontSize: 12, fill: '#64748b'}} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => `${val}`}
                            />
                            <Tooltip content={renderTooltip} cursor={{fill: '#f1f5f9'}} />
                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Amount">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    ) : (
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                                nameKey="name"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={renderTooltip} />
                            <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '12px', color: '#64748b'}} />
                        </PieChart>
                    )}
                </ResponsiveContainer>
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                    <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">No data matching filters</p>
                </div>
            )}
        </div>
      </div>

      {/* High Value List */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            Top Bills <span className="text-slate-400 font-normal text-sm ml-1">(Based on current filter)</span>
          </h3>
          <div className="space-y-1">
             {bills
                .filter(b => (selectedBiller === 'all' || b.billName === selectedBiller) && 
                             (selectedYear === 'all' || getYearFromPeriod(b.dateOfPeriod) === selectedYear))
                .sort((a,b) => b.amount - a.amount)
                .slice(0, 5)
                .map(bill => (
                 <div key={bill.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 px-2 rounded-lg transition-colors">
                     <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700">{bill.billName}</span>
                        <span className="text-[10px] text-slate-400">{bill.dateOfPeriod}</span>
                     </div>
                     <span className="text-sm font-bold text-slate-900">Rs. {bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                 </div>
             ))}
             {chartData.length === 0 && <p className="text-sm text-slate-400 italic py-4 text-center">No data available</p>}
          </div>
      </div>
    </div>
  );
};