const fs = require('fs');

let profile = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

// Add props to interface
profile = profile.replace(
  "unit: 'metric' | 'imperial';",
  "unit: 'metric' | 'imperial';\n  targetWeight?: string;\n  setTargetWeight?: (w: string) => void;"
);

// Add props to destructuring
profile = profile.replace(
  "height, setHeight, unit",
  "height, setHeight, unit, targetWeight, setTargetWeight"
);

// Find where height is rendered to add targetWeight underneath
const heightInput = `
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Height
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className={cn("w-full border rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all", darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900")}
                  placeholder="0.0"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                  {unit === 'metric' ? 'cm' : 'in'}
                </span>
              </div>
            </div>`;

// Wait, let's just see how it's actually written inside ProfileModal.tsx
fs.writeFileSync('src/components/ProfileModal.tsx.tmp', profile);
