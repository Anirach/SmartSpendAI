import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Transaction, TransactionType } from '../types';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Sparkles, AlertTriangle, Clock } from 'lucide-react';
import { getSpendingInsights, isRateLimitError } from '../services/geminiService';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A284F6', '#F56E99', '#4ECDC4'];

export const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [insightError, setInsightError] = useState<boolean>(false);
  const [isRateLimit, setIsRateLimit] = useState<boolean>(false);

  // Memoize calculations
  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === TransactionType.EXPENSE);
    const catMap = new Map<string, number>();
    expenses.forEach(t => {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    });
    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [transactions]);

  const monthlyData = useMemo(() => {
     // Simplified for demo: Group by simple date string
     const data = new Map<string, {income: number, expense: number}>();
     transactions.forEach(t => {
         const date = new Date(t.date);
         const key = `${date.toLocaleString('default', { month: 'short' })}`;
         if (!data.has(key)) data.set(key, { income: 0, expense: 0 });
         const entry = data.get(key)!;
         if (t.type === TransactionType.INCOME) entry.income += t.amount;
         else entry.expense += t.amount;
     });
     return Array.from(data.entries()).map(([name, vals]) => ({ name, ...vals })).reverse();
  }, [transactions]);

  const anomalies = useMemo(() => transactions.filter(t => t.isAnomaly), [transactions]);

  const handleGenerateInsights = async () => {
    setLoadingInsight(true);
    setInsightError(false);
    setIsRateLimit(false);
    setInsight(null);
    
    try {
      const result = await getSpendingInsights(transactions);
      setInsight(result);
    } catch (e: any) {
      setInsightError(true);
      if (e.message === 'RATE_LIMIT' || isRateLimitError(e)) {
        setIsRateLimit(true);
        setInsight("System is currently busy. Please wait a minute and try again.");
      } else {
        setInsight("Unable to generate insights at the moment. Please try again later.");
      }
    } finally {
      setLoadingInsight(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Balance</h3>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-full"><TrendingUp size={16}/></span>
          </div>
          <p className="text-3xl font-bold text-slate-800">${summary.balance.toFixed(2)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Income</h3>
            <span className="p-2 bg-green-50 text-green-600 rounded-full"><TrendingUp size={16}/></span>
          </div>
          <p className="text-3xl font-bold text-green-600">+${summary.income.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Expenses</h3>
            <span className="p-2 bg-red-50 text-red-600 rounded-full"><TrendingDown size={16}/></span>
          </div>
          <p className="text-3xl font-bold text-red-600">-${summary.expense.toFixed(2)}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Spending Breakdown Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 min-w-0">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Spending Analysis</h2>
          {/* Explicit sizing to prevent Recharts width/height warning */}
          <div className="h-64 w-full relative" style={{ minHeight: '256px', minWidth: '0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="income" fill="#4ade80" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-w-0">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Categories</h2>
          <div className="h-64 w-full relative" style={{ minHeight: '256px', minWidth: '0' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-slate-400 text-sm">Distribution</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
            {categoryData.slice(0, 5).map((item, idx) => (
               <div key={item.name} className="flex justify-between items-center text-sm">
                 <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span className="text-slate-600">{item.name}</span>
                 </div>
                 <span className="font-semibold text-slate-800">${item.value.toFixed(0)}</span>
               </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         {/* Anomaly Detection */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">Anomalies Detected</h2>
              <AlertCircle className="text-amber-500" size={20} />
            </div>
            {anomalies.length === 0 ? (
              <div className="text-slate-400 text-center py-8">No unusual transactions detected.</div>
            ) : (
              <div className="space-y-3">
                {anomalies.map(t => (
                  <div key={t.id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="text-sm font-semibold text-amber-900">{t.description}</div>
                      <div className="text-xs text-amber-600">{t.date}</div>
                    </div>
                    <div className="font-bold text-amber-700">-${t.amount}</div>
                  </div>
                ))}
              </div>
            )}
         </div>

         {/* Smart Insights */}
         <div className={`bg-gradient-to-br p-6 rounded-2xl shadow-lg text-white lg:col-span-2 ${
           isRateLimit ? 'from-amber-500 to-orange-600' : 
           insightError ? 'from-red-500 to-pink-600' : 
           'from-indigo-600 to-purple-700'
         }`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {isRateLimit ? <Clock size={20} className="text-white" /> :
                 insightError ? <AlertTriangle size={20} className="text-yellow-300" /> : 
                 <Sparkles size={20} className="text-yellow-300" />}
                Gemini Insights
              </h2>
              <button 
                onClick={handleGenerateInsights}
                disabled={loadingInsight}
                className="bg-white/20 hover:bg-white/30 transition text-white px-3 py-1 rounded-md text-sm flex items-center gap-2"
              >
                {loadingInsight ? <RefreshCw className="animate-spin" size={14}/> : <RefreshCw size={14}/>}
                Analyze
              </button>
            </div>
            
            <div className="min-h-[100px] bg-white/10 rounded-xl p-4 backdrop-blur-sm">
               {loadingInsight ? (
                 <div className="animate-pulse space-y-3">
                   <div className="h-4 bg-white/20 rounded w-3/4"></div>
                   <div className="h-4 bg-white/20 rounded w-1/2"></div>
                   <div className="h-4 bg-white/20 rounded w-full"></div>
                 </div>
               ) : insight ? (
                 <div className="prose prose-invert prose-sm">
                   <p className="whitespace-pre-line leading-relaxed">{insight}</p>
                 </div>
               ) : (
                 <p className="text-white/70 italic text-center py-4">Click 'Analyze' to generate AI-powered insights about your spending habits.</p>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};