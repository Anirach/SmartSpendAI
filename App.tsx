import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { ChatBot } from './components/ChatBot';
import { AppView, Transaction, TransactionType } from './types';

// Dummy Initial Data
const INITIAL_DATA: Transaction[] = [
  { id: '1', date: '2023-11-01', description: 'Salary Deposit', amount: 4500, type: TransactionType.INCOME, category: 'Income' },
  { id: '2', date: '2023-11-03', description: 'Whole Foods Market', amount: 124.50, type: TransactionType.EXPENSE, category: 'Food & Dining' },
  { id: '3', date: '2023-11-05', description: 'Uber Trip', amount: 24.00, type: TransactionType.EXPENSE, category: 'Transportation' },
  { id: '4', date: '2023-11-05', description: 'Netflix Subscription', amount: 15.99, type: TransactionType.EXPENSE, category: 'Entertainment' },
  { id: '5', date: '2023-11-07', description: 'Electric Bill', amount: 145.20, type: TransactionType.EXPENSE, category: 'Utilities' },
  { id: '6', date: '2023-11-10', description: 'Luxury Bag Store', amount: 2500.00, type: TransactionType.EXPENSE, category: 'Shopping', isAnomaly: true },
  { id: '7', date: '2023-11-12', description: 'Coffee Shop', amount: 6.50, type: TransactionType.EXPENSE, category: 'Food & Dining' },
  { id: '8', date: '2023-11-15', description: 'Rent Payment', amount: 1800.00, type: TransactionType.EXPENSE, category: 'Housing' },
  { id: '9', date: '2023-11-16', description: 'Unknown Charge 9928', amount: 49.99, type: TransactionType.EXPENSE, category: 'Uncategorized' },
];

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    // Load from local storage if available
    const saved = localStorage.getItem('smartspend_transactions');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });

  useEffect(() => {
    localStorage.setItem('smartspend_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard transactions={transactions} />;
      case AppView.TRANSACTIONS:
        return <TransactionList transactions={transactions} setTransactions={setTransactions} />;
      case AppView.CHAT:
        return <ChatBot />;
      default:
        return <Dashboard transactions={transactions} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Simple Mobile/Desktop consistent header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {currentView === AppView.CHAT ? 'Financial Assistant' : currentView.toLowerCase()}
          </h2>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800">Welcome User</p>
              <p className="text-xs text-slate-500">Personal Plan</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm">
              U
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-auto p-8 relative">
          <div className="max-w-7xl mx-auto h-full">
            {renderView()}
          </div>
        </div>
      </main>
    </div>
  );
}
