import { useState } from 'react';
import { 
  Search,
  Plus,
  Activity,
  Menu
} from 'lucide-react';
import { motion } from 'motion/react';

// Components
import Sidebar from './components/Sidebar';
import NexusAssistant from './components/NexusAssistant';
import TaskManager from './components/TaskManager';
import InsightsOverviews from './components/InsightsOverviews';
import SettingsView from './components/SettingsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('assistant');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-200 font-sans overflow-hidden">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
      />
      
      <main className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Topbar */}
        <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-[#0a0a0a]/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs md:text-sm font-mono text-gray-400">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">NEXUS_LM // SYSTEM_ONLINE</span>
              <span className="sm:hidden">NEXUS_LM</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Query knowledge base..." 
                className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-sm focus:outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-colors w-48 lg:w-64"
              />
            </div>
            <button className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium flex items-center gap-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Query</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'assistant' && <NexusAssistant />}
            {activeTab === 'tasks' && <TaskManager />}
            {activeTab === 'overviews' && <InsightsOverviews />}
            {activeTab === 'settings' && <SettingsView />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
