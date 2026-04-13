import { Database, BrainCircuit, Network, FileText, Settings, MessageSquare, Mic, Radio, LogIn, LogOut, LayoutDashboard, CheckSquare, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, logOut } from '../firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';

const mainTabs = [
  { id: 'assistant', label: 'Nexus Assistant', icon: MessageSquare },
  { id: 'tasks', label: 'Task Manager', icon: CheckSquare },
  { id: 'overviews', label: 'Insights & Overviews', icon: LayoutDashboard },
];

const settingTabs = [
  { id: 'settings', label: 'System Settings', icon: Settings },
];

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isOpen, 
  setIsOpen 
}: { 
  activeTab: string; 
  setActiveTab: (id: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsOpen(false); // Close on mobile when a tab is clicked
  };

  const sidebarContent = (
    <aside className="w-64 border-r border-white/10 bg-[#0f0f0f] flex flex-col h-full">
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
            <Network className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold tracking-wider text-white">NEXUS</span>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          className="md:hidden p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
        <div>
          <div className="px-3 mb-2 text-xs font-mono text-gray-500 uppercase tracking-wider">Interactions</div>
          <div className="space-y-1">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive 
                      ? 'bg-white/10 text-white font-medium' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-xs font-mono text-gray-500 uppercase tracking-wider">Configuration</div>
          <div className="space-y-1">
            {settingTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive 
                      ? 'bg-white/10 text-white font-medium' 
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-white/10 shrink-0">
        {user ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <span className="text-xs text-gray-300 truncate">{user.displayName || user.email}</span>
            </div>
            <button onClick={logOut} className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors shrink-0 ml-2" title="Sign Out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={signInWithGoogle} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm bg-emerald-500 text-black hover:bg-emerald-600 transition-colors font-medium">
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 md:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
