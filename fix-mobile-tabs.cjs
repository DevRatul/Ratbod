const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the Flame tab with the correct Groceries one 
content = content.replace(
  /<button \s*id="tab_results"[\s\S]*?<Flame size=\{18\} \/>[\s\S]*?<\/button>/,
  `<button 
            id="tab_results"
            onClick={() => setActiveTab('results')}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1.5 transition-all relative",
              activeTab === 'results' ? "text-rose-500 scale-105 font-bold" : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-900")
            )}
          >
            <Flame size={18} />
            <span className="text-[10px] font-bold mt-1 tracking-tight">{t.tabResults}</span>
          </button>`
);

fs.writeFileSync('src/App.tsx', content);
