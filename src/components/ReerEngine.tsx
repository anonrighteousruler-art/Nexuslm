import { useState, useEffect } from 'react';
import { Play, Square, Activity, Cpu, Zap } from 'lucide-react';

export default function ReerEngine() {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const ppl = (Math.random() * 2 + 1).toFixed(4);
      const mutation = Math.random().toString(36).substring(7);
      setLogs(prev => [...prev, `[REER] Evaluated mutation ${mutation} | PPL: ${ppl} | Status: ${Math.random() > 0.7 ? 'ACCEPTED' : 'REJECTED'}`].slice(-15));
    }, 800);
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">REER Engine</h1>
          <p className="text-sm text-gray-400 mt-1">REverse-Engineered Reasoning & PPL-guided mutation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141414] border border-white/10">
            <Cpu className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-mono text-gray-300">Local Compute</span>
          </div>
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
              isRunning 
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20' 
                : 'bg-emerald-500 text-black hover:bg-emerald-600'
            }`}
          >
            {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Halt Engine' : 'Initialize Search'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Col: Configuration */}
        <div className="col-span-1 border border-white/10 rounded-xl bg-[#141414] p-5 flex flex-col gap-6">
          <div>
            <h3 className="text-sm font-medium text-white mb-4">Mutation Parameters</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Temperature</span>
                  <span className="text-gray-200 font-mono">0.7</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[70%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Max Mutations</span>
                  <span className="text-gray-200 font-mono">1000</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[40%]"></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">PPL Threshold</span>
                  <span className="text-gray-200 font-mono">1.5</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[15%]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 border border-white/5 rounded-lg bg-black/20 p-4 flex flex-col">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Live Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="flex flex-col justify-center">
                <span className="text-3xl font-light text-white font-mono">
                  {isRunning ? (Math.random() * 0.5 + 1.1).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-gray-500 uppercase mt-1">Current PPL</span>
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-3xl font-light text-white font-mono">
                  {isRunning ? Math.floor(Math.random() * 50 + 200) : '0'}
                </span>
                <span className="text-[10px] text-gray-500 uppercase mt-1">Mutations/sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Terminal Log */}
        <div className="col-span-2 border border-white/10 rounded-xl bg-[#0a0a0a] flex flex-col overflow-hidden relative">
          <div className="p-3 border-b border-white/10 flex items-center gap-2 bg-[#141414]">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-mono text-gray-400">REER_TRAJECTORY_LOG</span>
          </div>
          <div className="flex-1 p-4 overflow-auto font-mono text-xs space-y-1.5">
            {!isRunning && logs.length === 0 && (
              <div className="text-gray-600 italic">Engine idle. Awaiting initialization...</div>
            )}
            {logs.map((log, i) => (
              <div key={i} className={`${log.includes('ACCEPTED') ? 'text-emerald-400' : 'text-gray-500'}`}>
                <span className="text-gray-600 mr-3">{new Date().toISOString().split('T')[1].slice(0, -1)}</span>
                {log}
              </div>
            ))}
            {isRunning && (
              <div className="flex items-center gap-2 text-emerald-500 mt-2">
                <span className="w-2 h-4 bg-emerald-500 animate-pulse"></span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
