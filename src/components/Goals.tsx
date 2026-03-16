/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Target, Trophy, Calendar, ArrowRight, Save, RefreshCw, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../services/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Goal {
  id?: number;
  targetWeight: number;
  targetBodyFat: number;
  dailyCalorieGoal: number;
  targetDate: string;
}

interface GoalsProps {
  darkMode: boolean;
  unit: 'metric' | 'imperial';
  currentWeight?: number; // in kg
  currentBodyFat?: number;
  onGoalUpdate?: () => void;
}

export default function Goals({ darkMode, unit, currentWeight, currentBodyFat, onGoalUpdate }: GoalsProps) {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [targetWeight, setTargetWeight] = useState('');
  const [targetBodyFat, setTargetBodyFat] = useState('');
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState('');
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    fetchGoal();
  }, []);

  useEffect(() => {
    if (goal) {
      setTargetWeight(unit === 'metric' ? goal.targetWeight.toString() : (goal.targetWeight * 2.20462).toFixed(1));
    }
  }, [unit]);

  const fetchGoal = async () => {
    setIsLoading(true);
    try {
      const data = await api.getGoals();
      if (data) {
        setGoal(data);
        setTargetWeight(unit === 'metric' ? data.targetWeight.toString() : (data.targetWeight * 2.20462).toFixed(1));
        setTargetBodyFat(data.targetBodyFat.toString());
        setDailyCalorieGoal(data.dailyCalorieGoal.toString());
        setTargetDate(data.targetDate ? data.targetDate.split('T')[0] : '');
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const weightVal = parseFloat(targetWeight) || 0;
    const finalWeight = unit === 'metric' ? weightVal : weightVal / 2.20462;

    const goalData = {
      targetWeight: finalWeight,
      targetBodyFat: parseFloat(targetBodyFat) || 0,
      dailyCalorieGoal: parseInt(dailyCalorieGoal) || 0,
      targetDate: targetDate ? new Date(targetDate).toISOString() : null
    };

    try {
      await api.saveGoal(goalData);
      setGoal(goalData as Goal);
      setIsEditing(false);
      if (onGoalUpdate) onGoalUpdate();
    } catch (error) {
      alert('Failed to save goal');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const weightProgress = goal && currentWeight 
    ? (currentWeight > goal.targetWeight ? 'down' : currentWeight < goal.targetWeight ? 'up' : 'stable') 
    : null;

  const bodyFatProgress = goal && currentBodyFat
    ? (currentBodyFat > goal.targetBodyFat ? 'down' : currentBodyFat < goal.targetBodyFat ? 'up' : 'stable')
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="text-primary" size={24} />
          <h2 className="text-2xl font-bold tracking-tight">Health Goals</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-bold transition-all cursor-pointer",
              darkMode ? "bg-white/5 text-white hover:bg-white/10" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {goal ? 'Edit Goals' : 'Set Goals'}
          </button>
        )}
      </div>

      {isEditing ? (
        <motion.form 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSave} 
          className={cn(
            "p-6 rounded-3xl border space-y-6",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Target Weight ({unit === 'metric' ? 'kg' : 'lb'})
              </label>
              <input 
                type="number" 
                step="0.1"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                placeholder={unit === 'metric' ? '65' : '143'}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Target Body Fat (%)
              </label>
              <input 
                type="number" 
                step="0.1"
                value={targetBodyFat}
                onChange={(e) => setTargetBodyFat(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                placeholder="15"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Daily Calorie Goal (kcal)
              </label>
              <input 
                type="number" 
                value={dailyCalorieGoal}
                onChange={(e) => setDailyCalorieGoal(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                placeholder="2000"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Target Date
              </label>
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className={cn(
                  "w-full border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                  darkMode ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"
                )}
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
              Save Goals
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className={cn(
                "px-6 py-3 rounded-xl font-bold transition-all cursor-pointer",
                darkMode ? "bg-white/5 text-gray-400 hover:bg-white/10" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              Cancel
            </button>
          </div>
        </motion.form>
      ) : goal ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weight Goal Card */}
          <div className={cn(
            "p-6 rounded-3xl border space-y-4",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Weight Goal</span>
              <Trophy className="text-yellow-500" size={16} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-3xl font-light tracking-tighter">
                  {unit === 'metric' ? goal.targetWeight.toFixed(1) : (goal.targetWeight * 2.20462).toFixed(1)}
                  <span className="text-sm text-gray-500 font-bold ml-1">{unit === 'metric' ? 'kg' : 'lb'}</span>
                </p>
                <p className="text-xs text-gray-500 font-medium">Target Weight</p>
              </div>
              {currentWeight && (
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1">
                    {weightProgress === 'down' ? <TrendingDown className="text-primary" size={16} /> : 
                     weightProgress === 'up' ? <TrendingUp className="text-red-500" size={16} /> : 
                     <Minus className="text-gray-400" size={16} />}
                    <span className={cn(
                      "text-xl font-bold tracking-tighter",
                      weightProgress === 'down' ? "text-primary" : weightProgress === 'up' ? "text-red-500" : "text-gray-400"
                    )}>
                      {Math.abs(currentWeight - goal.targetWeight).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">To Go</p>
                </div>
              )}
            </div>
          </div>

          {/* Body Fat Goal Card */}
          <div className={cn(
            "p-6 rounded-3xl border space-y-4",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Body Fat Goal</span>
              <Target className="text-primary" size={16} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-3xl font-light tracking-tighter">
                  {goal.targetBodyFat.toFixed(1)}
                  <span className="text-sm text-gray-500 font-bold ml-1">%</span>
                </p>
                <p className="text-xs text-gray-500 font-medium">Target Fat %</p>
              </div>
              {currentBodyFat && (
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1">
                    {bodyFatProgress === 'down' ? <TrendingDown className="text-primary" size={16} /> : 
                     bodyFatProgress === 'up' ? <TrendingUp className="text-red-500" size={16} /> : 
                     <Minus className="text-gray-400" size={16} />}
                    <span className={cn(
                      "text-xl font-bold tracking-tighter",
                      bodyFatProgress === 'down' ? "text-primary" : bodyFatProgress === 'up' ? "text-red-500" : "text-gray-400"
                    )}>
                      {Math.abs(currentBodyFat - goal.targetBodyFat).toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium">To Go</p>
                </div>
              )}
            </div>
          </div>

          {/* Calories Goal Card */}
          <div className={cn(
            "p-6 rounded-3xl border space-y-4",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Daily Calorie Budget</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-light tracking-tighter text-primary">{goal.dailyCalorieGoal}</span>
              <span className="text-sm text-gray-500 font-bold">kcal</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Daily intake to reach goal</p>
          </div>

          {/* Timeframe Card */}
          <div className={cn(
            "p-6 rounded-3xl border space-y-4",
            darkMode ? "bg-[#0F0F0F] border-white/5" : "bg-white border-black/5"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Target Date</span>
              <Calendar className="text-gray-400" size={16} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">
                {new Date(goal.targetDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining
            </p>
          </div>
        </div>
      ) : (
        <div className={cn(
          "p-12 rounded-3xl border border-dashed flex flex-col items-center justify-center text-center space-y-4",
          darkMode ? "border-white/10 bg-white/5" : "border-gray-300 bg-gray-50"
        )}>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Target size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold">No Goals Set Yet</h3>
            <p className="text-sm text-gray-500 max-w-xs">Set your fitness objectives to track your progress and stay motivated.</p>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-hover transition-all flex items-center gap-2 cursor-pointer"
          >
            Set Your First Goal
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
