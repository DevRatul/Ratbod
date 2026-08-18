const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// We need to fetch the history from localStorage to compute progression
// Let's create a useMemo for progress
const progressHook = `
  const goalProgress = useMemo(() => {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('ratbod_history') || '[]');
    } catch (e) {}
    
    const cw = parseFloat(weight) || 0;
    const target = unit === 'metric' ? metrics?.idealWeight?.kg : metrics?.idealWeight?.lb;
    let initialWeight = cw;
    let previousWeight = cw;

    if (history.length > 0) {
      initialWeight = unit === 'metric' ? history[0].metrics.weight : history[0].metrics.weight * 2.20462;
      
      if (history.length > 1) {
        // The one before the current (latest saved vs current)
        previousWeight = unit === 'metric' ? history[history.length - 1].metrics.weight : history[history.length - 1].metrics.weight * 2.20462;
      } else {
        previousWeight = initialWeight;
      }
    }

    if (!target || !cw || initialWeight === target) return { percent: 0, target, trend: 'none' };
    
    const totalDiff = Math.abs(initialWeight - target);
    const currentDiff = Math.abs(initialWeight - cw);
    
    let percent = (currentDiff / totalDiff) * 100;
    if (percent > 100) percent = 100;
    if (percent < 0) percent = 0;

    let trend = 'none';
    if (cw < previousWeight) {
       trend = 'down'; // Weight went down
    } else if (cw > previousWeight) {
       trend = 'up'; // Weight went up
    }

    return { percent: Math.round(percent), target: target.toFixed(1), trend };
  }, [weight, unit, historyRefreshTrigger, metrics]);
`;

// Insert the hook right after metricData
content = content.replace(
  "const handleDownloadPdf = async () => {",
  progressHook + "\n  const handleDownloadPdf = async () => {"
);

fs.writeFileSync('src/App.tsx', content);
