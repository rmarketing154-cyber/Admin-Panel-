import React, { useState, useEffect, useRef } from 'react';
import { ref, update, push } from 'firebase/database';
import { db } from '../lib/firebase';
import { MessageSquare, ArrowLeft, Send } from 'lucide-react';

export default function SupportChat({ data }: any) {
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const msgsEndRef = useRef<HTMLDivElement>(null);

  const chats = data.chats.sort((a:any, b:any) => (b.lastMsg?.timestamp || 0) - (a.lastMsg?.timestamp || 0));
  const activeUser = data.users.find((u:any) => u.uid === activeUid);

  useEffect(() => {
    if (activeUid) {
      msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data.chats, activeUid]);

  const openChat = async (uid: string) => {
    setActiveUid(uid);
    markAsRead(uid);
  };

  const markAsRead = async (uid: string) => {
    try {
      const chat = data.chats.find((c: any) => c.uid === uid);
      if (chat && chat.unread) {
        const updates: any = {};
        chat.msgs.forEach((m: any) => {
          if (m.from === 'user' && !m.read) {
            updates[`${uid}/${m.msgKey}/read`] = true;
          }
        });
        if (Object.keys(updates).length > 0) {
          await update(ref(db, 'support_chats'), updates);
        }
      }
    } catch (err) {
      console.warn('markAsRead error:', err);
    }
  };

  useEffect(() => {
    if (activeUid) {
      markAsRead(activeUid);
    }
  }, [data.chats, activeUid]);

  const sendReply = async () => {
    if (!replyText.trim() || !activeUid) return;
    try {
      await push(ref(db, `support_chats/${activeUid}`), {
        from: 'admin',
        message: replyText.trim(),
        timestamp: Date.now(),
        read: true
      });
      setReplyText('');
    } catch (err: any) {
      console.warn('sendReply error:', err);
    }
  };

  if (activeUid) {
    const chatData = data.chats.find((c:any) => c.uid === activeUid);
    const msgs = chatData?.msgs || []; // wait, we didn't expose full msgs in useAdminData
    // Let's rely on useAdminData exposing msgs, I need to update useAdminData
    return (
      <div className="bg-white rounded-2xl border shadow-sm flex flex-col flex-1 min-h-[70vh]">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3 shrink-0">
          <button onClick={() => setActiveUid(null)} className="p-2 hover:bg-slate-200 rounded-lg"><ArrowLeft size={20} /></button>
          <div className="font-bold text-slate-800">{activeUser?.username || 'User'}</div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
          {msgs.map((m: any) => (
            <div key={m.msgKey} className={`flex ${m.from === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.from === 'admin' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}>
                <div>{m.message}</div>
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${m.from === 'admin' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {new Date(m.timestamp || 0).toLocaleTimeString()}
                  {m.from === 'admin' && (
                    <span className="font-bold">
                      {m.read ? '• Read' : '• Sent'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={msgsEndRef} />
        </div>
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex gap-2">
            <input 
              type="text" 
              value={replyText} 
              onChange={e=>setReplyText(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && sendReply()}
              placeholder="Type official response..." 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:border-indigo-500"
            />
            <button onClick={sendReply} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors">
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col flex-1 min-h-[70vh]">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2 font-bold text-slate-800 shrink-0">
        <MessageSquare className="text-indigo-500" size={20} /> Live Support
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 && <div className="text-center text-slate-500 py-10">No active conversations</div>}
          {chats.map((c: any) => {
            const user = data.users.find((u:any) => u.uid === c.uid);
            return (
              <div key={c.uid} onClick={() => openChat(c.uid)} className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer relative ${c.unread ? 'bg-indigo-50/50' : ''}`}>
                {c.unread && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-slate-800">{user?.username || 'User'}</div>
                    {c.unread && <span className="bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                  </div>
                  <div className="text-xs text-slate-400">{c.lastMsg ? new Date(c.lastMsg.timestamp).toLocaleTimeString() : ''}</div>
                </div>
                <div className={`text-sm truncate ${c.unread ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{c.lastMsg?.message}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
