import React, { useState } from 'react';
import { Transaction, CATEGORIES, TransactionType } from '../types';
import { categorizeTransactions, isRateLimitError } from '../services/geminiService';
import { Search, Filter, Upload, Loader2, Save, AlertTriangle } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, setTransactions }) => {
  const [filter, setFilter] = useState('');
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newTransactions: Transaction[] = [];
      
      // Simple CSV Parse (assuming header: Date, Description, Amount)
      lines.slice(1).forEach((line, idx) => {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const amount = parseFloat(parts[2]);
          if (!isNaN(amount)) {
            newTransactions.push({
              id: Date.now().toString() + idx,
              date: parts[0]?.trim() || new Date().toISOString().split('T')[0],
              description: parts[1]?.trim() || 'Unknown',
              amount: Math.abs(amount),
              type: amount < 0 ? TransactionType.EXPENSE : TransactionType.INCOME,
              category: 'Uncategorized'
            });
          }
        }
      });
      setTransactions(prev => [...prev, ...newTransactions]);
    };
    reader.readAsText(file);
  };

  const runAutoCategorization = async () => {
    const uncategorized = transactions.filter(t => t.category === 'Uncategorized' || !t.category);
    if (uncategorized.length === 0) return;

    setIsAutoCategorizing(true);
    setErrorMsg(null);
    try {
      const results = await categorizeTransactions(uncategorized);
      setTransactions(prev => prev.map(t => {
        const match = results.find(r => r.id === t.id);
        if (match) {
          return { ...t, category: match.category, isAnomaly: match.isAnomaly };
        }
        return t;
      }));
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT' || isRateLimitError(e)) {
        setErrorMsg("Quota exceeded. Please wait a minute.");
      } else {
        setErrorMsg("Failed to categorize. Try again later.");
      }
    } finally {
      setIsAutoCategorizing(false);
    }
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: newCategory } : t));
    setEditingId(null);
  };

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(filter.toLowerCase()) || 
    t.category.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-800">Transactions</h2>
           <p className="text-slate-500 text-sm">Manage and categorize your spending</p>
        </div>
        
        <div className="flex gap-2 items-center">
            {errorMsg && (
              <div className="text-amber-600 text-xs flex items-center gap-1 bg-amber-50 px-2 py-1 rounded">
                <AlertTriangle size={12} /> {errorMsg}
              </div>
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition">
              <Upload size={16} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Import CSV</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            
            <button 
              onClick={runAutoCategorization}
              disabled={isAutoCategorizing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isAutoCategorizing ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
              <span className="text-sm font-medium">Auto-Categorize with Gemini</span>
            </button>
        </div>
      </div>

      <div className="p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="relative max-w-md">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Search transactions..."
             value={filter}
             onChange={(e) => setFilter(e.target.value)}
             className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
           />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-slate-50 transition group">
                <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{t.date}</td>
                <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                  {t.description}
                  {t.isAnomaly && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Anomaly</span>}
                </td>
                <td className="px-6 py-4 text-sm">
                  {editingId === t.id ? (
                    <select 
                      autoFocus
                      className="border border-blue-300 rounded px-2 py-1 text-sm outline-none"
                      value={t.category}
                      onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <span 
                      onClick={() => setEditingId(t.id)}
                      className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs cursor-pointer hover:bg-slate-200"
                    >
                      {t.category}
                    </span>
                  )}
                </td>
                <td className={`px-6 py-4 text-sm text-right font-bold ${t.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-800'}`}>
                  {t.type === TransactionType.INCOME ? '+' : '-'}${t.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  No transactions found. Try importing a CSV.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};