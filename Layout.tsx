import React, { useState, useEffect } from 'react';
import { UserProfile, AppNotification } from '../types';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, limit } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  LayoutDashboard, 
  Package, 
  Cpu, 
  FileText, 
  LogOut,
  User as UserIcon,
  Bell,
  X,
  Check
} from 'lucide-react';
import { cn } from '../utils';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  profile: UserProfile;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Layout({ children, profile, activeTab, setActiveTab }: LayoutProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'assets', label: 'ASSETS', icon: Package },
    { id: 'twin', label: 'DIGITAL TWIN', icon: Cpu },
    { id: 'leases', label: 'LEASES', icon: FileText },
  ];

  useEffect(() => {
    if (!profile) return;

    const targetId = profile.role === 'Admin' ? 'admin' : profile.uid;
    
    // Simplified query to avoid composite index requirements
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', targetId)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as AppNotification));
      
      // Sort client-side to avoid index requirement
      fetchedNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setNotifications(fetchedNotifications.slice(0, 10));
    }, (error) => {
      console.error("Notification sync error:", error);
    });

    return () => unsub();
  }, [profile]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#141414] flex flex-col">
        <div className="p-6 border-bottom border-[#141414]">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center">
              <Cpu className="text-white w-5 h-5" />
            </div>
            <span className="font-bold tracking-tighter text-xl">ORCHESTRATOR</span>
          </div>
          <div className="mt-1 text-[10px] font-mono opacity-50">SYSTEM VERSION 1.0.26</div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
                activeTab === item.id 
                  ? "bg-[#141414] text-white" 
                  : "hover:bg-black/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-[#141414]">
          <div className="bg-black/5 p-4 rounded-2xl space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-full border border-[#141414] flex items-center justify-center overflow-hidden">
                <UserIcon className="w-6 h-6 opacity-20" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{profile.name}</p>
                <p className="text-[10px] font-mono opacity-50 uppercase">{profile.role}</p>
              </div>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-bold border border-[#141414] rounded-xl hover:bg-[#141414] hover:text-white transition-all"
            >
              <LogOut className="w-3 h-3" />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-[#141414] flex items-center justify-between px-8 bg-white/50 backdrop-blur-sm relative z-40">
          <div className="flex items-center space-x-4">
            <h2 className="font-serif italic text-lg">
              {navItems.find(i => i.id === activeTab)?.label || 'OVERVIEW'}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-black/5 rounded-full relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#E4E3E0]"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-[#141414] rounded-2xl shadow-2xl z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-[#141414] bg-black/5 flex justify-between items-center">
                        <h4 className="font-bold text-xs uppercase tracking-widest">Notifications</h4>
                        <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4" /></button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center opacity-30 text-xs font-mono">NO NEW ALERTS</div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "p-4 border-b border-black/5 last:border-0 hover:bg-black/5 transition-all relative group",
                                !n.read && "bg-emerald-500/5"
                              )}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{n.type}</span>
                                <span className="text-[8px] opacity-40 font-mono">{formatDistanceToNow(new Date(n.createdAt))} ago</span>
                              </div>
                              <p className="text-xs font-bold">{n.title}</p>
                              <p className="text-[10px] opacity-60 mt-1">{n.message}</p>
                              {!n.read && (
                                <button 
                                  onClick={() => markAsRead(n.id)}
                                  className="absolute right-2 bottom-2 p-1 bg-emerald-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-[1px] bg-[#141414] opacity-20"></div>
            <div className="text-right">
              <p className="text-[10px] font-mono opacity-50 uppercase">System Status</p>
              <p className="text-xs font-bold text-emerald-600">OPERATIONAL</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
