import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';
import { Box, Shield, Activity, LogOut, User as UserIcon } from 'lucide-react';

export function Login() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  const handleLogin = async () => {
    console.log("Login button clicked");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    try {
      console.log("Initiating signInWithPopup...");
      const result = await signInWithPopup(auth, provider);
      console.log("signInWithPopup success:", result.user.email);
    } catch (error: any) {
      console.error('Login failed:', error);
      alert(`Login failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center space-x-4 mb-8">
          <div className="w-16 h-16 bg-emerald-500 flex items-center justify-center rounded-2xl rotate-3">
            <Box className="text-black w-8 h-8" />
          </div>
          <div className="w-16 h-16 bg-white/10 flex items-center justify-center rounded-2xl -rotate-3 border border-white/20">
            <Activity className="text-white w-8 h-8" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white tracking-tighter">
            ORCHESTRATOR <span className="text-emerald-500">v1.0</span>
          </h1>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">
            State-Driven Resource Management
          </p>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl space-y-6">
          <p className="text-zinc-400 text-sm leading-relaxed">
            Access the digital twin infrastructure management system. 
            Secure authentication required for role-based orchestration.
          </p>
          
          {currentUser ? (
            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex items-center space-x-4">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <UserIcon className="text-white w-5 h-5" />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-white text-xs font-bold truncate">{currentUser.displayName}</p>
                  <p className="text-zinc-500 text-[10px] truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => signOut(auth)}
                  className="bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-all flex items-center justify-center space-x-2 text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>SIGN OUT</span>
                </button>
                <button
                  onClick={handleLogin}
                  className="bg-white text-black font-bold py-3 rounded-xl hover:bg-emerald-500 transition-all flex items-center justify-center space-x-2 text-xs"
                >
                  <Shield className="w-4 h-4" />
                  <span>SWITCH</span>
                </button>
              </div>
              <p className="text-[10px] text-amber-500 font-mono uppercase">
                Profile initialization pending...
              </p>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-emerald-500 transition-all flex items-center justify-center space-x-3 group"
            >
              <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>AUTHENTICATE WITH GOOGLE</span>
            </button>
          )}
          
          <div className="pt-4 border-t border-white/5">
            <p className="text-[10px] text-zinc-600 font-mono uppercase">
              Authorized Personnel Only • Encrypted Session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
