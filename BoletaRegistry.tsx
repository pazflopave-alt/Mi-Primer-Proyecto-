import { useState, useEffect, useCallback } from 'react';
import { Receipt, Plus, Trash2, Loader2, Download, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, BoletaRecord, BoletaType, ReceptionStatus } from '@/types';

interface BoletaRegistryProps {
  clients: Client[];
  userId: string;
}

const formatCLP = (n: number) => '$' + n.toLocaleString('es-CL');

const TYPE_CONFIG: Record<BoletaType, { label: string; icon: string }> = {
  venta: { label: 'Boleta de Venta', icon: '🧾' },
  honorario: { label: 'Boleta de Honorarios', icon: '💼' },
  factura: { label: 'Factura', icon: '📄' },
};

const RECEPTION_CONFIG: Record<ReceptionStatus, { label: string; badge: 'amber' | 'green' | 'red' | 'slate' }> = {
  pendiente: { label: 'Pendiente', badge: 'amber' },
  ppd: { label: 'PPD', badge: 'slate' },
  aceptada: { label: 'Aceptada', badge: 'green' },
  rechazada: { label: 'Rechazada', badge: 'red' },
};

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function BoletaRegistry({ clients, userId }: BoletaRegistryProps) {
  const [records, setRecords] = useState<BoletaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [form, setForm] = useState({
    client_id: '', period_month: '', boleta_type: 'venta' as BoletaType,
    total_amount: '', count_docs: '1', reception_status: 'pendiente' as ReceptionStatus, notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('boleta_records')
      .select('*, client:clients(*)')
      .eq('accountant_id', userId)
      .order('period_month', { ascending: false });
    setRecords((data as (BoletaRecord & { client: Client })[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('boleta_records').insert({
      accountant_id: userId,
      client_id: form.client_id,
      period_month: form.period_month,
      boleta_type: form.boleta_type,
      total_amount: parseInt(form.total_amount, 10) || 0,
      count_docs: parseInt(form.count_docs, 10) || 1,
      reception_status: form.reception_status,
      notes: form.notes || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setForm({ client_id: '', period_month: '', boleta_type: 'venta', total_amount: '', count_docs: '1', reception_status: 'pendiente', notes: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return;
    await supabase.from('boleta_records').delete().eq('id', id);
    load();
  };

  const updateStatus = async (record: BoletaRecord, status: ReceptionStatus) => {
    await supabase.from('boleta_records').update({ reception_status: status }).eq('id', record.id);
    load();
  };

  const exportSummary = () => {
    const filtered = filterClient ? records.filter((r) => r.client_id === filterClient) : records;
    const lines = ['Cliente,Tipo,Período,Monto Total,Cantidad Docs,Estado Recepción'];
    filtered.forEach((r) => {
      const clientName = (r as BoletaRecord & { client?: Client }).client?.business_name || clients.find(c => c.id === r.client_id)?.business_name || 'N/A';
      const typeLabel = TYPE_CONFIG[r.boleta_type].label;
      const periodDate = new Date(r.period_month);
      const periodLabel = `${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`;
      const statusLabel = RECEPTION_CONFIG[r.reception_status].label;
      lines.push(`${clientName},${typeLabel},${periodLabel},${formatCLP(r.total_amount)},${r.count_docs},${statusLabel}`);
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen-boletas-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = filterClient ? records.filter((r) => r.client_id === filterClient) : records;
  const currentMonthDefault = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Receipt className="h-6 w-6 text-teal-600" />
            Registro de Boletas
          </h1>
          <p className="mt-1 text-sm text-slate-500">Control mensual de boletas y facturas por cliente</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportSummary} disabled={records.length === 0}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => { setForm({ client_id: filterClient, period_month: currentMonthDefault, boleta_type: 'venta', total_amount: '', count_docs: '1', reception_status: 'pendiente', notes: '' }); setShowAdd(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo registro
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="max-w-xs">
          <option value="">Todos los clientes</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </Select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-slate-400">Total registros</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{filtered.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400">Monto total</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCLP(filtered.reduce((s, r) => s + r.total_amount, 0))}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400">Aceptadas</p>
          <p className="mt-1 text-xl font-bold text-green-600">{filtered.filter((r) => r.reception_status === 'aceptada').length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-400">Pendientes</p>
          <p className="mt-1 text-xl font-bold text-amber-600">{filtered.filter((r) => r.reception_status === 'pendiente').length}</p>
        </Card>
      </div>

      {/* Records list */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="No hay registros de boletas" description="Registra el resumen mensual de boletas emitidas o recibidas por cliente" action={<Button onClick={() => { setForm({ client_id: filterClient, period_month: currentMonthDefault, boleta_type: 'venta', total_amount: '', count_docs: '1', reception_status: 'pendiente', notes: '' }); setShowAdd(true); }}><Plus className="h-4 w-4" />Nuevo registro</Button>} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((record) => {
              const clientName = (record as BoletaRecord & { client?: Client }).client?.business_name || clients.find(c => c.id === record.client_id)?.business_name || 'Cliente';
              const typeCfg = TYPE_CONFIG[record.boleta_type];
              const recCfg = RECEPTION_CONFIG[record.reception_status];
              const periodDate = new Date(record.period_month);
              const periodLabel = `${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`;
              return (
                <div key={record.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{typeCfg.icon}</span>
                        <p className="text-sm font-semibold text-slate-900">{typeCfg.label}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{clientName} · {periodLabel} · {record.count_docs} doc(s)</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-700">{formatCLP(record.total_amount)}</span>
                        <Badge color={recCfg.badge}>{recCfg.label}</Badge>
                        {record.notes && <span className="text-xs text-slate-400">{record.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {record.reception_status === 'pendiente' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(record, 'aceptada')}>Aceptar</Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(record, 'rechazada')}>Rechazar</Button>
                        </>
                      )}
                      <button onClick={() => deleteRecord(record.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo registro de boleta">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select label="Cliente" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
            <option value="">Selecciona un cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <Input label="Período (mes)" type="month" value={form.period_month ? form.period_month.substring(0, 7) : ''} onChange={(e) => setForm({ ...form, period_month: e.target.value + '-01' })} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo de boleta" value={form.boleta_type} onChange={(e) => setForm({ ...form, boleta_type: e.target.value as BoletaType })}>
              <option value="venta">Boleta de Venta</option>
              <option value="honorario">Boleta de Honorarios</option>
              <option value="factura">Factura</option>
            </Select>
            <Select label="Estado recepción" value={form.reception_status} onChange={(e) => setForm({ ...form, reception_status: e.target.value as ReceptionStatus })}>
              <option value="pendiente">Pendiente</option>
              <option value="ppd">PPD</option>
              <option value="aceptada">Aceptada</option>
              <option value="rechazada">Rechazada</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Monto total (CLP)" type="number" value={form.total_amount} onChange={(e) => setForm({ ...form, total_amount: e.target.value })} placeholder="500000" required />
            <Input label="Cantidad de documentos" type="number" value={form.count_docs} onChange={(e) => setForm({ ...form, count_docs: e.target.value })} placeholder="1" min="1" />
          </div>
          <Textarea label="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.client_id || !form.total_amount}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar registro'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
