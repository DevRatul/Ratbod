const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add Missing Icons
if (!content.includes('TrendingDown,')) {
  content = content.replace(
    "} from 'lucide-react';",
    "  TrendingDown,\n  TrendingUp,\n  Minus\n} from 'lucide-react';"
  );
}

// Ensure translateCategory exists in the correct place, before returning in the component
// The translation helper was put near metricData but let's check its scope
const transHelper = `
  const translateCategory = (cat: string) => {
    if (lang !== 'bn') return cat;
    if (cat === 'Underweight') return 'কম ওজন';
    if (cat === 'Normal') return 'স্বাভাবিক';
    if (cat === 'Overweight') return 'অতিরিক্ত ওজন';
    if (cat === 'Obese') return 'স্থূলতা';
    return cat;
  };
`;

if (!content.includes('const translateCategory')) {
    content = content.replace(
      "const metricData = useMemo(() => {",
      transHelper + "\n  const metricData = useMemo(() => {"
    );
}


fs.writeFileSync('src/App.tsx', content);
