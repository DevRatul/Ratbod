const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "  const [weight,\n        targetWeight, setWeight] = useState<string>(''); // kg or lbs\n  const [targetWeight, setTargetWeight] = useState<string>(''); // Goal target",
  "  const [weight, setWeight] = useState<string>(''); // kg or lbs\n  const [targetWeight, setTargetWeight] = useState<string>(''); // Goal target"
);

fs.writeFileSync('src/App.tsx', content);
