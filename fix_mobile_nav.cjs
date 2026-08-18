const fs = require('fs');
const path = './src/App.tsx';
let content = fs.readFileSync(path, 'utf8');

const navRegex = /\{\/\* Mobile Sticky Tab Navigation \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/;

const navMatch = content.match(navRegex);
if (navMatch) {
  content = content.replace(navMatch[0], "");
  content = content.replace("    </PullToRefresh>\n    </>", "    </PullToRefresh>\n" + navMatch[0] + "\n    </>");
  fs.writeFileSync(path, content);
  console.log("Moved Mobile Nav outside PullToRefresh");
} else {
  console.log("Could not find mobile nav block");
}
