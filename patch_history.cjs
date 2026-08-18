const fs = require('fs');
const path = './src/components/History.tsx';
let content = fs.readFileSync(path, 'utf8');

// Add showAll state
content = content.replace(
  /const \[isLoading, setIsLoading\] = useState\(true\);/,
  "const [isLoading, setIsLoading] = useState(true);\n  const [showAll, setShowAll] = useState(false);"
);

// Replace mapping with sliced array
content = content.replace(
  /\{history\.map\(\(entry, index\) => \{/g,
  "{(showAll ? history : history.slice(0, 5)).map((entry, idx) => {\n          const index = history.findIndex(h => h.id === entry.id);"
);

// Update the View All button
const buttonTarget = `{history.length > 0 && (
          <button
            onClick={clearLocalHistory}
            className={cn("text-xs font-bold transition-all cursor-pointer flex items-center gap-1", darkMode ? "text-emerald-500 hover:text-emerald-400" : "text-emerald-600 hover:text-emerald-500")}
          >
            {lang === 'bn' ? 'সব দেখুন' : 'View All'} &rarr;
          </button>
        )}`;

const buttonReplacement = `{history.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className={cn("text-xs font-bold transition-all cursor-pointer flex items-center gap-1", darkMode ? "text-emerald-500 hover:text-emerald-400" : "text-emerald-600 hover:text-emerald-500")}
          >
            {showAll 
              ? (lang === 'bn' ? 'কম দেখুন' : 'Show Less') 
              : (lang === 'bn' ? 'সব দেখুন' : 'View All')} 
            {showAll ? '↑' : '↓'}
          </button>
        )}`;

content = content.replace(buttonTarget, buttonReplacement);

fs.writeFileSync(path, content);
console.log("Patched History.tsx");
