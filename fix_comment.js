const fs = require('fs');
const path = './src/components/LandingPage.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace("{/* Right Graphics - 5 Tools Bento Grid */\n            <div", "{/* Right Graphics - 5 Tools Bento Grid */}\n            <div");
fs.writeFileSync(path, content);
