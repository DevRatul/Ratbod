const fs = require('fs');

let profile = fs.readFileSync('src/components/ProfileModal.tsx.tmp', 'utf8');

const targetWeightUI = `
          <div className="space-y-1.5">
            <label className={cn("text-[10px] font-bold uppercase tracking-wider flex justify-between", darkMode ? "text-gray-400" : "text-gray-600")}>
              <span>Target Weight (Goal)</span>
              <span>{unit === 'metric' ? 'kg' : 'lbs'}</span>
            </label>
            <input
              type="number"
              value={targetWeight || ''}
              onChange={(e) => setTargetWeight && setTargetWeight(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-sm",
                darkMode ? "bg-black/50 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-900"
              )}
              placeholder="e.g. 75"
            />
          </div>
`;

profile = profile.replace(
  '          </div>\n        </div>\n        \n        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">',
  '          </div>\n' + targetWeightUI + '\n        </div>\n        \n        <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">'
);

fs.writeFileSync('src/components/ProfileModal.tsx', profile);
