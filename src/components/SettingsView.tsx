import { useState } from 'react';
import { Database, BrainCircuit } from 'lucide-react';
import KnowledgeBase from './KnowledgeBase';
import ReerEngine from './ReerEngine';

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'reer'>('knowledge');

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'knowledge' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" /> Knowledge Base
        </button>
        <button
          onClick={() => setActiveTab('reer')}
          className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'reer' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <BrainCircuit className="w-4 h-4" /> REER Engine
        </button>
      </div>

      <div className="flex-1 min-h-0">
        {activeTab === 'knowledge' && <KnowledgeBase />}
        {activeTab === 'reer' && <ReerEngine />}
      </div>
    </div>
  );
}
