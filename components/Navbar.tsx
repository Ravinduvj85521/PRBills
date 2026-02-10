import React, { useState, useEffect } from 'react';
import { Receipt, LayoutList, Upload, PieChart, Download } from 'lucide-react';

interface NavbarProps {
  activeTab: 'bills' | 'upload' | 'report';
  onTabChange: (tab: 'bills' | 'upload' | 'report') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onTabChange }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
  };

  const navItems = [
    { id: 'bills', label: 'Bills', icon: LayoutList },
    { id: 'upload', label: 'Upload Bills', icon: Upload },
    { id: 'report', label: 'Report', icon: PieChart },
  ] as const;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 h-16 flex items-center justify-between">
      <div 
        className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => onTabChange('bills')}
      >
        {/* <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 shadow-indigo-200 shadow-sm"> */}
          {/* <Receipt className="w-5 h-5 text-white" /> */}
        {/* </div> */}
        <img src="/logo.png" alt="" className='w-16 h-16' />
        <span className="font-bold text-lg tracking-tight text-slate-900">PR Bills</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Install Button - Only shows if PWA is installable */}
        {deferredPrompt && (
            <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all animate-in fade-in zoom-in duration-300"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Install App</span>
            </button>
        )}

        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl">
            {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
                <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                </button>
            )
            })}
        </div>
      </div>
    </nav>
  );
};