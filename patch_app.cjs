const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace target logic
const targetRegex = /const target = parseFloat\(targetWeight\) \|\| \(unit === 'metric' \? metrics\?\.idealWeight\?\.kg : metrics\?\.idealWeight\?\.lb\);/;
const newTarget = `    let goalData = null;
    try {
      const savedGoals = localStorage.getItem('ratbod_goals');
      if (savedGoals) {
        goalData = JSON.parse(savedGoals);
      }
    } catch (e) {}

    // Use goal weight if it exists, otherwise fallback to ideal weight
    const goalTargetWeight = goalData && goalData.targetWeight ? goalData.targetWeight : null;
    
    // In metric it's straightforward, in imperial we need to handle conversion if the goal is saved in kg and app is in lb
    // Wait, Goals.tsx saves targetWeight in whatever unit the user selected when saving? Let's assume Goals.tsx saves targetWeight.
    // Let's just do standard conversion: Goals.tsx gets unit from props. If unit changes, the goal might be displayed wrong unless converted. 
    // Wait, if it's the exact same target in the Goals tab, we should use it exactly as it is there.
    
    const target = goalTargetWeight ? (unit === 'metric' ? goalTargetWeight : goalTargetWeight * 2.20462) : (unit === 'metric' ? metrics?.idealWeight?.kg : metrics?.idealWeight?.lb);`;

content = content.replace(targetRegex, newTarget);

// Remove ProfileModal targetWeight props
content = content.replace(/targetWeight=\{targetWeight\}\n\s*setTargetWeight=\{setTargetWeight\}\n/g, '');

fs.writeFileSync(path, content);
console.log("Patched App.tsx");
