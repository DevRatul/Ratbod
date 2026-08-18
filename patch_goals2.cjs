const fs = require('fs');
const path = './src/components/Goals.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `        setGoal(data);
        setTargetWeight(unit === 'metric' ? data.targetWeight.toString() : (data.targetWeight * 2.20462).toFixed(1));`;

const replacement = `        setGoal(data);
        if (onGoalUpdate) onGoalUpdate();
        setTargetWeight(unit === 'metric' ? data.targetWeight.toString() : (data.targetWeight * 2.20462).toFixed(1));`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log("Patched Goals.tsx onGoalUpdate inside fetchGoal");
