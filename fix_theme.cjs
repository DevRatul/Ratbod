const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Change the initial state
// It's currently: const [darkMode, setDarkMode] = useState(true);
const currentHour = new Date().getHours();
const isDaytime = currentHour >= 6 && currentHour < 18;
// But wait, the component runs on the client. It's better to just do this in useState initialization.

content = content.replace(
  "const [darkMode, setDarkMode] = useState(true);",
  "const [darkMode, setDarkMode] = useState(() => {\n    const currentHour = new Date().getHours();\n    const isDaytime = currentHour >= 6 && currentHour < 18;\n    return !isDaytime;\n  });"
);

content = content.replace(
  "const savedDarkMode = rawDarkMode === null ? true : rawDarkMode === 'true';",
  "const currentHour = new Date().getHours();\n          const isDaytime = currentHour >= 6 && currentHour < 18;\n          const savedDarkMode = rawDarkMode === null ? !isDaytime : rawDarkMode === 'true';"
);

fs.writeFileSync(path, content);
console.log("Fixed Theme Logic");
