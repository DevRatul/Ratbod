const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<button\s+className=\{cn\(\s+"px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1",\s+activeTab === 'results'/g,
  '<button\n              onClick={() => setActiveTab(\'results\')}\n              className={cn(\n                "px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1",\n                activeTab === \'results\''
);

fs.writeFileSync('src/App.tsx', content);
