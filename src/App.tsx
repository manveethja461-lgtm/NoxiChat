import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, googleProvider } from './lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';

export default function App() {
  const [user, loading] = useAuthState(auth);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center"
        >
          <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">NoxiChat</h1>
          <p className="text-slate-500 mb-8">Connect with your friends in real-time. Simple, secure, and fast.</p>
          <button
            onClick={() => signInWithPopup(auth, googleProvider)}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-indigo-200"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      <Sidebar 
        currentUser={user!} 
        selectedChatId={selectedChatId} 
        onSelectChat={setSelectedChatId} 
      />
      <main className="flex-1 relative">
        <AnimatePresence mode="wait">
          {selectedChatId ? (
            <div key={selectedChatId} className="h-full">
              <ChatWindow 
                chatId={selectedChatId} 
                currentUser={user!} 
              />
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center"
            >
              <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                <MessageSquare size={48} />
              </div>
              <h2 className="text-xl font-semibold text-slate-600">Welcome to NoxiChat</h2>
              <p className="max-w-xs mt-2">Select a conversation or start a new one to begin chatting.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
