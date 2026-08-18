const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!content.includes("import { onAuthStateChanged }")) {
  content = content.replace(
    "import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';",
    "import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';\nimport { onAuthStateChanged } from 'firebase/auth';"
  );
}

// Need to define a user state as well
if (!content.includes("const [authUser, setAuthUser]")) {
  content = content.replace(
    "const [activeTab, setActiveTab]",
    "const [authUser, setAuthUser] = useState(auth.currentUser);\n  const [activeTab, setActiveTab]"
  );
}

// Replace the loadProfile useEffect
const loadProfileStart = content.indexOf('// Load from Firestore (fallback to localStorage) on mount');
const syncStart = content.indexOf('// Sync back to localStorage & Firestore');

if (loadProfileStart !== -1 && syncStart !== -1) {
  const newLoadProfile = `// Load from Firestore (fallback to localStorage) on auth state change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      
      let loadedFromDb = false;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) setName(data.name);
            if (data.gender) setGender(data.gender);
            if (data.birthdate) setBirthdate(data.birthdate);
            if (data.age) setAge(data.age);
            if (data.height) setHeight(data.height);
            if (data.weight) setWeight(data.weight);
            if (data.waist) setWaist(data.waist);
            if (data.neck) setNeck(data.neck);
            if (data.hip) setHip(data.hip);
            if (data.activityLevel) setActivityLevel(data.activityLevel);
            if (data.unit) setUnit(data.unit);
            if (data.darkMode !== undefined) setDarkMode(data.darkMode);
            if (data.lang) setLang(data.lang);
            loadedFromDb = true;
          }
        } catch (e) {
          console.error('Error loading profile:', e);
        }
      }

      if (!loadedFromDb) {
        // Do not fallback to local storage if user is signed in to prevent local leak over to new account
        if (user) {
          // Keep fields empty for new user
          // Don't overwrite basic preferences if they already exist, but for a brand new user, set defaults
        } else {
          // If no user load local
          const savedName = localStorage.getItem('ratbod_name') || '';
          const savedGender = localStorage.getItem('ratbod_gender') as Gender || 'male';
          const savedBirthdate = localStorage.getItem('ratbod_birthdate') || '';
          const savedAge = localStorage.getItem('ratbod_age') || '';
          const savedHeight = localStorage.getItem('ratbod_height') || '';
          const savedWeight = localStorage.getItem('ratbod_weight') || '';
          const savedWaist = localStorage.getItem('ratbod_waist') || '';
          const savedNeck = localStorage.getItem('ratbod_neck') || '';
          const savedHip = localStorage.getItem('ratbod_hip') || '';
          const savedActivity = localStorage.getItem('ratbod_activity') as ActivityLevel || 'sedentary';
          const savedUnit = localStorage.getItem('ratbod_unit') as 'metric' | 'imperial' || 'metric';
          const rawDarkMode = localStorage.getItem('ratbod_darkmode');
          const savedDarkMode = rawDarkMode === null ? true : rawDarkMode === 'true';
          const savedLang = localStorage.getItem('ratbod_lang') as 'en' | 'bn' || 'en';

          setName(savedName);
          setGender(savedGender);
          setBirthdate(savedBirthdate);
          setAge(savedAge);
          setHeight(savedHeight);
          setWeight(savedWeight);
          setWaist(savedWaist);
          setNeck(savedNeck);
          setHip(savedHip);
          setActivityLevel(savedActivity);
          setUnit(savedUnit);
          setDarkMode(savedDarkMode);
          setLang(savedLang);
        }
      }
      setIsLoaded(true);
    });

    return () => unsubscribe();
  }, []);

  `;

  content = content.substring(0, loadProfileStart) + newLoadProfile + content.substring(syncStart);
}

// Then in the sync effect, use authUser instead of auth.currentUser
// Also, prevent syncing back to Firestore on mount. We should only sync when things actually change!
// The problem is that set...() from loadProfile will trigger the sync effect.
// Wait, the sync effect has: if (!isLoaded) return;
// Since we now wait for onAuthStateChanged and THEN setIsLoaded(true), the first render with isLoaded=true will have the values fetched from DB.
// So the sync effect WILL write them back, which is fine, because it's writing back the same data.
// But we still need to make sure authUser is used.
content = content.replace(/const user = auth\.currentUser;/g, "const user = authUser || auth.currentUser;");

// Update 'isLoggedIn' to use authUser
content = content.replace(/!!auth\.currentUser/g, "!!authUser");
content = content.replace(/!!user/g, "!!authUser");

fs.writeFileSync('src/App.tsx', content);
