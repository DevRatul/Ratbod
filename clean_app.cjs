const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Remove useState for targetWeight
content = content.replace(/  const \[targetWeight, setTargetWeight\] = useState<string>\(''\); \/\/ Goal target\n/, '');

// Remove from firebase fetch
content = content.replace(/            if \(data.targetWeight\) setTargetWeight\(data.targetWeight\);\n/, '');

// Remove from local storage fetch
content = content.replace(/          const savedTargetWeight = localStorage.getItem\('ratbod_targetWeight'\) \|\| '';\n/, '');
content = content.replace(/          if \(savedTargetWeight\) setTargetWeight\(savedTargetWeight\);\n/, '');

// Remove from local storage save
content = content.replace(/    localStorage.setItem\('ratbod_targetWeight', targetWeight\);\n/, '');

// Fix useEffect dependency array where targetWeight was used
content = content.replace(/, targetWeight\]\)/g, '])');

fs.writeFileSync(path, content);
console.log("Cleaned App.tsx");
