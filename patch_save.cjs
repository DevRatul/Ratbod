const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    setHistoryRefreshTrigger(prev => prev + 1);
    alert(t.savedAlert);
    
    // Keep active tab on results since history tab is replaced with groceries
    setActiveTab('groceries');
  };`;

const replacement = `    setHistoryRefreshTrigger(prev => prev + 1);
    
    // Custom logic to show alert, switch tab, and reset quick measurement fields
    alert(t.savedAlert);
    
    // Switch to groceries tab
    setActiveTab('groceries');
    
    // Reset quick measurement fields
    setWeight('');
    setWaist('');
    setNeck('');
    setHip('');
  };`;

if (content.includes('alert(t.savedAlert);')) {
  content = content.replace(target, replacement);
  fs.writeFileSync(path, content);
  console.log("Patched App.tsx handleSaveMetrics");
} else {
  console.log("Could not find the target string in App.tsx");
}
