import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Plus, Trash2, Loader2, BarChart3, AlertCircle, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, FinancialSnapshot } from '@/types';

interface FinancialHealthProps {
  clients: Client[];
  userId: string;
}

const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function FinancialHealth({ clients, userId }: FinancialHealthProps) {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    client_id: '', period_month: '', sales: '', expenses: '', taxes_paid: '', payroll_total: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const clientIds = clients.map((c) => c.id);
    if (clientIds.length === 0) {
      setSnapshots([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('financial_snapshots')
      .select('*')
      .in('client_id', clientIds)
      .order('period_month', { ascending: true });
    setSnapshots((data as FinancialSnapshot[]) || []);
    setLoading(false);
  }, [clients]);

  useEffect(() => { load(); }, [load]);

  const clientSnapshots = selectedClient
    ? snapshots.filter((s) => s.client_id === selectedClient)
    : snapshots;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const sales = parseInt(form.sales, 10) || 0;
    const expenses = parseInt(form.expenses, 10) || 0;
    const taxesPaid = parseInt(form.taxes_paid, 10) || 0;
    const payrollTotal = parseInt(form.payroll_total, 10) || 0;
    const netResult = sales - expenses - taxesPaid - payrollTotal;

    const { error: insertError } = await supabase.from('financial_snapshots').insert({
      client_id: form.client_id,
      period_month: form.period_month,
      sales,
      expenses,
      taxes_paid: taxesPaid,
      payroll_total: payrollTotal,
      net_result: netResult,
      notes: form.notes || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setForm({ client_id: '', period_month: '', sales: '', expenses: '', taxes_paid: '', payroll_total: '', notes: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const deleteSnapshot = async (id: string) => {
    if (!confirm('¿Eliminar este registro financiero?')) return;
    await supabase.from('financial_snapshots').delete().eq('id', id);
    load();
  };

  // Chart calculations
  const maxBar = Math.max(...clientSnapshots.map((s) => Math.max(s.sales, s.expenses + s.taxes_paid + s.payroll_total)), 1);
  const totalSales = clientSnapshots.reduce((sum, s) => sum + s.sales, 0);
  const totalExpenses = clientSnapshots.reduce((sum, s) => sum + (s.expenses + s.taxes_paid + s.payroll_total), 0);
  const totalNet = clientSnapshots.reduce((sum, s) => sum + s.net_result, 0);
  const profitMargin = totalSales > 0 ? Math.round((totalNet / totalSales) * 100) : 0;

  const currentMonthDefault = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <BarChart3 className="h-6 w-6 text-teal-600" />
            Salud Financiera PYME
          </h1>
          <p className="mt-1 text-sm text-slate-500">Reporte ejecutivo con ventas, gastos y resumen contable mensual</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="max-w-xs">
            <option value="">Todos los clientes</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <Button onClick={() => { setForm({ client_id: selectedClient, period_month: currentMonthDefault, sales: '', expenses: '', taxes_paid: '', payroll_total: '', notes: '' }); setShowAdd(true); }}>
            <Plus className="h-4 w-4" />
            Nuevo registro
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Ventas totales</p>
              <p className="mt-1 text-xl font-bold text-teal-700">{formatCLP(totalSales)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Gastos totales</p>
              <p className="mt-1 text-xl font-bold text-red-700">{formatCLP(totalExpenses)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Resultado neto</p>
              <p className={`mt-1 text-xl font-bold ${totalNet >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCLP(totalNet)}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <DollarSign className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Margen</p>
              <p className={`mt-1 text-xl font-bold ${profitMargin >= 0 ? 'text-green-700' : 'text-red-700'}`}>{profitMargin}%</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <BarChart3 className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Bar chart */}
      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
      ) : clientSnapshots.length === 0 ? (
        <Card>
          <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No hay datos financieros" description="Registra ventas y gastos mensuales para generar el reporte ejecutivo" action={<Button onClick={() => { setForm({ client_id: selectedClient, period_month: currentMonthDefault, sales: '', expenses: '', taxes_paid: '', payroll_total: '', notes: '' }); setShowAdd(true); }}><Plus className="h-4 w-4" />Nuevo registro</Button>} />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Ventas vs. Gastos por mes" description="Comparativa mensual" />
            <div className="px-5 py-6">
              <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: '200px' }}>
                {clientSnapshots.map((snap) => {
                  const periodDate = new Date(snap.period_month);
                  const salesHeight = Math.round((snap.sales / maxBar) * 160);
                  const expensesHeight = Math.round(((snap.expenses + snap.taxes_paid + snap.payroll_total) / maxBar) * 160);
                  return (
                    <div key={snap.id} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: '60px' }}>
                      <div className="flex items-end gap-1" style={{ height: '170px' }}>
                        <div className="w-5 rounded-t bg-teal-500 transition-all hover:bg-teal-600" style={{ height: `${salesHeight}px`, minHeight: '2px' }} title={`Ventas: ${formatCLP(snap.sales)}`} />
                        <div className="w-5 rounded-t bg-red-400 transition-all hover:bg-red-500" style={{ height: `${expensesHeight}px`, minHeight: '2px' }} title={`Gastos: ${formatCLP(snap.expenses + snap.taxes_paid + snap.payroll_total)}`} />
                      </div>
                      <span className="text-xs font-medium text-slate-500">{MONTHS_ES[periodDate.getMonth()]}</span>
                      <span className="text-xs text-slate-400">{periodDate.getFullYear()}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-teal-500" />
                  <span className="text-xs text-slate-600">Ventas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-400" />
                  <span className="text-xs text-slate-600">Gastos</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Detail table */}
          <Card>
            <CardHeader title="Detalle mensual" description={`${clientSnapshots.length} registro(s)`} />
            <div className="divide-y divide-slate-100">
              {clientSnapshots.map((snap) => {
                const clientName = clients.find((c) => c.id === snap.client_id)?.business_name || 'Cliente';
                const periodDate = new Date(snap.period_month);
                const periodLabel = `${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`;
                return (
                  <div key={snap.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{periodLabel}</p>
                      <p className="text-xs text-slate-400">{clientName}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-teal-600">Ventas: {formatCLP(snap.sales)}</span>
                        <span className="text-red-500">Gastos: {formatCLP(snap.expenses)}</span>
                        <span className="text-slate-500">Impuestos: {formatCLP(snap.taxes_paid)}</span>
                        <span className="text-slate-500">Remuneraciones: {formatCLP(snap.payroll_total)}</span>
                      </div>
                      {snap.notes && <p className="mt-1 text-xs text-slate-400">{snap.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge color={snap.net_result >= 0 ? 'green' : 'red'}>
                        {snap.net_result >= 0 ? '+' : ''}{formatCLP(snap.net_result)}
                      </Badge>
                      <button onClick={() => deleteSnapshot(snap.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo registro financiero">
        <form onSubmit={handleAdd} className="space-y-4">
          <Select label="Cliente" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
            <option value="">Selecciona un cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <Input label="Período (mes)" type="month" value={form.period_month ? form.period_month.substring(0, 7) : ''} onChange={(e) => setForm({ ...form, period_month: e.target.value + '-01' })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Ventas del mes (CLP)" type="number" value={form.sales} onChange={(e) => setForm({ ...form, sales: e.target.value })} placeholder="2000000" required />
            <Input label="Gastos operacionales (CLP)" type="number" value={form.expenses} onChange={(e) => setForm({ ...form, expenses: e.target.value })} placeholder="800000" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Impuestos pagados (CLP)" type="number" value={form.taxes_paid} onChange={(e) => setForm({ ...form, taxes_paid: e.target.value })} placeholder="380000" />
            <Input label="Remuneraciones (CLP)" type="number" value={form.payroll_total} onChange={(e) => setForm({ ...form, payroll_total: e.target.value })} placeholder="600000" />
          </div>
          <Textarea label="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.client_id || !form.sales}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" />Guardar registro</>}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
