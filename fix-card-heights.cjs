const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// The request: "The goal progress bar in the mobile view section will be slimmer and thinner."
// "Also, the latest entry and health status will be thinner too."
// Let's change `h-36` to `h-28`, and `p-5` to `p-4`

content = content.replace(
  /p-5 rounded-3xl border flex flex-col justify-between h-36/g,
  "p-4 rounded-3xl border flex flex-col justify-between h-28"
);
content = content.replace(
  /p-5 rounded-3xl border flex flex-col justify-between h-36 col-span-2 md:col-span-1/g,
  "p-4 rounded-3xl border flex flex-col justify-between h-28 col-span-2 md:col-span-1"
);

// We should also adjust some text sizes to fit the smaller height if needed
content = content.replace(
  /<div className=\{cn\("text-3xl font-black", darkMode \? "text-white" : "text-gray-900"\)\}>/g,
  '<div className={cn("text-2xl font-black", darkMode ? "text-white" : "text-gray-900")}>'
);
content = content.replace(
  /<div className=\{cn\("text-2xl font-black capitalize", darkMode \? "text-white" : "text-gray-900"\)\}>/g,
  '<div className={cn("text-xl font-black capitalize", darkMode ? "text-white" : "text-gray-900")}>'
);
content = content.replace(
  /<div className="flex items-center gap-2 text-3xl font-black text-emerald-500">/g,
  '<div className="flex items-center gap-2 text-2xl font-black text-emerald-500">'
);
content = content.replace(
  /<div className="space-y-3">/g,
  '<div className="space-y-2">'
);


// Now replace the Flame icon for Health Status / Results
content = content.replace(/Flame/g, "HeartPulse");
content = content.replace(/<HeartPulse size=\{12\} className="text-rose-500" \/>/g, '<HeartPulse size={12} className="text-rose-500" />');

fs.writeFileSync('src/App.tsx', content);
