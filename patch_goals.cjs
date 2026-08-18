const fs = require('fs');
const path = './src/components/Goals.tsx';
let content = fs.readFileSync(path, 'utf8');

const fetchTarget = `      if (data) {
        setGoal(data);`;
const fetchReplacement = `      if (data) {
        localStorage.setItem('ratbod_goals', JSON.stringify(data));
        setGoal(data);`;

content = content.replace(fetchTarget, fetchReplacement);
fs.writeFileSync(path, content);
console.log("Patched Goals.tsx fetchGoal");
