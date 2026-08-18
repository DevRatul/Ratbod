const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add Calendar, Target, Save to lucide-react imports
if (!content.includes('Calendar,')) {
  content = content.replace(
    "} from 'lucide-react';",
    "  Calendar,\n  Target,\n  Save\n} from 'lucide-react';"
  );
}

// 2. Change saveMeasurement to handleSaveMetrics
content = content.replace(/onClick=\{saveMeasurement\}/g, "onClick={handleSaveMetrics}");

// 3. Remove isSaving (since it's not defined)
content = content.replace(/disabled=\{isSaving \|\| !metrics\}/g, "disabled={!metrics}");
content = content.replace(/\{isSaving \? \(lang === 'bn' \? 'সংরক্ষণ করা হচ্ছে...' : 'Saving\.\.\.'\) : \(lang === 'bn' \? 'পরিমাপ সংরক্ষণ করুন' : 'Save Measurement'\)\}/g, "{lang === 'bn' ? 'পরিমাপ সংরক্ষণ করুন' : 'Save Measurement'}");

// 4. Fix History.tsx errors (missing doc, db, setDoc, getDoc, auth in History.tsx)
let historyContent = fs.readFileSync('src/components/History.tsx', 'utf8');
if (!historyContent.includes("import { doc,")) {
  historyContent = historyContent.replace(
    "import { twMerge } from 'tailwind-merge';",
    "import { twMerge } from 'tailwind-merge';\nimport { doc, getDoc, setDoc } from 'firebase/firestore';\nimport { auth, db } from '../lib/firebase';"
  );
}
fs.writeFileSync('src/components/History.tsx', historyContent);

fs.writeFileSync('src/App.tsx', content);
