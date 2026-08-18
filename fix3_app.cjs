const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("<PullToRefresh", "<>\n    <PullToRefresh");
content = content.replace("    </div>\n  );\n}", "    </div>\n    </>\n  );\n}");

fs.writeFileSync(path, content);
console.log("Fixed JSX root fragment");
