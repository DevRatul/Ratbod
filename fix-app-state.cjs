const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add targetWeight state
content = content.replace(
  "const [weight, setWeight] = useState<string>(''); // kg or lbs",
  "const [weight, setWeight] = useState<string>(''); // kg or lbs\n  const [targetWeight, setTargetWeight] = useState<string>(''); // Goal target"
);

// 2. Add it to Firestore loadedFromDb
content = content.replace(
  "if (data.weight) setWeight(data.weight);",
  "if (data.weight) setWeight(data.weight);\n            if (data.targetWeight) setTargetWeight(data.targetWeight);"
);

// 3. Add to localStorage fallback loading
content = content.replace(
  "const savedWeight = localStorage.getItem('ratbod_weight') || '';",
  "const savedWeight = localStorage.getItem('ratbod_weight') || '';\n          const savedTargetWeight = localStorage.getItem('ratbod_targetWeight') || '';"
);
content = content.replace(
  "setWeight(savedWeight);",
  "setWeight(savedWeight);\n          setTargetWeight(savedTargetWeight);"
);

// 4. Add to sync back (localStorage)
content = content.replace(
  "localStorage.setItem('ratbod_weight', weight);",
  "localStorage.setItem('ratbod_weight', weight);\n    localStorage.setItem('ratbod_targetWeight', targetWeight);"
);

// 5. Add to sync back (Firestore)
content = content.replace(
  "weight,",
  "weight,\n        targetWeight,"
);

// 6. Pass to ProfileModal
content = content.replace(
  "setHeight={setHeight}",
  "setHeight={setHeight}\n        targetWeight={targetWeight}\n        setTargetWeight={setTargetWeight}"
);

fs.writeFileSync('src/App.tsx', content);
