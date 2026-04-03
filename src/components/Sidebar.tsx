import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { ChatUser, Chat } from '../types';
import { Search, Plus, LogOut, MessageSquare, User as UserIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { User as FirebaseUser, signOut } from 'firebase/auth';

interface SidebarProps {
  currentUser: FirebaseUser;
  selectedChatId: string | null;
  onSelectChat: (id: string) => void;
}

export default function Sidebar({ currentUser, selectedChatId, onSelectChat }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchError, setSearchError] = useState('');
  const [users, setUsers] = useState<{ [key: string]: ChatUser }>({});

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Chat[];
      setChats(chatList);

      // Fetch user profiles for participants
      chatList.forEach(chat => {
        chat.participants.forEach(async (uid) => {
          if (uid !== currentUser.uid && !users[uid]) {
            const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
            if (!userSnap.empty) {
              const userData = userSnap.docs[0].data() as ChatUser;
              setUsers(prev => ({ ...prev, [uid]: userData }));
            }
          }
        });
      });
    }, (error) => {
      console.error("Firestore Error in Sidebar: ", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');

    if (searchEmail === currentUser.email) {
      setSearchError("You can't chat with yourself!");
      return;
    }

    try {
      const userSnap = await getDocs(query(collection(db, 'users'), where('email', '==', searchEmail)));
      
      if (userSnap.empty) {
        setSearchError('User not found.');
        return;
      }

      const targetUser = userSnap.docs[0].data() as ChatUser;

      // Check if chat already exists
      const existingChat = chats.find(chat => chat.participants.includes(targetUser.uid));
      
      if (existingChat) {
        onSelectChat(existingChat.id);
        setShowNewChat(false);
        setSearchEmail('');
        return;
      }

      const newChat = await addDoc(collection(db, 'chats'), {
        participants: [currentUser.uid, targetUser.uid],
        updatedAt: serverTimestamp(),
        lastMessage: 'Started a new conversation'
      });

      onSelectChat(newChat.id);
      setShowNewChat(false);
      setSearchEmail('');
    } catch (err) {
      setSearchError('Failed to start chat.');
    }
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <img 
            src={currentUser.photoURL || ''} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 truncate max-w-[100px]">
              {currentUser.displayName}
            </p>
            <p className="text-xs text-slate-500">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setShowNewChat(true)}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
            title="New Chat"
          >
            <Plus size={20} />
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors text-slate-600"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search chats..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-sm">No conversations yet.</p>
            <button 
              onClick={() => setShowNewChat(true)}
              className="text-indigo-600 text-sm font-medium mt-2 hover:underline"
            >
              Start one now
            </button>
          </div>
        ) : (
          chats.map(chat => {
            const otherUserId = chat.participants.find(id => id !== currentUser.uid);
            const otherUser = otherUserId ? users[otherUserId] : null;

            return (
              <button
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={cn(
                  "w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors border-l-4",
                  selectedChatId === chat.id ? "bg-indigo-50/50 border-indigo-600" : "border-transparent"
                )}
              >
                <div className="relative">
                  {otherUser?.photoURL ? (
                    <img 
                      src={otherUser.photoURL} 
                      alt="" 
                      className="w-12 h-12 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                      <UserIcon size={24} />
                    </div>
                  )}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {otherUser?.displayName || 'Loading...'}
                    </p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                      {chat.updatedAt?.toDate ? formatDistanceToNow(chat.updatedAt.toDate(), { addSuffix: false }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {chat.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">New Conversation</h3>
                <button onClick={() => setShowNewChat(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleStartChat} className="p-6">
                <p className="text-sm text-slate-500 mb-4">Enter your friend's email address to start a chat.</p>
                <div className="space-y-4">
                  <div>
                    <input 
                      type="email" 
                      required
                      placeholder="friend@example.com"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    {searchError && <p className="text-xs text-red-500 mt-2 ml-1">{searchError}</p>}
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-indigo-100"
                  >
                    Start Chat
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
