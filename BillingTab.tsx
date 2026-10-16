import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Calendar, DollarSign, CheckCircle2, Clock, AlertCircle, Send, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, ClientFee, FeeStatus } from '@/types';

interface BillingTabProps {
  clients: Client[];
  userId: string;
}

const IVA_RATE = 0.19;
const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

export function BillingTab({ clients, userId }: BillingTabProps) {
  const [fees, setFees] = useState<ClientFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    client_id: '', description: 'Honorarios contables', base_amount: '', includes_iva: true,
    due_date: '', status: 'pendiente' as FeeStatus,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('client_fees')
      .select('*, client:clients(*)')
      .eq('accountant_id', userId)
      .order('created_at', { ascending: false });
    setFees((data as (ClientFee & { client: Client })[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const baseAmount = parseInt(form.base_amount, 10) || 0;
  const ivaAmount = form.includes_iva ? Math.round(baseAmount * IVA_RATE) : 0;
  const totalAmount = baseAmount + ivaAmount;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('client_fees').insert({
      accountant_id: userId,
      client_id: form.client_id,
      description: form.description,
      amount_clp: totalAmount,
      base_amount: baseAmount,
      iva_amount: ivaAmount,
      includes_iva: form.includes_iva,
      due_date: form.due_date || null,
      status: form.status,
    });
    setForm({ client_id: '', description: 'Honorarios contables', base_amount: '', includes_iva: true, due_date: '', status: 'pendiente' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const updateStatus = async (fee: ClientFee, status: FeeStatus) => {
    const paid_date = status === 'pagado' ? new Date().toISOString().split('T')[0] : null;
    await supabase.from('client_fees').update({ status, paid_date }).eq('id', fee.id);
    load();
  };

  const sendReminder = async (fee: ClientFee) => {
    const client = clients.find((c) => c.id === fee.client_id);
    if (!client) return;
    await supabase.from('notifications').insert({
      user_id: client.pyme_user_id || client.accountant_id,
      title: 'Recordatorio de pago',
      body: `Tienes un pago pendiente de ${formatCLP(fee.amount_clp)} por concepto de: ${fee.description}${fee.due_date ? `. Vence el ${new Date(fee.due_date).toLocaleDateString('es-CL')}` : ''}`,
      type: 'warning',
      read: false,
    });
    await supabase.from('client_fees').update({ reminder_sent: true }).eq('id', fee.id);
    load();
  };

  const deleteFee = async (id: string) => {
    if (!confirm('¿Eliminar este cobro?')) return;
    await supabase.from('client_fees').delete().eq('id', id);
    load();
  };

  const statusBadge = (status: FeeStatus) => {
    if (status === 'pagado') return <Badge color="green"><CheckCircle2 className="h-3 w-3" />Pagado</Badge>;
    if (status === 'vencido') return <Badge color="red"><AlertCircle className="h-3 w-3" />Vencido</Badge>;
    return <Badge color="amber"><Clock className="h-3 w-3" />Pendiente</Badge>;
  };

  const totalPaid = fees.filter(f => f.status === 'pagado').reduce((sum, f) => sum + f.amount_clp, 0);
  const totalPending = fees.filter(f => f.status === 'pendiente').reduce((sum, f) => sum + f.amount_clp, 0);
  const totalOverdue = fees.filter(f => f.status === 'vencido').reduce((sum, f) => sum + f.amount_clp, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Control de Cobros</h1>
          <p className="mt-1 text-sm text-slate-500">Gestiona tus honorarios contables con IVA y recordatorios</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Nuevo cobro
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pagado</p>
              <p className="mt-1 text-xl font-bold text-green-600">{formatCLP(totalPaid)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Pendiente</p>
              <p className="mt-1 text-xl font-bold text-amber-600">{formatCLP(totalPending)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Vencido</p>
              <p className="mt-1 text-xl font-bold text-red-600">{formatCLP(totalOverdue)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Fees list */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
        ) : fees.length === 0 ? (
          <EmptyState icon={<DollarSign className="h-6 w-6" />} title="No tienes cobros registrados" description="Registra los honorarios de tus clientes para llevar control de pagos" action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Nuevo cobro</Button>} />
        ) : (
          <div className="divide-y divide-slate-100">
            {fees.map((fee) => {
              const clientName = (fee as ClientFee & { client?: Client }).client?.business_name || clients.find(c => c.id === fee.client_id)?.business_name || 'Cliente';
              const overdue = fee.due_date && new Date(fee.due_date) < new Date() && fee.status === 'pendiente';
              return (
                <div key={fee.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{fee.description}</p>
                    <p className="text-xs text-slate-400">{clientName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3">
                      <span className="text-sm font-bold text-slate-700">{formatCLP(fee.amount_clp)}</span>
                      {fee.includes_iva && fee.base_amount && (
                        <span className="text-xs text-slate-400">
                          Base: {formatCLP(fee.base_amount)} + IVA: {formatCLP(fee.iva_amount || 0)}
                        </span>
                      )}
                      {fee.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className={`h-3 w-3 ${overdue ? 'text-red-500' : 'text-slate-400'}`} />
                          <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                            Vence: {new Date(fee.due_date).toLocaleDateString('es-CL')}{overdue && ' (vencida)'}
                          </span>
                        </div>
                      )}
                      {fee.reminder_sent && <span className="flex items-center gap-1 text-xs text-teal-500"><Bell className="h-3 w-3" />Recordatorio enviado</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {statusBadge(fee.status)}
                    {fee.status !== 'pagado' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(fee, 'pagado')}>
                          <CheckCircle2 className="h-3.5 w-3.5" />Pagado
                        </Button>
                        <button onClick={() => sendReminder(fee)} className="rounded-lg p-1.5 text-teal-500 hover:bg-teal-50 transition-colors" title="Enviar recordatorio">
                          <Send className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => deleteFee(fee.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo cobro de honorarios">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select label="Cliente" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
            <option value="">Selecciona un cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <Input label="Descripción" type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Input label="Monto base (CLP)" type="number" value={form.base_amount} onChange={(e) => setForm({ ...form, base_amount: e.target.value })} placeholder="50000" required />

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.includes_iva} onChange={(e) => setForm({ ...form, includes_iva: e.target.checked })} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
            <span className="text-sm text-slate-700">Incluir IVA (19%) al monto</span>
          </label>

          {/* Live calculation */}
          {form.base_amount && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Monto base:</span>
                <span className="font-medium text-slate-700">{formatCLP(baseAmount)}</span>
              </div>
              {form.includes_iva && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">IVA (19%):</span>
                  <span className="font-medium text-teal-700">{formatCLP(ivaAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-sm font-semibold text-slate-700">Total a cobrar:</span>
                <span className="text-lg font-bold text-slate-900">{formatCLP(totalAmount)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha de vencimiento" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <Select label="Estado" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FeeStatus })}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="vencido">Vencido</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.client_id || !form.base_amount}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear cobro'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
