import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, Bot, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Client, Task, DocumentRecord } from '@/types';

interface AIAssistantProps {
  clients: Client[];
  tasks: Task[];
  documents: DocumentRecord[];
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Muéstrame los clientes con documentos pendientes',
  'Redacta un mensaje para solicitar cartolas bancarias',
  'Resume las tareas pendientes',
  '¿Qué clientes están atrasados?',
];

export function AIAssistant({ clients, tasks, documents }: AIAssistantProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Hola, soy tu asistente contable. Puedes preguntarme sobre tus clientes, documentos pendientes, tareas o pedirme que redacte mensajes para tus clientes.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('documentos pendientes') || q.includes('documentos por revisar')) {
      const pending = documents.filter((d) => d.status === 'pendiente');
      if (pending.length === 0) return 'No tienes documentos pendientes de revisión. Todo está al día.';
      const byClient: Record<string, number> = {};
      pending.forEach((d) => {
        const c = clients.find((c) => c.id === d.client_id);
        const name = c?.business_name || 'Sin cliente';
        byClient[name] = (byClient[name] || 0) + 1;
      });
      return `Tienes ${pending.length} documento(s) pendiente(s) de revisión:\n\n${Object.entries(byClient).map(([name, count]) => `• ${name}: ${count} documento(s)`).join('\n')}`;
    }

    if (q.includes('redacta un mensaje') || q.includes('redacta mensaje') || q.includes('solicitar cartolas')) {
      return `Aquí tienes un mensaje sugerido:\n\n"Estimado cliente,\n\nEspero que se encuentre muy bien. Le solicito amablemente subir las cartolas bancarias del mes en curso antes del día 5 del próximo mes, para poder realizar el cierre contable correspondiente.\n\nPuede subir los documentos directamente desde su portal en ContaChile, en la sección de Documentos.\n\nQuedo atento a cualquier consulta.\n\nSaludos cordiales,"`;
    }

    if (q.includes('tareas pendientes') || q.includes('resume las tareas')) {
      const pending = tasks.filter((t) => t.status !== 'completada');
      if (pending.length === 0) return 'No tienes tareas pendientes. Todo está completado.';
      const byClient: Record<string, string[]> = {};
      pending.forEach((t) => {
        const c = clients.find((c) => c.id === t.client_id);
        const name = c?.business_name || 'General';
        if (!byClient[name]) byClient[name] = [];
        byClient[name].push(t.title);
      });
      return `Tienes ${pending.length} tarea(s) pendiente(s):\n\n${Object.entries(byClient).map(([name, items]) => `${name}:\n${items.map((i) => `  • ${i}`).join('\n')}`).join('\n\n')}`;
    }

    if (q.includes('atrasados') || q.includes('retrasados') || q.includes('atraso')) {
      const atrasados = clients.filter((c) => c.status === 'pendiente');
      if (atrasados.length === 0) return 'No tienes clientes atrasados. Todos están al día.';
      return `Tienes ${atrasados.length} cliente(s) con estado pendiente:\n\n${atrasados.map((c) => `• ${c.business_name} (RUT: ${c.rut})`).join('\n')}`;
    }

    if (q.includes('al día') || q.includes('aldia') || q.includes('clientes al dia')) {
      const alDia = clients.filter((c) => c.status === 'al_dia');
      return `Tienes ${alDia.length} cliente(s) al día de un total de ${clients.length}.\n${alDia.map((c) => `• ${c.business_name}`).join('\n')}`;
    }

    if (q.includes('resumen') || q.includes('dashboard') || q.includes('general')) {
      const alDia = clients.filter((c) => c.status === 'al_dia').length;
      const pendiente = clients.filter((c) => c.status === 'pendiente').length;
      const pendingTasks = tasks.filter((t) => t.status !== 'completada').length;
      const pendingDocs = documents.filter((d) => d.status === 'pendiente').length;
      return `Resumen general:\n\n• Clientes totales: ${clients.length}\n• Al día: ${alDia}\n• Pendientes: ${pendiente}\n• Tareas activas: ${pendingTasks}\n• Documentos por revisar: ${pendingDocs}`;
    }

    return 'Puedo ayudarte con:\n• Listar documentos pendientes\n• Redactar mensajes para clientes\n• Resumir tareas pendientes\n• Identificar clientes atrasados\n• Dar un resumen general de tu cartera\n\n¿Qué necesitas?';
  };

  const handleSend = (text?: string) => {
    const query = (text || input).trim();
    if (!query) return;
    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setLoading(true);
    setTimeout(() => {
      const response = generateResponse(query);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Sparkles className="h-6 w-6 text-teal-600" />
          Asistente IA
        </h1>
        <p className="mt-1 text-sm text-slate-500">Tu asistente interno para consultas contables y redacción</p>
      </div>

      <Card className="overflow-hidden">
        <div ref={scrollRef} className="h-[400px] space-y-4 overflow-y-auto p-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${msg.role === 'user' ? 'bg-slate-200' : 'bg-teal-100'}`}>
                {msg.role === 'user' ? <User className="h-4 w-4 text-slate-600" /> : <Bot className="h-4 w-4 text-teal-600" />}
              </div>
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100">
                <Bot className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl bg-slate-100 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-teal-500" />
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="border-t border-slate-100 p-4">
            <p className="mb-2 text-xs font-medium text-slate-400">Sugerencias:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2 border-t border-slate-100 p-3">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu consulta..." className="flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20" />
          <button type="submit" disabled={loading || !input.trim()} className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white transition-colors hover:bg-teal-700 disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </Card>
    </div>
  );
}
