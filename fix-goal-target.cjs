const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace target logic
const oldTargetLine = "const target = unit === 'metric' ? metrics?.idealWeight?.kg : metrics?.idealWeight?.lb;";
const newTargetLine = "const target = parseFloat(targetWeight) || (unit === 'metric' ? metrics?.idealWeight?.kg : metrics?.idealWeight?.lb);";

content = content.replace(oldTargetLine, newTargetLine);

// We need to add targetWeight to dependency array of goalProgress
content = content.replace(
  "}, [weight, unit, historyRefreshTrigger, metrics]);",
  "}, [weight, unit, historyRefreshTrigger, metrics, targetWeight]);"
);

fs.writeFileSync('src/App.tsx', content);
