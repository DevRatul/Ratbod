const fs = require('fs');

let content = fs.readFileSync('src/components/History.tsx', 'utf8');

// We need to replace the entire table block from `<div className={cn(\n        "rounded-3xl border overflow-hidden shadow-sm"` 
// to `</motion.tr>\n                );\n              })}\n            </tbody>\n          </table>\n        </div>\n      </div>`

const newStructure = `
      <div className="space-y-4">
        {history.map((entry, index) => {
          const prevEntry = history[index + 1];
          const weightDiff = prevEntry ? entry.weight - prevEntry.weight : 0;
          const displayDiff = unit === 'metric' ? weightDiff : weightDiff * 2.20462;
          
          return (
            <motion.div 
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-4 rounded-3xl border", 
                darkMode ? "bg-[#111111] border-white/5" : "bg-white border-black/5 shadow-sm"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl", darkMode ? "bg-emerald-500/10 text-emerald-500" : "bg-emerald-100 text-emerald-600")}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div className={cn("font-black text-sm", darkMode ? "text-white" : "text-gray-900")}>
                      {formatDate(entry.date)}
                    </div>
                    <div className="text-[10px] text-gray-500 font-bold">
                      {formatNum(new Date(entry.date).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : undefined, { hour: '2-digit', minute: '2-digit' }))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {Math.abs(weightDiff) > 0.05 ? (
                    <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black", weightDiff > 0 ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500")}>
                       {weightDiff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                       {formatNum(Math.abs(displayDiff).toFixed(1))}
                    </div>
                  ) : (
                    <div className={cn("px-2 py-1 rounded-lg text-[10px] font-black flex items-center justify-center", darkMode ? "bg-white/5 text-gray-500" : "bg-gray-100 text-gray-400")}>
                       <Minus size={12} />
                    </div>
                  )}
                  
                  <button onClick={() => deleteEntry(entry.id)} className="text-red-500 hover:text-red-400 p-1 cursor-pointer transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className={cn("p-3 rounded-2xl flex flex-col justify-center", darkMode ? "bg-[#1A1A1A]" : "bg-gray-50")}>
                   <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                     <Scale size={10} /> {lang === 'bn' ? 'ওজন' : 'WEIGHT'}
                   </div>
                   <div className={cn("text-lg font-black", darkMode ? "text-white" : "text-gray-900")}>
                     {unit === 'metric' ? formatNum(entry.weight) : formatNum((entry.weight * 2.20462).toFixed(1))} <span className="text-xs font-bold text-gray-500">{unit === 'metric' ? 'kg' : 'lb'}</span>
                   </div>
                </div>
                <div className={cn("p-3 rounded-2xl flex flex-col justify-center", darkMode ? "bg-[#1A1A1A]" : "bg-gray-50")}>
                   <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">
                     {lang === 'bn' ? 'বিএমআই' : 'BMI'}
                   </div>
                   <div className={cn("text-lg font-black", darkMode ? "text-white" : "text-gray-900")}>
                     {formatNum(entry.bmi.toFixed(1))} <span className="text-[10px] font-bold text-gray-500">kg/m²</span>
                   </div>
                </div>
                <div className={cn("p-3 rounded-2xl flex flex-col justify-center", darkMode ? "bg-[#1A1A1A]" : "bg-gray-50")}>
                   <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                     <Activity size={10} /> {lang === 'bn' ? 'শরীরের চর্বি' : 'BODY FAT'}
                   </div>
                   <div className={cn("text-lg font-black", darkMode ? "text-white" : "text-gray-900")}>
                     {formatNum(entry.bodyFat.toFixed(1))}%
                   </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>`;

// Use regex to replace the old div containing the table with newStructure
const startStr = '<div className={cn(';
const endStr = '</table>\n        </div>\n      </div>';
const regex = /<div className=\{cn\([\s\S]*?<\/table>\s*<\/div>\s*<\/div>/;

if (regex.test(content)) {
  content = content.replace(regex, newStructure);
  fs.writeFileSync('src/components/History.tsx', content);
  console.log("History.tsx updated successfully.");
} else {
  console.log("Failed to find the table block in History.tsx");
}

