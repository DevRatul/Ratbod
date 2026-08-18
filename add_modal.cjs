const fs = require('fs');
const path = './src/components/History.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `    </div>
  );
}`;

const replacement = `      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              "w-full max-w-xs p-6 rounded-3xl shadow-2xl",
              darkMode ? "bg-[#111] border border-white/10" : "bg-white"
            )}
          >
            <h3 className={cn("text-lg font-black tracking-tight mb-2 text-center", darkMode ? "text-white" : "text-gray-900")}>
              {lang === 'bn' ? 'নিশ্চিত করুন' : 'Are you sure?'}
            </h3>
            <p className={cn("text-sm text-center mb-6", darkMode ? "text-gray-400" : "text-gray-500")}>
              {lang === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?' : 'Are you sure you want to delete this measurement? This action cannot be undone.'}
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className={cn(
                  "flex-1 py-3 rounded-2xl text-sm font-bold transition-all",
                  darkMode ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                )}
              >
                {lang === 'bn' ? 'না' : 'No'}
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-2xl text-sm font-bold bg-red-500 hover:bg-red-600 text-white transition-all shadow-lg shadow-red-500/30"
              >
                {lang === 'bn' ? 'হ্যাঁ' : 'Yes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}`;

fs.writeFileSync(path, content.replace(target, replacement));
console.log("Added modal to History.tsx");
