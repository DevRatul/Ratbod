const fs = require('fs');
const path = './src/components/ProfileModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove targetWeight from props
content = content.replace(/  targetWeight\?: string;\n/, '');
content = content.replace(/  setTargetWeight\?: \(w: string\) => void;\n/, '');
content = content.replace(/, targetWeight, setTargetWeight/, '');

// Remove Goal Weight section
const targetWeightInputRegex = /<div className="space-y-1\.5">\s*<label className=\{cn\("text-\[10px\] font-bold uppercase tracking-wider flex justify-between", darkMode \? "text-gray-400" : "text-gray-600"\)\}>\s*<span>Goal Weight<\/span>\s*<span>\{unit === 'metric' \? 'kg' : 'lbs'\}<\/span>\s*<\/label>\s*<input\s*type="number"\s*value=\{targetWeight \|\| ''\}\s*onChange=\{\(e\) => setTargetWeight && setTargetWeight\(e\.target\.value\)\}\s*className=\{cn\(\s*"w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm",\s*darkMode \? "bg-black\/50 border-white\/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"\s*\)\}\s*placeholder="e\.g\. 75"\s*\/>\s*<\/div>/;
content = content.replace(targetWeightInputRegex, '');

fs.writeFileSync(path, content);
console.log("Patched ProfileModal.tsx");
