const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Find the Top Metric Cards block
const topCardsRegex = /\{\/\* Top Metric Cards \*\/\}\s*<div className="grid grid-cols-2 md:grid-cols-3 gap-4">([\s\S]*?)<\/div>\s*\{\/\* Quick Measurement \*\/\}/;

const newDashboard = `{/* 5 Tools Bento Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tool 1: Measurement & Health (combines Latest Entry & Health Status) */}
          <div 
            onClick={() => setActiveTab('calculator')}
            className={cn("p-5 rounded-3xl border flex flex-col justify-between col-span-2 sm:col-span-1 h-36 cursor-pointer hover:scale-[1.02] transition-transform", darkMode ? "bg-[#0F0F0F] border-white/10" : "bg-white border-black/5")}
          >
            <div className="flex justify-between items-start text-[10px] font-black uppercase tracking-wider text-gray-500">
              <div className="flex items-center gap-1.5"><Heart size={14} className="text-rose-500" />{lang === 'bn' ? 'স্বাস্থ্যের অবস্থা' : 'Health Tracker'}</div>
              <div className={cn("px-2 py-1 rounded-md text-[9px] flex items-center gap-1", displayCategory ? (displayCategory === 'Normal' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500") : "bg-gray-100 text-gray-400")}>
                <div className={cn("w-1.5 h-1.5 rounded-full", displayCategory ? (displayCategory === 'Normal' ? "bg-emerald-500" : "bg-rose-500") : "bg-gray-400")} />
                {displayCategory ? translateCategory(displayCategory) : 'N/A'}
              </div>
            </div>
            <div className="mt-auto">
              <div className="flex items-baseline gap-1">
                <span className={cn("text-3xl font-black tracking-tighter", darkMode ? "text-white" : "text-gray-900")}>
                  {displayWeight ? formatNum(displayWeight) : '--'}
                </span>
                <span className="text-sm font-bold text-gray-500">{unit === 'metric' ? 'kg' : 'lb'}</span>
              </div>
              <div className="text-[10px] font-bold text-gray-500">
                BMI: {displayBmi ? formatNum(displayBmi.toFixed(1)) : '--'}
              </div>
            </div>
          </div>

          {/* Tool 2: Goal Progress */}
          <div 
            onClick={() => setActiveTab('calculator')}
            className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36 cursor-pointer hover:scale-[1.02] transition-transform", darkMode ? "bg-[#0F0F0F] border-emerald-500/30" : "bg-white border-emerald-500/30")}
          >
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">
              <div className="flex items-center gap-1.5"><Target size={14} className="text-emerald-500" />{lang === 'bn' ? 'লক্ষ্যের অগ্রগতি' : 'Goal Tracker'}</div>
            </div>
            <div className="space-y-3 mt-auto">
              <div className="flex items-center gap-2 text-3xl font-black text-emerald-500 tracking-tighter">
                {(metrics || latestHistoryEntry) ? \`\${goalProgress.percent}%\` : '--'}
                {(metrics || latestHistoryEntry) && goalProgress.trend === 'down' && <TrendingDown size={20} className="text-emerald-500" />}
                {(metrics || latestHistoryEntry) && goalProgress.trend === 'up' && <TrendingUp size={20} className="text-emerald-500" />}
                {(metrics || latestHistoryEntry) && goalProgress.trend === 'none' && <Minus size={20} className="text-emerald-500" />}
              </div>
              <div className={cn("h-1.5 w-full rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-gray-100")}>
                 <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: \`\${(metrics || latestHistoryEntry) ? goalProgress.percent : 0}%\` }} />
              </div>
            </div>
          </div>

          {/* Tool 3: Water Tracker */}
          <div 
            onClick={() => setActiveTab('water')}
            className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform", darkMode ? "bg-[#0F0F0F] border-cyan-500/20" : "bg-cyan-50/50 border-cyan-200/50")}
          >
            <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
              <Droplet size={80} className="text-cyan-500" />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 relative z-10">
              <div className="flex items-center gap-1.5"><Droplet size={14} className="text-cyan-500" />{lang === 'bn' ? 'জল পান' : 'Water Intake'}</div>
            </div>
            <div className="mt-auto relative z-10">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tighter text-cyan-500">4</span>
                <span className="text-sm font-bold text-gray-500">/ 8 {lang === 'bn' ? 'গ্লাস' : 'glasses'}</span>
              </div>
              <div className="text-[10px] font-bold text-gray-500">{lang === 'bn' ? 'আজকের লক্ষ্য' : 'Today\\'s progress'}</div>
            </div>
          </div>

          {/* Tool 4: Groceries */}
          <div 
            onClick={() => setActiveTab('groceries')}
            className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform", darkMode ? "bg-[#0F0F0F] border-orange-500/20" : "bg-orange-50/50 border-orange-200/50")}
          >
            <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
              <ShoppingBag size={80} className="text-orange-500" />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 relative z-10">
              <div className="flex items-center gap-1.5"><ShoppingBag size={14} className="text-orange-500" />{lang === 'bn' ? 'মুদি তালিকা' : 'Meal Planner'}</div>
            </div>
            <div className="mt-auto relative z-10">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tighter text-orange-500">12</span>
                <span className="text-sm font-bold text-gray-500">{lang === 'bn' ? 'আইটেম' : 'items'}</span>
              </div>
              <div className="text-[10px] font-bold text-gray-500">{lang === 'bn' ? 'পরিকল্পিত কেনাকাটা' : 'In your cart'}</div>
            </div>
          </div>

          {/* Tool 5: Breathing */}
          <div 
            onClick={() => setActiveTab('breathing')}
            className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36 col-span-2 lg:col-span-1 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform", darkMode ? "bg-[#0F0F0F] border-purple-500/20" : "bg-purple-50/50 border-purple-200/50")}
          >
            <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
              <Wind size={80} className="text-purple-500" />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 relative z-10">
              <div className="flex items-center gap-1.5"><Wind size={14} className="text-purple-500" />{lang === 'bn' ? 'ধ্যান' : 'Mindfulness'}</div>
              <div className={cn("px-2 py-1 rounded-md text-[9px] font-bold", darkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-200 text-purple-700")}>
                {lang === 'bn' ? 'শান্ত হোন' : 'Relax'}
              </div>
            </div>
            <div className="mt-auto relative z-10">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black tracking-tighter text-purple-500">5</span>
                <span className="text-sm font-bold text-gray-500">{lang === 'bn' ? 'মিনিট' : 'mins'}</span>
              </div>
              <div className="text-[10px] font-bold text-gray-500">{lang === 'bn' ? 'আজকের সেশন' : 'Completed today'}</div>
            </div>
          </div>
        </div>

        {/* Quick Measurement */}`;

content = content.replace(topCardsRegex, newDashboard);

// Update imports if needed (Target, TrendingDown, TrendingUp, Minus)
// They seem to already be imported in App.tsx from previous usage. Let's make sure.
if (!content.includes("Target,")) {
  content = content.replace("import { ", "import { Target, TrendingDown, TrendingUp, Minus, ");
}

fs.writeFileSync(path, content);
console.log("Patched 5 Tools Homepage Grid");
