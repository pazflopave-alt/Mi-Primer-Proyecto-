import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ChatMessage } from '@/types';

interface ChatPanelProps {
  clientId: string;
  userId: string;
  accountantName?: string;
  pymeName?: string;
}

export function ChatPanel({ clientId, userId, accountantName, pymeName }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    setMessages((data as ChatMessage[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`chat:${clientId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `client_id=eq.${clientId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clientId, loadMessages]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setSending(true);
    setInput('');
    await supabase.from('chat_messages').insert({
      client_id: clientId,
      sender_id: userId,
      message: input.trim(),
    });
    setSending(false);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-[480px] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <MessageCircle className="h-4 w-4 text-teal-600" />
        <span className="text-sm font-semibold text-slate-900">Chat</span>
        <span className="text-xs text-slate-400">· en tiempo real</span>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-teal-500" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState icon={<MessageCircle className="h-6 w-6" />} title="Sin mensajes" description="Envía el primer mensaje para comenzar la conversación" />
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((msg) => {
            const isMe = msg.sender_id === userId;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <span className="mb-0.5 text-xs font-medium text-slate-500">{accountantName || 'Contador'}</span>
                )}
                {isMe && (
                  <span className="mb-0.5 text-xs font-medium text-slate-500">{pymeName || 'Yo'}</span>
                )}
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  isMe ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}>
                  {msg.message}
                </div>
                <span className="mt-0.5 text-[10px] text-slate-400">{formatTime(msg.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-100 px-3 py-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
