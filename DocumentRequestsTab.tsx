import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Calendar, CheckCircle2, Clock, Send, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, DocumentRequest, DocumentRequestStatus } from '@/types';

interface DocumentRequestsTabProps {
  clients: Client[];
  userId: string;
  onChanged: () => void;
}

export function DocumentRequestsTab({ clients, userId, onChanged }: DocumentRequestsTabProps) {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', target: 'individual' as 'individual' | 'all', client_id: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('document_requests')
      .select('*, client:clients(*)')
      .eq('accountant_id', userId)
      .order('created_at', { ascending: false });
    setRequests((data as (DocumentRequest & { client: Client })[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (form.target === 'all') {
      const inserts = clients.map((c) => ({
        accountant_id: userId,
        client_id: c.id,
        title: form.title,
        description: form.description || null,
        due_date: form.due_date || null,
        status: 'pendiente' as DocumentRequestStatus,
      }));
      await supabase.from('document_requests').insert(inserts);
    } else {
      await supabase.from('document_requests').insert({
        accountant_id: userId,
        client_id: form.client_id,
        title: form.title,
        description: form.description || null,
        due_date: form.due_date || null,
        status: 'pendiente',
      });
    }
    setForm({ title: '', description: '', due_date: '', target: 'individual', client_id: '' });
    setShowAdd(false);
    setSaving(false);
    onChanged();
    load();
  };

  const updateStatus = async (req: DocumentRequest, status: DocumentRequestStatus) => {
    await supabase.from('document_requests').update({ status }).eq('id', req.id);
    load();
  };

  const deleteReq = async (id: string) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    await supabase.from('document_requests').delete().eq('id', id);
    load();
  };

  const statusBadge = (status: DocumentRequestStatus) => {
    if (status === 'completada') return <Badge color="green"><CheckCircle2 className="h-3 w-3" />Recibido</Badge>;
    if (status === 'cancelada') return <Badge color="red">Cancelada</Badge>;
    return <Badge color="red"><Clock className="h-3 w-3" />Pendiente</Badge>;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitud de Documentos</h1>
          <p className="mt-1 text-sm text-slate-500">{requests.filter(r => r.status === 'pendiente').length} pendiente(s) · {requests.filter(r => r.status === 'completada').length} recibido(s)</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
        ) : requests.length === 0 ? (
          <EmptyState icon={<Send className="h-6 w-6" />} title="No hay solicitudes" description="Envía solicitudes individuales o masivas a tus clientes" action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Nueva solicitud</Button>} />
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map((req) => {
              const clientName = (req as DocumentRequest & { client?: Client }).client?.business_name || clients.find(c => c.id === req.client_id)?.business_name || 'Cliente';
              const overdue = req.due_date && new Date(req.due_date) < new Date() && req.status === 'pendiente';
              return (
                <div key={req.id} className="flex items-start justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{req.title}</p>
                    {req.description && <p className="mt-0.5 text-xs text-slate-500">{req.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <Badge color="slate">{clientName}</Badge>
                      {req.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className={`h-3 w-3 ${overdue ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                            Vence: {new Date(req.due_date).toLocaleDateString('es-CL')}{overdue && ' (vencida)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {statusBadge(req.status)}
                    {req.status === 'pendiente' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(req, 'completada')}>
                        <CheckCircle2 className="h-3.5 w-3.5" />Recibido
                      </Button>
                    )}
                    <button onClick={() => deleteReq(req.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva solicitud de documento">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setForm({ ...form, target: 'individual' })} className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${form.target === 'individual' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'}`}>
              Individual
            </button>
            <button type="button" onClick={() => setForm({ ...form, target: 'all' })} className={`rounded-xl border-2 p-3 text-sm font-medium transition-all ${form.target === 'all' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'}`}>
              Masiva (todos)
            </button>
          </div>
          {form.target === 'individual' && (
            <Select label="Cliente" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
              <option value="">Selecciona un cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
            </Select>
          )}
          <Input label="Título" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Subir cartolas de septiembre antes del 5 de octubre" required />
          <Textarea label="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Indica qué documentos necesitas..." rows={3} />
          <Input label="Fecha límite" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || (form.target === 'individual' && !form.client_id)}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar solicitud'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
