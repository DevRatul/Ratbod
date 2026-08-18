const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Grid modification
content = content.replace(
  '<div className="grid grid-cols-1 md:grid-cols-3 gap-4">',
  '<div className="grid grid-cols-2 md:grid-cols-3 gap-4">'
);

// 2. Goal progress span modification
content = content.replace(
  '<div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border-green-500/30 shadow-xl shadow-green-500/10")}>\n             <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">\n              {lang === \'bn\' ? \'লক্ষ্যের অগ্রগতি\' : \'Goal Progress\'}',
  '<div className={cn("p-5 rounded-3xl border flex flex-col justify-between h-36 col-span-2 md:col-span-1", darkMode ? "bg-[#0F0F0F] border-green-500/30 shadow-lg shadow-green-500/10" : "bg-white border-green-500/30 shadow-xl shadow-green-500/10")}>\n             <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500">\n              {lang === \'bn\' ? \'লক্ষ্যের অগ্রগতি\' : \'Goal Progress\'}'
);

// We need a helper for translation of Category
const transHelper = `
  const translateCategory = (cat) => {
    if (lang !== 'bn') return cat;
    if (cat === 'Underweight') return 'কম ওজন';
    if (cat === 'Normal') return 'স্বাভাবিক';
    if (cat === 'Overweight') return 'অতিরিক্ত ওজন';
    if (cat === 'Obese') return 'স্থূলতা';
    return cat;
  };
`;
// add this before metricData
content = content.replace(
  "const metricData = useMemo(() => {",
  transHelper + "\n  const metricData = useMemo(() => {"
);

// 3. Fix the Health Status display
content = content.replace(
  /metrics\.bmiCategory/g,
  "translateCategory(metrics.category)"
);
// replace metrics ? metrics.bmiCategory : '--' -> metrics ? translateCategory(metrics.category) : '--'
content = content.replace(
  /metrics \? metrics\.bmiCategory : '--'/g,
  "metrics ? translateCategory(metrics.category) : '--'"
);

// Update color dot logic
content = content.replace(
  `translateCategory(metrics.category) === (lang === 'bn' ? 'স্বাভাবিক' : 'Normal') ? "bg-emerald-500" : "bg-red-500 animate-pulse"`,
  `metrics.category === 'Normal' ? "bg-emerald-500" : (metrics.category === 'Underweight' ? "bg-blue-500" : "bg-red-500 animate-pulse")`
);

// 4. Goal Progress update
// It's currently showing Active. We want to show percentage + arrow
// And the bar.
// First let's find the exact Goal progress JSX.
