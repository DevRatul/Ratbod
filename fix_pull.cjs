const fs = require('fs');
const path = './src/components/PullToRefresh.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(path, content);
console.log("Fixed PullToRefresh.tsx");
