const fs = require('fs');
const path = './src/components/History.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `  const clearLocalHistory = async () => {
    const confirmMsg = lang === 'bn' 
      ? 'আপনি কি নিশ্চিত যে আপনি আপনার সম্পূর্ণ ইতিহাস ডিলিট করতে চান?' 
      : 'Are you sure you want to clear your local history?';
    if (window.confirm(confirmMsg)) {
      localStorage.removeItem('ratbod_history');
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'appData', 'history'), { history: [] }, { merge: true }).catch(e => {});
      }
      fetchHistory();
    }
  };`;

content = content.replace(target, '');
fs.writeFileSync(path, content);
console.log("Removed clearLocalHistory");
