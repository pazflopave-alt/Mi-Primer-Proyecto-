import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Trash2, Loader2, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { DocumentRequest, DocumentRequestStatus } from '@/types';

interface DocumentRequestsProps {
  clientId: string;
  accountantId: string;
  isAccountant: boolean;
}

export function DocumentRequests({ clientId, accountantId, isAccountant }: DocumentRequestsProps) {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('document_requests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setRequests((data as DocumentRequest[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('document_requests').insert({
      accountant_id: accountantId,
      client_id: clientId,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      status: 'pendiente',
    });
    setForm({ title: '', description: '', due_date: '' });
    setShowAdd(false);
    setSaving(false);
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
    if (status === 'completada') return <Badge color="green"><CheckCircle2 className="h-3 w-3" />Completada</Badge>;
    if (status === 'cancelada') return <Badge color="red">Cancelada</Badge>;
    return <Badge color="amber"><Clock className="h-3 w-3" />Pendiente</Badge>;
  };

  return (
    <Card>
      <CardHeader
        title="Solicitudes de documentos"
        description={`${requests.filter(r => r.status === 'pendiente').length} pendiente(s)`}
        action={isAccountant && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-3.5 w-3.5" />Nueva solicitud</Button>}
      />
      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      ) : requests.length === 0 ? (
        <EmptyState icon={<FileText className="h-6 w-6" />} title="No hay solicitudes" description={isAccountant ? "Crea una solicitud para pedirle documentos a tu cliente" : "Tu contador no ha solicitado documentos aún"} />
      ) : (
        <div className="divide-y divide-slate-100">
          {requests.map((req) => {
            const overdue = req.due_date && new Date(req.due_date) < new Date() && req.status === 'pendiente';
            return (
              <div key={req.id} className="flex items-start justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{req.title}</p>
                  {req.description && <p className="mt-0.5 text-xs text-slate-500">{req.description}</p>}
                  {req.due_date && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Calendar className={`h-3 w-3 ${overdue ? 'text-red-500' : 'text-slate-400'}`} />
                      <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                        Vence: {new Date(req.due_date).toLocaleDateString('es-CL')}{overdue && ' (vencida)'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {statusBadge(req.status)}
                  {!isAccountant && req.status === 'pendiente' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(req, 'completada')}>
                      <CheckCircle2 className="h-3.5 w-3.5" />Marcar
                    </Button>
                  )}
                  {isAccountant && (
                    <>
                      {req.status === 'pendiente' && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(req, 'completada')}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <button onClick={() => deleteReq(req.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva solicitud de documento">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Título" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Cartola bancaria Agosto" required />
          <Textarea label="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Indica qué documentos necesitas..." rows={3} />
          <Input label="Fecha límite (opcional)" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear solicitud'}</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
