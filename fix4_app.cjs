const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

// Undo the early closing of PullToRefresh
content = content.replace(
  /<\/div>\n\s*<\/PullToRefresh>\n\s*<ProfileModal/,
  `</div>\n    <ProfileModal`
);

// Close PullToRefresh at the end
content = content.replace(
  /    <\/div>\n\s*<\/>\n\s*\);\n\}/,
  `    </div>\n    </PullToRefresh>\n    </>\n  );\n}`
);

fs.writeFileSync(path, content);
console.log("Fixed JSX closing tags");
