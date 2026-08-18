const fs = require('fs');

let content = fs.readFileSync('src/components/History.tsx', 'utf8');

// Replace the hardcoded SVG with lucide's History icon
if (!content.includes('History as HistoryIcon')) {
  content = content.replace(
    "} from 'lucide-react';",
    "  History as HistoryIcon\n} from 'lucide-react';"
  );
}

content = content.replace(
  /<svg xmlns="http:\/\/www.w3.org\/2000\/svg"[\s\S]*?<\/svg>/,
  '<HistoryIcon className={darkMode ? "text-emerald-500" : "text-emerald-600"} size={24} />'
);

// We should also change the title structure a bit to match the screenshot
// the screenshot has:
// (Icon in a green circle maybe?) Wait, in the screenshot, the History icon is inside a dark green circle `text-emerald-500 bg-emerald-500/10`
// Let's modify the header:
// `<div className="flex items-center gap-3">
//    <div className={cn("p-2 rounded-xl", darkMode ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-100 text-emerald-600")}>
//       <HistoryIcon size={24} />
//    </div>
//    <h3 className={cn("text-2xl font-black tracking-tight", darkMode ? "text-white" : "text-gray-900")}>
//       History
//    </h3>
//    <span className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full", darkMode ? "bg-white/10 text-gray-300" : "bg-gray-200 text-gray-700")}>
//       17 ENTRIES
//    </span>
// </div>`

fs.writeFileSync('src/components/History.tsx', content);
