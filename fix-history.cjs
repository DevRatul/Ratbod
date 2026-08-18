const fs = require('fs');
let content = fs.readFileSync('src/components/History.tsx', 'utf8');

content = content.replace(
  /<h3 className={cn\("text-lg font-bold tracking-tight", darkMode \? "text-white" : "text-gray-900"\)}>[\s\S]*?<\/h3>/,
  `<h3 className={cn("text-xl font-black tracking-tight flex items-center gap-2", darkMode ? "text-white" : "text-gray-900")}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {lang === 'bn' ? 'ইতিহাস' : 'History'}
          </h3>`
);

content = content.replace(
  /<span className={cn\("text-xs font-bold uppercase tracking-widest opacity-40"\)}>/,
  `<span className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full", darkMode ? "bg-white/10 text-gray-300" : "bg-gray-200 text-gray-700")}>`
);

content = content.replace(
  /\{history\.length > 0 && \([\s\S]*?<\/button>\s*\)\}/,
  `{history.length > 0 && (
          <button
            onClick={clearLocalHistory}
            className={cn("text-xs font-bold transition-all cursor-pointer flex items-center gap-1", darkMode ? "text-primary hover:text-primary-light" : "text-primary-dark hover:text-primary")}
          >
            {lang === 'bn' ? 'সব দেখুন' : 'View All'} &rarr;
          </button>
        )}`
);

fs.writeFileSync('src/components/History.tsx', content);
