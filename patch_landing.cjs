const fs = require('fs');
const path = './src/components/LandingPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const rightSideTarget = /\{\/\* Right Graphics - Demo Data Mockup \*\/\}([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/;

const newRightSide = `{/* Right Graphics - 5 Tools Bento Grid */
            <div className="relative w-full h-[500px] hidden lg:block"> 
               {/* Background blur effects */}
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />
               <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none" />

               <div className="grid grid-cols-2 gap-4 relative z-20 absolute top-1/2 -translate-y-1/2 right-0 w-full max-w-lg origin-center rotate-2 hover:rotate-0 transition-transform duration-700">
                  
                  {/* Tool 1: Health Tracker */}
                  <div className="col-span-2 p-5 rounded-3xl border bg-[#0F0F0F] border-white/10 shadow-2xl shadow-black/50">
                    <div className="flex justify-between items-start text-[10px] font-black uppercase tracking-wider text-gray-500 mb-3">
                      <div className="flex items-center gap-1.5"><Activity size={14} className="text-rose-500" />Health Tracker</div>
                      <div className="px-2 py-1 rounded-md text-[9px] flex items-center gap-1 bg-emerald-500/10 text-emerald-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Normal
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black tracking-tighter text-white">68.5</span>
                          <span className="text-sm font-bold text-gray-500">kg</span>
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 mt-1">Latest BMI: 22.4</div>
                      </div>
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full bg-rose-500/20 border-2 border-[#0F0F0F] flex items-center justify-center"><Activity size={12} className="text-rose-500" /></div>
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 border-2 border-[#0F0F0F] flex items-center justify-center"><Target size={12} className="text-blue-500" /></div>
                      </div>
                    </div>
                  </div>

                  {/* Tool 2: Goal Progress */}
                  <div className="p-5 rounded-3xl border bg-[#0F0F0F] border-emerald-500/30 shadow-2xl shadow-emerald-500/10">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4">
                      Goal Progress <Target size={14} className="text-emerald-500" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-2xl font-black text-emerald-500 tracking-tighter">
                        75% <TrendingDown size={20} className="text-emerald-500" />
                      </div>
                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/10">
                         <div className="h-full bg-emerald-500 w-[75%]" />
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold">Target: 65.0 kg</div>
                    </div>
                  </div>

                  {/* Tool 3: Water Tracker */}
                  <div className="p-5 rounded-3xl border bg-[#0F0F0F] border-cyan-500/30 shadow-2xl shadow-cyan-500/10 relative overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
                      <Droplet size={80} className="text-cyan-500" />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4 relative z-10">
                      Water Intake <Droplet size={14} className="text-cyan-500" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black tracking-tighter text-cyan-500">5</span>
                        <span className="text-sm font-bold text-gray-500">/ 8</span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-500">Glasses today</div>
                    </div>
                  </div>

                  {/* Tool 4: Groceries Planner */}
                  <div className="p-5 rounded-3xl border bg-[#0F0F0F] border-orange-500/30 shadow-2xl shadow-orange-500/10 relative overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
                      <ShoppingCart size={80} className="text-orange-500" />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4 relative z-10">
                      Meal Planner <ShoppingCart size={14} className="text-orange-500" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black tracking-tighter text-orange-500">12</span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-500">Items planned</div>
                    </div>
                  </div>

                  {/* Tool 5: Mindfulness */}
                  <div className="p-5 rounded-3xl border bg-[#0F0F0F] border-purple-500/30 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 opacity-10 pointer-events-none">
                      <Wind size={80} className="text-purple-500" />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-gray-500 mb-4 relative z-10">
                      Mindfulness <Wind size={14} className="text-purple-500" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black tracking-tighter text-purple-500">10</span>
                        <span className="text-sm font-bold text-gray-500">m</span>
                      </div>
                      <div className="text-[10px] font-bold text-gray-500">Session length</div>
                    </div>
                  </div>

               </div>
            </div>
          </div>
        </div>
      </section>`;

content = content.replace(rightSideTarget, newRightSide);
fs.writeFileSync(path, content);
console.log("Patched LandingPage with Bento Grid!");
