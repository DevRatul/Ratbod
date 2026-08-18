const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// The block that got incorrectly inserted at line 170-184
const wrongBlock = `
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

// Restore the original text that was replaced
// The original was likely:
//       }
//       setIsLoaded(true);
//     });
//
//     return () => unsubscribe();
//   }, []);
// Wait, the replaced string was "  return (" with spaces...
// Looking at the original:
//       if (!loadedFromDb) {
//          // Keep fields empty for new user
//       }
//       setIsLoaded(true);
//     });
//
//     return () => unsubscribe();
//   }, []);

// Let's just find the wrongBlock and replace it with ""
content = content.replace(wrongBlock, "");

// Then insert it at the correct place, right before "if (!isLoaded) {\n    return ("
// Actually the main return is around line 501: "  return ("
content = content.replace(
  /  if \(!isLoaded\) \{\n    return \(/,
  wrongBlock.replace("  return (", "  if (!isLoaded) {\n    return (")
);

fs.writeFileSync(path, content);
console.log("Fixed App.tsx");
