const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add History import
if (!content.includes("import History from './components/History';")) {
  content = content.replace(
    "import Goals from './components/Goals';",
    "import Goals from './components/Goals';\nimport History from './components/History';"
  );
}

// 2. Replace the main block
const startMarker = '<main className={cn(';
const endMarker = '</footer>'; // We will replace up to footer, wait, the footer is outside.

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf('      {/* Footer */}');

if (startIndex !== -1 && endIndex !== -1) {
  const newLayout = `<main className={cn(
        "max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-12 space-y-8 overflow-x-hidden",
        (activeTab === 'results' || activeTab === 'breathing' || activeTab === 'groceries' || activeTab === 'water') ? "hidden" : "block"
      )}>
        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border-black/5 shadow-xl shadow-gray-200/50")}>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
              {lang === 'bn' ? 'সর্বশেষ এন্ট্রি' : 'Latest Entry'} <Calendar size={14} />
            </div>
            <div>
              <div className={cn("text-3xl font-black", darkMode ? "text-white" : "text-gray-900")}>
                {metricData.weight ? formatNum(metricData.weight) : '--'} <span className="text-base font-bold text-gray-500">{unit === 'metric' ? 'kg' : 'lb'}</span>
              </div>
              <div className="text-xs font-bold text-gray-500 mt-1">
                {metricData.weight ? (lang === 'bn' ? 'আজ' : 'Today') : (lang === 'bn' ? 'কোনো ডেটা নেই' : 'No data')}
              </div>
            </div>
          </div>

          <div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border-black/5 shadow-xl shadow-gray-200/50")}>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-500">
              {lang === 'bn' ? 'স্বাস্থ্যের অবস্থা' : 'Health Status'} 
              <div className={cn("w-2.5 h-2.5 rounded-full", metrics ? (metrics.bmiCategory === (lang === 'bn' ? 'স্বাভাবিক' : 'Normal') ? "bg-emerald-500" : "bg-red-500 animate-pulse") : "bg-gray-500")} />
            </div>
            <div>
              <div className={cn("text-2xl font-black capitalize", darkMode ? "text-white" : "text-gray-900")}>
                {metrics ? metrics.bmiCategory : '--'}
              </div>
              <div className="text-xs font-bold text-gray-500 mt-1">
                BMI: {metrics ? formatNum(metrics.bmi.toFixed(1)) : '--'}
              </div>
            </div>
          </div>

          <div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border-green-500/30 shadow-xl shadow-green-500/10")}>
             <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
              {lang === 'bn' ? 'লক্ষ্যের অগ্রগতি' : 'Goal Progress'} <Target size={14} className="text-emerald-500" />
            </div>
            <div className="space-y-3">
              <div className="text-2xl font-black text-emerald-500">
                {metrics ? 'Active' : '--'}
              </div>
              <div className={cn("h-2 w-full rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-gray-100")}>
                 <div className="h-full bg-emerald-500 w-[15%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Measurement */}
        <div className={cn("p-6 rounded-3xl border", darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border-black/5")}>
          <div className="flex items-center gap-2 mb-6 text-lg font-bold">
            <Scale size={20} className="opacity-70" /> {lang === 'bn' ? 'দ্রুত পরিমাপ' : 'Quick Measurement'}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Inputs */}
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.weight} *</label>
                <div className="relative">
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">{unit === 'metric' ? 'kg' : 'lbs'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.waist} *</label>
                  <div className="relative">
                    <input type="number" value={waist} onChange={(e) => setWaist(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.neck} *</label>
                  <div className="relative">
                    <input type="number" value={neck} onChange={(e) => setNeck(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  </div>
                </div>
              </div>
              
              {gender === 'female' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.hip} (Female) *</label>
                  <div className="relative">
                    <input type="number" value={hip} onChange={(e) => setHip(e.target.value)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")} placeholder="0.0" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">{t.activityLevel} *</label>
                <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)} className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none cursor-pointer", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")}>
                  {activityOptions.map(opt => <option key={opt.value} value={opt.value} className={darkMode ? "bg-[#0F0F0F]" : "bg-white"}>{opt.label}</option>)}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">{activityOptions.find(o => o.value === activityLevel)?.desc}</p>
              </div>
            </div>

            {/* RIGHT: Analysis Box */}
            <div className={cn("p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all", darkMode ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200")}>
              {metrics ? (
                 <div className="w-full space-y-4">
                   <Activity size={32} className="mx-auto text-emerald-500" />
                   <h4 className="font-bold text-lg">{lang === 'bn' ? 'স্বাস্থ্য বিশ্লেষণ' : 'Health Analysis'}</h4>
                   <div className="grid grid-cols-2 gap-4 mt-4 text-left">
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'বিএমআর' : 'BMR'}</div>
                       <div className="text-lg font-black text-primary">{formatNum(metrics.bmr)} <span className="text-[10px] text-gray-500">kcal</span></div>
                     </div>
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'টিডিইই' : 'TDEE'}</div>
                       <div className="text-lg font-black text-blue-500">{formatNum(metrics.tdee)} <span className="text-[10px] text-gray-500">kcal</span></div>
                     </div>
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t.bodyFat}</div>
                       <div className="text-lg font-black text-amber-500">{formatNum(metrics.bodyFat.toFixed(1))}%</div>
                     </div>
                     <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-white shadow-sm border")}>
                       <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'বিএমআই' : 'BMI'}</div>
                       <div className="text-lg font-black text-rose-500">{formatNum(metrics.bmi.toFixed(1))}</div>
                     </div>
                   </div>
                 </div>
              ) : (
                 <div className="space-y-3 opacity-60">
                   <Activity size={32} className="mx-auto text-gray-400" />
                   <p className="text-sm font-bold text-gray-400">
                     {lang === 'bn' ? 'স্বাস্থ্য বিশ্লেষণ দেখতে আপনার পরিমাপ দিন' : 'Enter your measurements to see health analysis'}
                   </p>
                   <p className="text-xs text-gray-500">
                     {lang === 'bn' ? 'ওজন, উচ্চতা এবং বয়স প্রয়োজন' : 'Weight, height, and age are required'}
                   </p>
                 </div>
              )}
            </div>
          </div>
          
          <button 
            onClick={saveMeasurement} 
            disabled={isSaving || !metrics}
            className={cn(
              "w-full mt-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
              isSaving || !metrics
                ? "bg-gray-500/20 text-gray-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            )}
          >
            <Save size={18} />
            {isSaving ? (lang === 'bn' ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving...') : (lang === 'bn' ? 'পরিমাপ সংরক্ষণ করুন' : 'Save Measurement')}
          </button>
        </div>

        {/* History */}
        <History darkMode={darkMode} unit={unit} refreshTrigger={historyRefreshTrigger} isLoggedIn={!!user} lang={lang} />

        {/* Goals */}
        <Goals darkMode={darkMode} unit={unit} currentWeight={metricData.weight} currentBodyFat={metrics?.bodyFat} lang={lang} />

      </main>
\n`;

  const finalContent = content.substring(0, startIndex) + newLayout + content.substring(endIndex);
  fs.writeFileSync('src/App.tsx', finalContent);
  console.log('App layout updated successfully');
} else {
  console.log('Could not find start or end markers');
}
