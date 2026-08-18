const fs = require('fs');
const path = './src/components/History.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  const deleteEntry = async (id: string | number) => {
    const confirmMsg = lang === 'bn' 
      ? 'আপনি কি নিশ্চিত যে আপনি এই পরিমাপটি ডিলিট করতে চান?' 
      : 'Are you sure you want to delete this measurement?';
    if (!window.confirm(confirmMsg)) return;
    try {
      let data = history.filter((entry: MetricEntry) => entry.id !== id);
      localStorage.setItem('ratbod_history', JSON.stringify(data));
      
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'appData', 'history'), { history: data }, { merge: true }).catch(e => {});
      }
      // Refresh history
      fetchHistory();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      const errMsg = lang === 'bn'
        ? 'পরিমাপটি ডিলিট করা সম্ভব হয়নি। দয়া করে আবার চেষ্টা করুন।'
        : 'Failed to delete measurement. Please try again.';
      alert(errMsg);
    }
  };`;

const replacement = `  const deleteEntry = (id: string | number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      let data = history.filter((entry: MetricEntry) => entry.id !== deleteConfirmId);
      localStorage.setItem('ratbod_history', JSON.stringify(data));
      
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'appData', 'history'), { history: data }, { merge: true }).catch(e => {});
      }
      
      // Refresh history
      fetchHistory();
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete entry:', error);
      const errMsg = lang === 'bn'
        ? 'পরিমাপটি ডিলিট করা সম্ভব হয়নি। দয়া করে আবার চেষ্টা করুন।'
        : 'Failed to delete measurement. Please try again.';
      alert(errMsg);
      setDeleteConfirmId(null);
    }
  };`;

if (content.includes(target)) {
  fs.writeFileSync(path, content.replace(target, replacement));
  console.log("Successfully replaced deleteEntry");
} else {
  console.log("Target not found!");
}
