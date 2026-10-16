import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Users, Save, AlertCircle, FileText, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, PayrollRecord } from '@/types';

interface PayrollCalculatorProps {
  clients: Client[];
  userId: string;
}

const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function PayrollCalculator({ clients, userId }: PayrollCalculatorProps) {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    client_id: '', employee_name: '', rut: '', period_month: '',
    base_salary: '', non_imponible: '',
    afp_rate: '0.1144', health_rate: '0.07', unemployment_rate: '0.006',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('payroll_records')
      .select('*, client:clients(*)')
      .eq('accountant_id', userId)
      .order('period_month', { ascending: false });
    setRecords((data as (PayrollRecord & { client: Client })[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const baseSalary = parseInt(form.base_salary, 10) || 0;
  const nonImponible = parseInt(form.non_imponible, 10) || 0;
  const afpRate = parseFloat(form.afp_rate) || 0;
  const healthRate = parseFloat(form.health_rate) || 0;
  const unemploymentRate = parseFloat(form.unemployment_rate) || 0;

  const taxableBase = Math.max(baseSalary - nonImponible, 0);
  const afpAmount = Math.round(taxableBase * afpRate);
  const healthAmount = Math.round(taxableBase * healthRate);
  const unemploymentAmount = Math.round(taxableBase * unemploymentRate);
  const totalDeductions = afpAmount + healthAmount + unemploymentAmount;
  const netSalary = baseSalary - totalDeductions;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('payroll_records').insert({
      accountant_id: userId,
      client_id: form.client_id,
      employee_name: form.employee_name,
      rut: form.rut || null,
      period_month: form.period_month,
      base_salary: baseSalary,
      non_imponible: nonImponible,
      afp_rate: afpRate,
      afp_amount: afpAmount,
      health_rate: healthRate,
      health_amount: healthAmount,
      unemployment_rate: unemploymentRate,
      unemployment_amount: unemploymentAmount,
      taxable_base: taxableBase,
      total_deductions: totalDeductions,
      net_salary: netSalary,
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setForm({ client_id: '', employee_name: '', rut: '', period_month: '', base_salary: '', non_imponible: '', afp_rate: '0.1144', health_rate: '0.07', unemployment_rate: '0.006', notes: '' });
    setShowAdd(false);
    setSaving(false);
    load();
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('¿Eliminar esta liquidación?')) return;
    await supabase.from('payroll_records').delete().eq('id', id);
    load();
  };

  const exportLiquidacion = (record: PayrollRecord) => {
    const client = clients.find(c => c.id === record.client_id);
    const periodDate = new Date(record.period_month);
    const periodLabel = `${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`;
    const lines = [
      `LIQUIDACIÓN DE SUELDO`,
      `Empresa: ${client?.business_name || 'N/A'}`,
      `Empleado: ${record.employee_name}${record.rut ? ' (RUT: ' + record.rut + ')' : ''}`,
      `Período: ${periodLabel}`,
      ``,
      `Base Imponible: ${formatCLP(record.base_salary)}`,
      `Haberes No Imponibles: ${formatCLP(record.non_imponible)}`,
      `Base Tributable: ${formatCLP(record.taxable_base)}`,
      ``,
      `Descuentos:`,
      `  AFP (${(record.afp_rate * 100).toFixed(2)}%): ${formatCLP(record.afp_amount)}`,
      `  Salud (${(record.health_rate * 100).toFixed(2)}%): ${formatCLP(record.health_amount)}`,
      `  Seguro Cesantía (${(record.unemployment_rate * 100).toFixed(2)}%): ${formatCLP(record.unemployment_amount)}`,
      `  Total Descuentos: ${formatCLP(record.total_deductions)}`,
      ``,
      `Sueldo Líquido: ${formatCLP(record.net_salary)}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liquidacion-${record.employee_name.replace(/\s/g, '-')}-${periodLabel.replace(/\s/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMonthDefault = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Users className="h-6 w-6 text-teal-600" />
            Remuneraciones
          </h1>
          <p className="mt-1 text-sm text-slate-500">Genera liquidaciones de sueldo con descuentos previsionales chilenos</p>
        </div>
        <Button onClick={() => { setForm({ client_id: '', employee_name: '', rut: '', period_month: currentMonthDefault, base_salary: '', non_imponible: '', afp_rate: '0.1144', health_rate: '0.07', unemployment_rate: '0.006', notes: '' }); setShowAdd(true); }}>
          <Plus className="h-4 w-4" />
          Nueva liquidación
        </Button>
      </div>

      <Card>
        <CardHeader title="Liquidaciones registradas" description={`${records.length} registro(s)`} />
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
        ) : records.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No hay liquidaciones" description="Crea una nueva liquidación de sueldo con cálculo automático de AFP, salud y seguro de cesantía" action={<Button onClick={() => { setForm({ client_id: '', employee_name: '', rut: '', period_month: currentMonthDefault, base_salary: '', non_imponible: '', afp_rate: '0.1144', health_rate: '0.07', unemployment_rate: '0.006', notes: '' }); setShowAdd(true); }}><Plus className="h-4 w-4" />Nueva liquidación</Button>} />
        ) : (
          <div className="divide-y divide-slate-100">
            {records.map((record) => {
              const clientName = (record as PayrollRecord & { client?: Client }).client?.business_name || clients.find(c => c.id === record.client_id)?.business_name || 'Cliente';
              const periodDate = new Date(record.period_month);
              const periodLabel = `${MONTHS_ES[periodDate.getMonth()]} ${periodDate.getFullYear()}`;
              return (
                <div key={record.id} className="px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{record.employee_name}</p>
                      <p className="text-xs text-slate-400">{clientName} · {periodLabel}{record.rut ? ` · RUT: ${record.rut}` : ''}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Base</p>
                          <p className="text-sm font-bold text-slate-700">{formatCLP(record.base_salary)}</p>
                        </div>
                        <div className="rounded-lg bg-red-50 px-3 py-2">
                          <p className="text-xs text-red-400">Descuentos</p>
                          <p className="text-sm font-bold text-red-700">{formatCLP(record.total_deductions)}</p>
                        </div>
                        <div className="rounded-lg bg-green-50 px-3 py-2">
                          <p className="text-xs text-green-400">Líquido</p>
                          <p className="text-sm font-bold text-green-700">{formatCLP(record.net_salary)}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">AFP / Salud</p>
                          <p className="text-xs font-medium text-slate-600">{formatCLP(record.afp_amount)} / {formatCLP(record.health_amount)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => exportLiquidacion(record)} className="rounded-lg p-1.5 text-teal-500 hover:bg-teal-50 transition-colors" title="Exportar liquidación">
                        <Download className="h-4 w-4" />
                      </button>
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva liquidación de sueldo">
        <form onSubmit={handleSave} className="space-y-4">
          <Select label="Cliente" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} required>
            <option value="">Selecciona un cliente</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre del empleado" type="text" value={form.employee_name} onChange={(e) => setForm({ ...form, employee_name: e.target.value })} placeholder="Juan Pérez" required />
            <Input label="RUT (opcional)" type="text" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} placeholder="12.345.678-9" />
          </div>
          <Input label="Período" type="month" value={form.period_month ? form.period_month.substring(0, 7) : ''} onChange={(e) => setForm({ ...form, period_month: e.target.value + '-01' })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Sueldo base (CLP)" type="number" value={form.base_salary} onChange={(e) => setForm({ ...form, base_salary: e.target.value })} placeholder="800000" required />
            <Input label="Haberes no imponibles" type="number" value={form.non_imponible} onChange={(e) => setForm({ ...form, non_imponible: e.target.value })} placeholder="50000" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Input label="Tasa AFP" type="number" step="0.0001" value={form.afp_rate} onChange={(e) => setForm({ ...form, afp_rate: e.target.value })} />
              <p className="mt-0.5 text-xs text-slate-400">Default: 11.44%</p>
            </div>
            <div>
              <Input label="Tasa Salud" type="number" step="0.0001" value={form.health_rate} onChange={(e) => setForm({ ...form, health_rate: e.target.value })} />
              <p className="mt-0.5 text-xs text-slate-400">Default: 7%</p>
            </div>
            <div>
              <Input label="Tasa Cesantía" type="number" step="0.0001" value={form.unemployment_rate} onChange={(e) => setForm({ ...form, unemployment_rate: e.target.value })} />
              <p className="mt-0.5 text-xs text-slate-400">Default: 0.6%</p>
            </div>
          </div>

          {/* Live calculation */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Cálculo automático</p>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Base tributable:</span>
              <span className="font-medium text-slate-700">{formatCLP(taxableBase)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">AFP ({(afpRate * 100).toFixed(2)}%):</span>
              <span className="font-medium text-red-600">-{formatCLP(afpAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Salud ({(healthRate * 100).toFixed(2)}%):</span>
              <span className="font-medium text-red-600">-{formatCLP(healthAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Seguro Cesantía ({(unemploymentRate * 100).toFixed(2)}%):</span>
              <span className="font-medium text-red-600">-{formatCLP(unemploymentAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="text-sm font-semibold text-slate-700">Sueldo líquido:</span>
              <span className="text-lg font-bold text-green-700">{formatCLP(netSalary)}</span>
            </div>
          </div>

          {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving || !form.client_id || !form.employee_name || !form.base_salary}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" />Guardar liquidación</>}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
