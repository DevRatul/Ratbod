const fs = require('fs');
const path = './src/components/PullToRefresh.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("import { cn } from '../lib/utils';", "import { clsx, type ClassValue } from 'clsx';\nimport { twMerge } from 'tailwind-merge';\n\nfunction cn(...inputs: ClassValue[]) {\n  return twMerge(clsx(inputs));\n}");

fs.writeFileSync(path, content);
console.log("Fixed PullToRefresh import");

const appPath = './src/App.tsx';
let appContent = fs.readFileSync(appPath, 'utf8');
if (!appContent.includes("import PullToRefresh from './components/PullToRefresh';")) {
  appContent = appContent.replace("import ProfileModal from './components/ProfileModal';", "import ProfileModal from './components/ProfileModal';\nimport PullToRefresh from './components/PullToRefresh';");
  fs.writeFileSync(appPath, appContent);
  console.log("Fixed App.tsx import");
}

