const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const bentoRegex = /\{\/\* 5 Tools Bento Grid \*\/\}([\s\S]*?)<\/div>\s*\{\/\* Quick Measurement \*\/\}/;

const oldCards = `{/* Top Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between h-28", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border-black/5 shadow-xl shadow-gray-200/50")}>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
              {lang === 'bn' ? 'সর্বশেষ এন্ট্রি' : 'Latest Entry'} <Calendar size={14} />
            </div>
            <div>
              <div className={cn("text-2xl font-black", darkMode ? "text-white" : "text-gray-900")}>
                {displayWeight ? formatNum(displayWeight) : '--'} <span className="text-base font-bold text-gray-500">{unit === 'metric' ? 'kg' : 'lb'}</span>
              </div>
              <div className="text-xs font-bold text-gray-500 mt-1">
                {displayWeight ? (lang === 'bn' ? 'আজ' : 'Today') : (lang === 'bn' ? 'কোনো ডেটা নেই' : 'No data')}
              </div>
            </div>
          </div>

          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between h-28", darkMode ? "bg-[#0F0F0F] border-white/10 shadow-lg shadow-black/50" : "bg-white border-black/5 shadow-xl shadow-gray-200/50")}>
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-gray-500">
              <div className="flex items-center gap-1"><Heart size={12} className="text-rose-500" />{lang === 'bn' ? 'স্বাস্থ্যের অবস্থা' : 'Health Status'}</div> 
              <div className={cn("w-2.5 h-2.5 rounded-full", displayCategory ? (displayCategory === 'Normal' ? "bg-emerald-500" : (displayCategory === 'Underweight' ? "bg-blue-500" : "bg-red-500 animate-pulse")) : "bg-gray-500")} />
            </div>
            <div>
              <div className={cn("text-xl font-black capitalize", darkMode ? "text-white" : "text-gray-900")}>
                {displayCategory ? translateCategory(displayCategory) : '--'}
              </div>
              <div className="text-xs font-bold text-gray-500 mt-1">
                BMI: {displayBmi ? formatNum(displayBmi.toFixed(1)) : '--'}
              </div>
            </div>
          </div>

          <div className={cn("p-4 rounded-3xl border flex flex-col justify-between h-28 col-span-2 md:col-span-1", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border-green-500/30 shadow-xl shadow-green-500/10")}>
             <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
              {lang === 'bn' ? 'লক্ষ্যের অগ্রগতি' : 'Goal Progress'} <Target size={14} className="text-emerald-500" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-2xl font-black text-emerald-500">
                {(metrics || latestHistoryEntry) ? \`\${goalProgress.percent}%\` : '--'}
                {(metrics || latestHistoryEntry) && goalProgress.trend === 'down' && <TrendingDown size={20} className="text-emerald-500" />}
                {(metrics || latestHistoryEntry) && goalProgress.trend === 'up' && <TrendingUp size={20} className="text-emerald-500" />}
                {(metrics || latestHistoryEntry) && goalProgress.trend === 'none' && <Minus size={20} className="text-emerald-500" />}
              </div>
              <div className={cn("h-2 w-full rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-gray-100")}>
                 <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: \`\${(metrics || latestHistoryEntry) ? goalProgress.percent : 0}%\` }} />
              </div>
              <div className="text-[10px] text-gray-500 font-bold mt-1">Goal: {(metrics || latestHistoryEntry) ? goalProgress.target : '--'} {unit === 'metric' ? 'kg' : 'lb'}</div>
            </div>
          </div>
        </div>

        {/* Quick Measurement */}`;

content = content.replace(bentoRegex, oldCards);
fs.writeFileSync(path, content);
console.log("Reverted App.tsx Top Metric Cards");
