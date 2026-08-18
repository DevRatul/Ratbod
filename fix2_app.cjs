const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix the unsubscribe
content = content.replace("  ) => unsubscribe();", "    return () => unsubscribe();");

// The block to insert
const newBlock = `
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

// Insert the block replacing the LAST "  return (" in the main component.
// I will just replace the specific "  return (" around line 487
content = content.replace(/  return \(\n    <div className=\{cn\(/, newBlock + "\n    <div className={cn(");

fs.writeFileSync(path, content);
console.log("Fixed App.tsx part 2");
