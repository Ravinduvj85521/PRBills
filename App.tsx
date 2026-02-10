import React, { useState, useEffect, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { BillCard } from './components/BillCard';
import { BillHistory } from './components/BillHistory';
import { Navbar } from './components/Navbar';
import { ReportDashboard } from './components/ReportDashboard';
import { extractBillData } from './services/geminiService';
import { saveBill, getBills, updateBillStatus, deleteBill } from './services/db';
import { BillRecord, BillStatus } from './types';
import { Loader2, Database, Copy, Check, Search, AlertTriangle, AlertCircle, Layers, Calendar, ChevronDown } from 'lucide-react';

const SUPABASE_SETUP_SQL = `create table public.bills (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  bill_name text,
  date_of_period text,
  due_date text,
  amount numeric,
  currency text,
  summary text,
  status text
);`;

const SUPABASE_ALTER_SQL = `alter table public.bills add column if not exists due_date text;`;

type FilterStatus = 'all' | 'paid' | 'unpaid';
type ViewType = 'bills' | 'upload' | 'report';

const App: React.FC = () => {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDbMissing, setIsDbMissing] = useState(false);
  const [isSchemaOutdated, setIsSchemaOutdated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Navigation & Filter State
  const [activeTab, setActiveTab] = useState<ViewType>('bills');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [groupByBiller, setGroupByBiller] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>('all');

  // Load bills on mount
  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    try {
      const loadedBills = await getBills();
      setBills(loadedBills);
      setIsDbMissing(false);
    } catch (err: any) {
      console.error("Failed to load bills", err);
      if (err.message && (err.message.includes('Could not find the table') || err.message.includes('relation "public.bills" does not exist'))) {
        setIsDbMissing(true);
      } else if (err.message && (err.message.includes('API Key') || err.message.includes('auth'))) {
         setError("Failed to connect to database. Please check API Key configuration.");
      }
    }
  };

  // Helper to extract "Month Year" from bill data (Standardized Logic)
  const getBillMonthYear = (bill: BillRecord): string => {
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
    
    // 4. Fallback: Upload date
    return new Date(bill.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
  };

  // Derive unique months for the dropdown
  const availableMonths = useMemo(() => {
    const monthSet = new Set(bills.map(getBillMonthYear));
    // Convert to array and sort (descending by date roughly)
    return Array.from(monthSet).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime();
    });
  }, [bills]);

  // Filter Logic
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      const matchesSearch = 
        bill.billName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (bill.summary && bill.summary.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || bill.status === filterStatus;
      
      const matchesMonth = filterMonth === 'all' || getBillMonthYear(bill) === filterMonth;
      
      return matchesSearch && matchesStatus && matchesMonth;
    });
  }, [bills, searchTerm, filterStatus, filterMonth]);

  const handleTabChange = (tab: ViewType) => {
    setActiveTab(tab);
    setSelectedBill(null);
    setError(null);
  };

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64String = reader.result as string;
          const base64Data = base64String.split(',')[1];
          
          if (!base64Data) {
            throw new Error("Failed to read file.");
          }

          const data = await extractBillData(base64Data, file.type);
          
          // Auto-save the bill
          let savedRecord: BillRecord;
          try {
             if (isDbMissing) throw new Error("DB Missing");
             savedRecord = await saveBill(data);
          } catch (dbError: any) {
             console.warn("Failed to save to DB, using local temporary data", dbError);
             
             // Check for specific schema error
             if (dbError.message && (dbError.message.includes('due_date') || dbError.message.includes('column'))) {
                 setIsSchemaOutdated(true);
             }

             savedRecord = {
                 ...data,
                 id: crypto.randomUUID(),
                 createdAt: Date.now(),
                 status: 'unpaid'
             };
          }
          
          setBills(prev => [savedRecord, ...prev]);
          setSelectedBill(savedRecord);
          // If a file is uploaded, we show the details immediately, regardless of tab
          
        } catch (err: any) {
          setError(err.message || "Failed to process.");
        } finally {
          setIsProcessing(false);
        }
      };
      
      reader.onerror = () => {
        setError("Error reading the file.");
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);

    } catch (err: any) {
      setError(err.message || "Error.");
      setIsProcessing(false);
    }
  };

  const handleBack = () => {
    setSelectedBill(null);
    setError(null);
    // If coming back from a new upload, default to the bills list
    if (activeTab === 'upload') {
        setActiveTab('bills');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: BillStatus) => {
    const newStatus: BillStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    
    // Optimistic update
    const updatedBills = bills.map(b => b.id === id ? { ...b, status: newStatus } : b);
    setBills(updatedBills);
    if (selectedBill && selectedBill.id === id) {
      setSelectedBill({ ...selectedBill, status: newStatus });
    }

    try {
      if (!isDbMissing) {
        await updateBillStatus(id, newStatus);
      }
    } catch (err) {
      console.error("Failed to update status in DB", err);
      // Revert if failed
      const revertedBills = bills.map(b => b.id === id ? { ...b, status: currentStatus } : b);
      setBills(revertedBills);
      if (selectedBill && selectedBill.id === id) {
        setSelectedBill({ ...selectedBill, status: currentStatus });
      }
      alert("Failed to update status. Check connection.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;
    
    // Optimistic update
    const prevBills = [...bills];
    setBills(bills.filter(b => b.id !== id));
    if (selectedBill && selectedBill.id === id) {
        setSelectedBill(null);
        if (activeTab === 'upload') setActiveTab('bills');
    }

    try {
      if (!isDbMissing) {
        await deleteBill(id);
      }
    } catch (err) {
      console.error("Failed to delete bill", err);
      setBills(prevBills);
      alert("Failed to delete bill. Check connection.");
    }
  };

  const copySql = (sql: string) => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Navbar activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="flex flex-col items-center p-6 pt-24">
        <div className="w-full max-w-5xl">

          {/* Database Setup Warning (Missing Table) - ALWAYS VISIBLE if missing */}
          {isDbMissing && (
            <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 animate-in fade-in zoom-in duration-300 shadow-sm">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Database Setup Required</h3>
                  <p className="text-xs text-amber-700 mb-3 leading-relaxed">
                    The <code className="font-mono bg-amber-100 px-1 rounded text-amber-900">bills</code> table is missing in Supabase. Data will not persist.
                  </p>
                  <div className="relative group">
                    <pre className="text-[10px] bg-white border border-amber-200 rounded p-3 overflow-x-auto text-slate-600 font-mono leading-relaxed">
                      {SUPABASE_SETUP_SQL}
                    </pre>
                    <button 
                      onClick={() => copySql(SUPABASE_SETUP_SQL)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-500 transition-colors"
                      title="Copy SQL"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schema Update Warning (Missing Column) - ALWAYS VISIBLE if outdated */}
          {isSchemaOutdated && !isDbMissing && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 animate-in fade-in zoom-in duration-300 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Database Update Required</h3>
                  <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                    The <code className="font-mono bg-blue-100 px-1 rounded text-blue-900">due_date</code> column is missing. Run this SQL to fix it:
                  </p>
                  <div className="relative group">
                    <pre className="text-[10px] bg-white border border-blue-200 rounded p-3 overflow-x-auto text-slate-600 font-mono leading-relaxed">
                      {SUPABASE_ALTER_SQL}
                    </pre>
                    <button 
                      onClick={() => copySql(SUPABASE_ALTER_SQL)}
                      className="absolute top-2 right-2 p-1.5 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 text-slate-500 transition-colors"
                      title="Copy SQL"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
               <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Main Content */}
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm font-medium text-slate-500">Analyzing bill details...</p>
            </div>
          ) : selectedBill ? (
            <div className="max-w-md mx-auto">
              <BillCard 
                data={selectedBill} 
                onBack={handleBack} 
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
              />
            </div>
          ) : (
            <>
              {/* UPLOAD VIEW */}
              {activeTab === 'upload' && (
                <div className="max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Upload New Bill</h2>
                  <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                </div>
              )}

              {/* REPORT VIEW */}
              {activeTab === 'report' && (
                <ReportDashboard bills={bills} />
              )}

              {/* BILLS LIST VIEW */}
              {activeTab === 'bills' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Filters & Search */}
                  <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Search bills..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          />
                        </div>

                        {/* Month Filter Dropdown */}
                        <div className="relative w-full sm:w-auto">
                           <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <Calendar className="w-4 h-4 text-slate-400" />
                           </div>
                           <select
                              value={filterMonth}
                              onChange={(e) => setFilterMonth(e.target.value)}
                              className="w-full sm:w-auto appearance-none pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-600 cursor-pointer hover:bg-slate-100"
                           >
                              <option value="all">All Months</option>
                              {availableMonths.map(month => (
                                <option key={month} value={month}>{month}</option>
                              ))}
                           </select>
                           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ChevronDown className="w-3 h-3 text-slate-400" />
                           </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                          onClick={() => setGroupByBiller(!groupByBiller)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                            groupByBiller 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Layers className="w-4 h-4" />
                          <span className="hidden sm:inline">Group</span>
                        </button>

                        <div className="flex p-1 bg-slate-100 rounded-lg">
                          {(['all', 'paid', 'unpaid'] as FilterStatus[]).map((status) => (
                            <button
                              key={status}
                              onClick={() => setFilterStatus(status)}
                              className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all duration-200 ${
                                filterStatus === status 
                                  ? 'bg-white text-slate-900 shadow-sm' 
                                  : 'text-slate-500 hover:text-slate-700'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                    </div>
                  </div>

                  {/* List */}
                  <BillHistory 
                    bills={filteredBills} 
                    onSelectBill={setSelectedBill} 
                    groupByBiller={groupByBiller}
                  />
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default App;