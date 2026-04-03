import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { Message, ChatUser } from '../types';
import { Send, User as UserIcon, MoreVertical, Phone, Video, Smile, Paperclip, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface ChatWindowProps {
  chatId: string;
  currentUser: FirebaseUser;
}

export default function ChatWindow({ chatId, currentUser }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<ChatUser | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) return;

    // Fetch other user's info
    const fetchOtherUser = async () => {
      const chatSnap = await getDoc(doc(db, 'chats', chatId));
      if (chatSnap.exists()) {
        const participants = chatSnap.data().participants as string[];
        const otherUserId = participants.find(id => id !== currentUser.uid);
        if (otherUserId) {
          const userSnap = await getDoc(doc(db, 'users', otherUserId));
          if (userSnap.exists()) {
            setOtherUser(userSnap.data() as ChatUser);
          }
        }
      }
    };
    fetchOtherUser();

    // Listen for messages
    const q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[]);
    }, (error) => {
      console.error("Firestore Error in ChatWindow: ", error);
    });

    return () => unsubscribe();
  }, [chatId, currentUser.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        type: 'text'
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            {otherUser?.photoURL ? (
              <img 
                src={otherUser.photoURL} 
                alt="" 
                className="w-10 h-10 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                <UserIcon size={20} />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 leading-tight">
              {otherUser?.displayName || 'Loading...'}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <Phone size={20} />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <Video size={20} />
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50"
      >
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.uid;
          const showTime = idx === 0 || 
            (msg.timestamp?.toDate && messages[idx-1].timestamp?.toDate && 
             msg.timestamp.toDate().getTime() - messages[idx-1].timestamp.toDate().getTime() > 300000);

          return (
            <div key={msg.id} className="space-y-2">
              {showTime && msg.timestamp?.toDate && (
                <div className="flex justify-center my-4">
                  <span className="text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm uppercase tracking-widest">
                    {format(msg.timestamp.toDate(), 'p')}
                  </span>
                </div>
              )}
              <div className={cn(
                "flex items-end gap-2",
                isMe ? "flex-row-reverse" : "flex-row"
              )}>
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                    {otherUser?.photoURL ? (
                      <img src={otherUser.photoURL} alt="" className="w-full h-full" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon size={12} className="m-auto text-slate-400" />
                    )}
                  </div>
                )}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, x: isMe ? 20 : -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  className={cn(
                    "max-w-[75%] p-4 rounded-2xl text-sm shadow-sm",
                    isMe 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-white text-slate-800 rounded-bl-none border border-slate-100"
                  )}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                </motion.div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form 
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 bg-slate-100 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
        >
          <button type="button" className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors">
            <Smile size={20} />
          </button>
          <button type="button" className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors">
            <Paperclip size={20} />
          </button>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className={cn(
              "p-2 rounded-xl transition-all shadow-md",
              newMessage.trim() 
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            )}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
