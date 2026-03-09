import React, { useState, useEffect } from 'react';
import { Calendar, Scale, Activity, TrendingDown, TrendingUp, Minus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MetricEntry {
  id: number;
  date: string;
  weight: number;
  bmi: number;
  bodyFat: number;
}

interface HistoryProps {
  darkMode: boolean;
  unit: 'metric' | 'imperial';
  refreshTrigger?: number;
  isLoggedIn: boolean;
}

export default function History({ darkMode, unit, refreshTrigger, isLoggedIn }: HistoryProps) {
  const [history, setHistory] = useState<MetricEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger, isLoggedIn]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      let data: MetricEntry[] = [];
      
      // Always get local history
      const localData = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
      
      if (isLoggedIn) {
        const cloudData = await api.getMetricsHistory();
        // Merge and sort by date descending
        // We use a Map to avoid duplicates if we have IDs
        const merged = [...cloudData, ...localData].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        data = merged;
      } else {
        data = localData.sort((a: any, b: any) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      }
      
      setHistory(data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      // Fallback to local on error
      const localData = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
      setHistory(localData);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLocalHistory = () => {
    if (window.confirm('Are you sure you want to clear your local history? This will not affect your account history.')) {
      localStorage.removeItem('ratbod_history');
      fetchHistory();
    }
  };

  const deleteEntry = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this measurement?')) return;

    try {
      if (isLoggedIn) {
        // Try to delete from cloud first if logged in
        try {
          await api.deleteMetric(id);
        } catch (err) {
          console.error('Failed to delete from cloud, might be a local entry:', err);
        }
      }

      // Also remove from local storage if it exists there
      const localData = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
      const filteredLocal = localData.filter((entry: MetricEntry) => entry.id !== id);
      localStorage.setItem('ratbod_history', JSON.stringify(filteredLocal));

      // Refresh history
      fetchHistory();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete measurement. Please try again.');
    }
  };

  const formatWeight = (kg: number) => {
    if (unit === 'metric') return `${kg.toFixed(1)} kg`;
    return `${(kg * 2.20462).toFixed(1)} lb`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className={cn(
        "p-8 rounded-3xl border border-dashed text-center space-y-3",
        darkMode ? "border-white/10 bg-white/5" : "border-gray-300 bg-gray-50"
      )}>
        <Calendar className="mx-auto text-gray-400" size={32} />
        <p className={cn("text-sm font-medium", darkMode ? "text-gray-400" : "text-gray-500")}>
          No history entries found. Save your first measurement to see it here!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className={cn("text-lg font-bold tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
            Measurement History
          </h3>
          <span className={cn("text-xs font-bold uppercase tracking-widest opacity-40")}>
            {history.length} Entries
          </span>
        </div>
        
        {history.length > 0 && (
          <button
            onClick={clearLocalHistory}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all",
              darkMode ? "bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400" : "bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600"
            )}
          >
            Clear Local
          </button>
        )}
      </div>

      <div className={cn(
        "rounded-3xl border overflow-hidden shadow-sm",
        darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={cn(
                "border-b text-[10px] font-black uppercase tracking-[0.2em]",
                darkMode ? "border-white/5 text-gray-500" : "border-gray-100 text-gray-400"
              )}>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Weight</th>
                <th className="px-6 py-4 text-center">BMI</th>
                <th className="px-6 py-4 text-center">Body Fat</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {history.map((entry, index) => {
                const prevEntry = history[index + 1];
                const weightDiff = prevEntry ? entry.weight - prevEntry.weight : 0;
                const displayDiff = unit === 'metric' ? weightDiff : weightDiff * 2.20462;

                return (
                  <motion.tr 
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "group transition-colors",
                      darkMode ? "hover:bg-white/5" : "hover:bg-gray-50"
                    )}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className={cn("text-sm font-bold", darkMode ? "text-white" : "text-gray-900")}>
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] font-medium opacity-40">
                          {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Scale size={14} className="text-primary/60" />
                          <span className={cn("text-sm font-bold", darkMode ? "text-white" : "text-gray-900")}>
                            {formatWeight(entry.weight)}
                          </span>
                        </div>
                        
                        {prevEntry && (
                          <div className={cn(
                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-black",
                            weightDiff < 0 ? "bg-emerald-500/10 text-emerald-500" : 
                            weightDiff > 0 ? "bg-red-500/10 text-red-500" : 
                            "bg-gray-500/10 text-gray-400"
                          )}>
                            {weightDiff < 0 ? <TrendingDown size={10} /> : 
                             weightDiff > 0 ? <TrendingUp size={10} /> : 
                             <Minus size={10} />}
                            {weightDiff !== 0 && Math.abs(displayDiff).toFixed(1)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold",
                        darkMode ? "bg-white/5 text-gray-300" : "bg-gray-100 text-gray-700"
                      )}>
                        {entry.bmi.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Activity size={12} className="text-primary/60" />
                        <span className={cn("text-sm font-bold", darkMode ? "text-white" : "text-gray-900")}>
                          {entry.bodyFat.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className={cn(
                          "p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100",
                          darkMode ? "hover:bg-red-500/10 text-gray-500 hover:text-red-400" : "hover:bg-red-50 text-gray-400 hover:text-red-600"
                        )}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
