const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add states for Accordion
content = content.replace(
  "const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);",
  "const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);\n  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);"
);

// Add PullToRefresh import
content = content.replace(
  "import Breathing from './components/Breathing';",
  "import Breathing from './components/Breathing';\nimport PullToRefresh from './components/PullToRefresh';"
);

// Wrap main app content in PullToRefresh
content = content.replace(
  /<div className=\{cn\(\n\s*"min-h-screen font-sans/,
  `<PullToRefresh darkMode={darkMode}><div className={cn(
      "min-h-screen font-sans`
);
content = content.replace(
  /<\/div>\n\s*<ProfileModal/,
  `</div>\n    </PullToRefresh>\n    <ProfileModal`
);

// Reorganize the grid
const gridTarget = `<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Inputs */}
            <div className="space-y-5">`;

const gridReplacement = `<div>
            {/* Inputs */}
            <div className="space-y-5">`;

content = content.replace(gridTarget, gridReplacement);

// Reorganize the analysis box and save button
const rightBoxRegex = /\{\/\* RIGHT: Analysis Box \*\/\}([\s\S]*?)<\/div>\n\s*<\/div>\n\s*<button\s*onClick=\{handleSaveMetrics\}\s*disabled=\{\!metrics\}\s*className=\{cn\(\s*"w-full mt-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",\s*!metrics\s*\?\s*"bg-gray-500\/20 text-gray-400 cursor-not-allowed"\s*:\s*"bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600\/20"\s*\)\}\s*>\s*<Save size=\{18\} \/>\s*\{lang === 'bn' \? 'পরিমাপ সংরক্ষণ করুন' : 'Save Measurement'\}\s*<\/button>/;

const newRightBox = `</div>
            
            <button 
              onClick={handleSaveMetrics} 
              disabled={!metrics}
              className={cn(
                "w-full mt-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                !metrics 
                  ? "bg-gray-500/20 text-gray-400 cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
              )}
            >
              <Save size={18} />
              {lang === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
            </button>

            {/* Health Analytics Accordion */}
            <div className="mt-6 border rounded-2xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                className={cn(
                  "w-full px-6 py-4 flex items-center justify-between font-bold transition-colors",
                  darkMode ? "bg-[#111] hover:bg-[#1A1A1A] text-white border-white/5" : "bg-gray-50 hover:bg-gray-100 text-gray-900 border-black/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-emerald-500" />
                  {lang === 'bn' ? 'স্বাস্থ্য বিশ্লেষণ' : 'Health Analytics'}
                </div>
                <div className={cn("transition-transform duration-300", isAnalyticsOpen ? "rotate-180" : "")}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </div>
              </button>
              
              <div className={cn(
                "transition-all duration-300 ease-in-out origin-top",
                isAnalyticsOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
              )}>
                <div className={cn("p-6 flex flex-col items-center justify-center text-center transition-all", darkMode ? "bg-[#0F0F0F]" : "bg-white")}>
                  {metrics ? (
                     <div className="w-full space-y-4">
                       <Activity size={32} className="mx-auto text-emerald-500" />
                       <div className="grid grid-cols-2 gap-4 mt-4 text-left">
                         <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-gray-50 shadow-sm border")}>
                           <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'বিএমআর' : 'BMR'}</div>
                           <div className="text-lg font-black text-primary">{formatNum(metrics.bmr)} <span className="text-[10px] text-gray-500">kcal</span></div>
                         </div>
                         <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-gray-50 shadow-sm border")}>
                           <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'টিডিইই' : 'TDEE'}</div>
                           <div className="text-lg font-black text-blue-500">{formatNum(metrics.tdee)} <span className="text-[10px] text-gray-500">kcal</span></div>
                         </div>
                         <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-gray-50 shadow-sm border")}>
                           <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{t.bodyFat}</div>
                           <div className="text-lg font-black text-amber-500">{formatNum(metrics.bodyFat.toFixed(1))}%</div>
                         </div>
                         <div className={cn("p-3 rounded-xl", darkMode ? "bg-black/40" : "bg-gray-50 shadow-sm border")}>
                           <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{lang === 'bn' ? 'বিএমআই' : 'BMI'}</div>
                           <div className="text-lg font-black text-rose-500">{formatNum(metrics.bmi.toFixed(1))}</div>
                         </div>
                       </div>
                     </div>
                  ) : (
                     <div className="space-y-3 opacity-60 py-6">
                       <Activity size={32} className="mx-auto text-gray-400" />
                       <p className="text-sm font-bold text-gray-400">
                         {lang === 'bn' ? 'স্বাস্থ্য বিশ্লেষণ দেখতে আপনার পরিমাপ দিন' : 'Enter your measurements to see health analysis'}
                       </p>
                     </div>
                  )}
                </div>
              </div>
            </div>`;

content = content.replace(rightBoxRegex, newRightBox);

fs.writeFileSync(path, content);
console.log("Patched App.tsx with PullToRefresh and Accordion");
