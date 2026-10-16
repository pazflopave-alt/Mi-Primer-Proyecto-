import { useState, useEffect, useCallback } from 'react';
import { Calculator, Plus, Trash2, Loader2, Save, FileText, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, IvaCalculation } from '@/types';

interface IvaCalculatorProps {
  clients: Client[];
  userId: string;
}

const IVA_RATE = 0.19;
const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function IvaCalculator({ clients, userId }: IvaCalculatorProps) {
  const [calculations, setCalculations] = useState<IvaCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    client_id: '',
    period_month: '',
    sales_net: '',
    purchases_net: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('iva_calculations')
      .select('*, client:clients(*)')
      .eq('accountant_id', userId)
      .order('period_month', { ascending: false });
    setCalculations((data as (IvaCalculation & { client: Client })[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const salesNet = parseInt(form.sales_net, 10) || 0;
  const purchasesNet = parseInt(form.purchases_net, 10) || 0;
  const debitFiscal = Math.round(salesNet * IVA_RATE);
  const creditFiscal = Math.round(purchasesNet * IVA_RATE);
  const ivaToPay = debitFiscal - creditFiscal;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('iva_calculations').insert({
      accountant_id: userId,
      client_id: form.client_id || null,
      period_month: form.period_month,
      sales_net: salesNet,
      purchases_net: purchasesNet,
      debit_fiscal: debitFiscal,
      credit_fiscal: creditFiscal,
      iva_to_pay: ivaToPay,
      notes: form.notes || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setForm({ client_id: '', period_month: '', sales_net: '', purchases_net: '', notes: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const deleteCalc = async (id: string) => {
    if (!confirm('¿Eliminar este cálculo de IVA?')) return;
    await supabase.from('iva_calculations').delete().eq('id', id);
    load();
  };

  const currentMonthDefault = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Calculator className="h-6 w-6 text-teal-600" />
            Calculadora de IVA (F29)
          </h1>
          <p className="mt-1 text-sm text-slate-500">Calcula el débito, crédito y pago de IVA mensual (19%)</p>
        </div>
        <Button onClick={() => { setForm({ client_id: '', period_month: currentMonthDefault, sales_net: '', purchases_net: '', notes: '' }); setShowAdd(true); }}>
          <Plus className="h-4 w-4" />
          Nuevo cálculo
        </Button>
      </div>

      {/* History */}
      <Card>
        <CardHeader title="Historial de cálculos" description={`${calculations.length} registro(s)`} />
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
        ) : calculations.length === 0 ? (
          <EmptyState icon={<Calculator className="h-6 w-6" />} title="No hay cálculos de IVA" description="Crea un nuevo cálculo para registrar las ventas y compras del mes" action={<Button onClick={() => { setForm({ client_id: '', period_month: currentMonthDefault, sales_net: '', purchases_net: '', notes: '' }); setShowAdd(true); }}><Plus className="h-4 w-4" />Nuevo cálculo</Button>} />
        ) : (
          <div className="divide-y divide-slate-100">
            {calculations.map((calc) => {
              const clientName = (calc as IvaCalculation & { client?: Client }).client?.business_name || clients.find(c => c.id === calc.client_id)?.business_name || 'General';
              const periodDate = new Date(calc.period_month);
              const periodLabel = `${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`;
              return (
                <div key={calc.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{periodLabel}</p>
                      <p className="text-xs text-slate-400">{clientName}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Ventas netas</p>
                          <p className="text-sm font-bold text-slate-700">{formatCLP(calc.sales_net)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Compras netas</p>
                          <p className="text-sm font-bold text-slate-700">{formatCLP(calc.purchases_net)}</p>
                        </div>
                        <div className="rounded-lg bg-blue-50 px-3 py-2">
                          <p className="text-xs text-blue-400">Débito fiscal</p>
                          <p className="text-sm font-bold text-blue-700">{formatCLP(calc.debit_fiscal)}</p>
                        </div>
                        <div className="rounded-lg bg-teal-50 px-3 py-2">
                          <p className="text-xs text-teal-400">Crédito fiscal</p>
                          <p className="text-sm font-bold text-teal-700">{formatCLP(calc.credit_fiscal)}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge color={calc.iva_to_pay > 0 ? 'red' : 'green'}>
                          {calc.iva_to_pay > 0 ? `IVA a pagar: ${formatCLP(calc.iva_to_pay)}` : `Remanente: ${formatCLP(Math.abs(calc.iva_to_pay))}`}
                        </Badge>
                        {calc.notes && <span className="text-xs text-slate-400">{calc.notes}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteCalc(calc.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Calculator Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nuevo cálculo de IVA (F29)">
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Cliente" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">General (sin cliente)</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <Input label="Mes del período" type="month" value={form.period_month ? form.period_month.substring(0, 7) : ''} onChange={(e) => setForm({ ...form, period_month: e.target.value + '-01' })} required />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input label="Total Ventas Netas (CLP)" type="number" value={form.sales_net} onChange={(e) => setForm({ ...form, sales_net: e.target.value })} placeholder="1000000" />
              <p className="mt-1 text-xs text-slate-400">Ventas sin IVA del mes</p>
            </div>
            <div>
              <Input label="Total Compras Netas (CLP)" type="number" value={form.purchases_net} onChange={(e) => setForm({ ...form, purchases_net: e.target.value })} placeholder="500000" />
              <p className="mt-1 text-xs text-slate-400">Compras sin IVA del mes</p>
            </div>
          </div>

          {/* Live calculation preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Cálculo automático (IVA 19%)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 border border-slate-200">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-slate-400">Débito Fiscal</p>
                  <p className="text-sm font-bold text-blue-700">{formatCLP(debitFiscal)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2.5 border border-slate-200">
                <TrendingDown className="h-4 w-4 text-teal-500" />
                <div>
                  <p className="text-xs text-slate-400">Crédito Fiscal</p>
                  <p className="text-sm font-bold text-teal-700">{formatCLP(creditFiscal)}</p>
                </div>
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2.5 ${ivaToPay > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <DollarSign className={`h-5 w-5 ${ivaToPay > 0 ? 'text-red-500' : 'text-green-500'}`} />
              <div>
                <p className={`text-xs ${ivaToPay > 0 ? 'text-red-400' : 'text-green-400'}`}>{ivaToPay > 0 ? 'IVA a Pagar (F29)' : 'Remanente a favor'}</p>
                <p className={`text-lg font-bold ${ivaToPay > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCLP(Math.abs(ivaToPay))}</p>
              </div>
            </div>
          </div>

          <Textarea label="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Observaciones del cálculo..." />
          {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.period_month}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" />Guardar cálculo</>}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
