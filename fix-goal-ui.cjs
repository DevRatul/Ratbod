const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Col span modification
content = content.replace(
  '<div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border-green-500/30 shadow-xl shadow-green-500/10")}>',
  '<div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36 col-span-2 md:col-span-1", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border-green-500/30 shadow-xl shadow-green-500/10")}>'
);

// Update Goal progress inner HTML to show percentage and arrow and target
content = content.replace(
  /<div className="space-y-3">[\s\S]*?<div className="text-2xl font-black text-emerald-500">[\s\S]*?\{metrics \? 'Active' : '--'\}[\s\S]*?<\/div>[\s\S]*?<div className=\{cn\("h-2 w-full rounded-full overflow-hidden", darkMode \? "bg-white\/10" : "bg-gray-100"\)\}>[\s\S]*?<div className="h-full bg-emerald-500 w-\[15%\]" \/>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
  `<div className="space-y-3">
              <div className="flex items-center gap-2 text-3xl font-black text-emerald-500">
                {metrics ? \`\${goalProgress.percent}%\` : '--'}
                {metrics && goalProgress.trend === 'down' && <TrendingDown size={20} className="text-emerald-500" />}
                {metrics && goalProgress.trend === 'up' && <TrendingUp size={20} className="text-emerald-500" />}
                {metrics && goalProgress.trend === 'none' && <Minus size={20} className="text-emerald-500" />}
              </div>
              <div className={cn("h-2 w-full rounded-full overflow-hidden", darkMode ? "bg-white/10" : "bg-gray-100")}>
                 <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: \`\${metrics ? goalProgress.percent : 0}%\` }} />
              </div>
              <div className="text-[10px] text-gray-500 font-bold mt-1">Target: {metrics ? goalProgress.target : '--'} {unit === 'metric' ? 'kg' : 'lb'}</div>
            </div>`
);


// Replace metrics.bmiCategory stuff
content = content.replace(
  /metrics \? metrics.bmiCategory : '--'/g,
  "metrics ? translateCategory(metrics.category) : '--'"
);

content = content.replace(
  /metrics \? \(metrics\.bmiCategory === \(lang === 'bn' \? 'স্বাভাবিক' : 'Normal'\) \? "bg-emerald-500" : "bg-red-500 animate-pulse"\) : "bg-gray-500"/g,
  `metrics ? (metrics.category === 'Normal' ? "bg-emerald-500" : (metrics.category === 'Underweight' ? "bg-blue-500" : "bg-red-500 animate-pulse")) : "bg-gray-500"`
);


fs.writeFileSync('src/App.tsx', content);
