import { Upload, File, Search, Filter, HardDrive, ChevronRight } from 'lucide-react';

export default function KnowledgeBase() {
  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Knowledge Base</h1>
          <p className="text-sm text-gray-400 mt-1">Semantic Firewall & Document Ingestion</p>
        </div>
        <button className="bg-white text-black hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Upload className="w-4 h-4" />
          Ingest Document
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left Col: Documents */}
        <div className="col-span-1 border border-white/10 rounded-xl bg-[#141414] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              Local Storage
            </h2>
            <span className="text-xs font-mono text-gray-500">SQLite</span>
          </div>
          <div className="p-2 flex-1 overflow-auto space-y-1">
            {[
              { name: 'Q3_Financial_Report.pdf', status: 'Indexed', chunks: 142 },
              { name: 'System_Architecture_v2.md', status: 'Indexed', chunks: 56 },
              { name: 'Meeting_Notes_Oct.txt', status: 'Processing', chunks: 0 },
              { name: 'Competitor_Analysis.docx', status: 'Indexed', chunks: 89 },
            ].map((doc, i) => (
              <div key={i} className="p-3 rounded-lg hover:bg-white/5 cursor-pointer group transition-colors flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <File className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="truncate">
                    <div className="text-sm text-gray-200 truncate">{doc.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                      <span className={doc.status === 'Processing' ? 'text-amber-500' : 'text-emerald-500'}>
                        {doc.status}
                      </span>
                      <span>•</span>
                      <span>{doc.chunks} chunks</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            ))}
          </div>
        </div>

        {/* Right Col: Semantic Chunks */}
        <div className="col-span-2 border border-white/10 rounded-xl bg-[#141414] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Semantic Chunks</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Search chunks..." 
                  className="bg-black/50 border border-white/10 rounded-md pl-8 pr-3 py-1 text-xs focus:outline-none focus:border-emerald-500/50 w-48"
                />
              </div>
              <button className="p-1.5 rounded-md border border-white/10 hover:bg-white/5 text-gray-400">
                <Filter className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {/* Chunk Example */}
            <div className="border border-white/5 bg-black/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono uppercase border border-emerald-500/20">
                    Header 2
                  </span>
                  <span className="text-xs text-gray-500 font-mono">System_Architecture_v2.md : L45-L62</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">Similarity: 0.92</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                The REER Engine utilizes a gradient-free local search mutation strategy. Instead of relying on traditional backpropagation, it evaluates perplexity (PPL) scores across a neighborhood of semantic mutations to determine the optimal reasoning trajectory.
              </p>
            </div>
            
            <div className="border border-white/5 bg-black/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-mono uppercase border border-blue-500/20">
                    Paragraph
                  </span>
                  <span className="text-xs text-gray-500 font-mono">System_Architecture_v2.md : L64-L70</span>
                </div>
                <span className="text-xs text-gray-500 font-mono">Similarity: 0.88</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                This approach significantly reduces computational overhead during the reasoning phase, allowing for real-time synthesis of complex multi-document queries without requiring a GPU cluster for inference scaling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
