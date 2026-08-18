const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix goalProgress to use latest history weight if input is 0
content = content.replace(
  "const cw = parseFloat(weight) || 0;",
  `let cw = parseFloat(weight) || 0;
    if (!cw && history.length > 0) {
      cw = unit === 'metric' ? history[history.length - 1].weight : history[history.length - 1].weight * 2.20462;
    }`
);

// 2. We need to create derived variables for the Top Metric Cards
// We'll put them right before the return statement of App.tsx
const derivedVars = `
  // Calculate dashboard display metrics based on input OR latest history
  const latestHistoryEntry = useMemo(() => {
    try {
      const history = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
      if (history.length > 0) return history[history.length - 1];
    } catch (e) {}
    return null;
  }, [historyRefreshTrigger]);

  const displayWeight = metricData.weight || (latestHistoryEntry ? (unit === 'metric' ? latestHistoryEntry.weight : latestHistoryEntry.weight * 2.20462) : 0);
  const displayBmi = metrics ? metrics.bmi : (latestHistoryEntry ? latestHistoryEntry.bmi : null);
  const displayCategory = metrics ? metrics.category : (latestHistoryEntry ? getBMICategory(latestHistoryEntry.bmi) : null);
  
  return (`;

content = content.replace("  return (", derivedVars);

// 3. Update the Top Metric Cards to use these derived variables
// Card 1: Latest Entry
content = content.replace(
  "{metricData.weight ? formatNum(metricData.weight) : '--'} <span",
  "{displayWeight ? formatNum(displayWeight) : '--'} <span"
);
content = content.replace(
  "{metricData.weight ? (lang === 'bn' ? 'আজ' : 'Today') : (lang === 'bn' ? 'কোনো ডেটা নেই' : 'No data')}",
  "{displayWeight ? (lang === 'bn' ? 'আজ' : 'Today') : (lang === 'bn' ? 'কোনো ডেটা নেই' : 'No data')}"
);

// Card 2: Health Status
// Replace the circle color logic
content = content.replace(
  "metrics ? (metrics.category === 'Normal' ? \"bg-emerald-500\" : (metrics.category === 'Underweight' ? \"bg-blue-500\" : \"bg-red-500 animate-pulse\")) : \"bg-gray-500\"",
  "displayCategory ? (displayCategory === 'Normal' ? \"bg-emerald-500\" : (displayCategory === 'Underweight' ? \"bg-blue-500\" : \"bg-red-500 animate-pulse\")) : \"bg-gray-500\""
);

// Replace category text
content = content.replace(
  "{metrics ? translateCategory(metrics.category) : '--'}",
  "{displayCategory ? translateCategory(displayCategory) : '--'}"
);

// Replace BMI text
content = content.replace(
  "BMI: {metrics ? formatNum(metrics.bmi.toFixed(1)) : '--'}",
  "BMI: {displayBmi ? formatNum(displayBmi.toFixed(1)) : '--'}"
);

// Card 3: Goal Progress uses goalProgress.percent, which already uses cw which now correctly falls back to history!
// Wait, goalProgress percentage text has a check for metrics: {metrics ? \`\${goalProgress.percent}%\` : '--'}
// Let's replace {metrics ? with {(metrics || latestHistoryEntry) ?
content = content.replace(
  "{metrics ? `${goalProgress.percent}%` : '--'}",
  "{(metrics || latestHistoryEntry) ? `${goalProgress.percent}%` : '--'}"
);
content = content.replace(
  "{metrics && goalProgress.trend === 'down' && <TrendingDown size={20} className=\"text-emerald-500\" />}",
  "{(metrics || latestHistoryEntry) && goalProgress.trend === 'down' && <TrendingDown size={20} className=\"text-emerald-500\" />}"
);
content = content.replace(
  "{metrics && goalProgress.trend === 'up' && <TrendingUp size={20} className=\"text-emerald-500\" />}",
  "{(metrics || latestHistoryEntry) && goalProgress.trend === 'up' && <TrendingUp size={20} className=\"text-emerald-500\" />}"
);
content = content.replace(
  "{metrics && goalProgress.trend === 'none' && <Minus size={20} className=\"text-emerald-500\" />}",
  "{(metrics || latestHistoryEntry) && goalProgress.trend === 'none' && <Minus size={20} className=\"text-emerald-500\" />}"
);
content = content.replace(
  "style={{ width: `${metrics ? goalProgress.percent : 0}%` }}",
  "style={{ width: `${(metrics || latestHistoryEntry) ? goalProgress.percent : 0}%` }}"
);
content = content.replace(
  "Goal: {metrics ? goalProgress.target : '--'} {unit === 'metric' ? 'kg' : 'lb'}",
  "Goal: {(metrics || latestHistoryEntry) ? goalProgress.target : '--'} {unit === 'metric' ? 'kg' : 'lb'}"
);

fs.writeFileSync(path, content);
console.log("Patched Top Dashboard metrics");
