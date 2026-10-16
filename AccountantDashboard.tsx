import { useState, useEffect, useCallback } from 'react';
import { Building2, CheckCircle2, Clock, FileText, Calendar, Plus, Users, TrendingUp, AlertCircle, Loader2, Trash2, Upload, FolderOpen, ArrowRight, Sparkles, DollarSign, Bell, XCircle, Calculator, Receipt, UploadCloud, BarChart3 } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { TrialBanner } from '@/components/TrialBanner';
import { ClientDetail } from '@/components/ClientDetail';
import { DocumentCenter } from '@/components/DocumentCenter';
import { DocumentRequestsTab } from '@/components/DocumentRequestsTab';
import { AIAssistant } from '@/components/AIAssistant';
import { BillingTab } from '@/components/BillingTab';
import { InteractiveCalendar } from '@/components/InteractiveCalendar';
import { IvaCalculator } from '@/components/IvaCalculator';
import { BoletaRegistry } from '@/components/BoletaRegistry';
import { PayrollCalculator } from '@/components/PayrollCalculator';
import { MassUpload } from '@/components/MassUpload';
import { FinancialHealth } from '@/components/FinancialHealth';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, Task, TaxEvent, DocumentRecord, ClientStatus, TaskStatus, TaskCategory, DocumentType, DocumentStatus, TaxCategory } from '@/types';

interface AccountantDashboardProps {
  userId: string;
}

type Tab = 'overview' | 'clients' | 'tasks' | 'calendar' | 'documents' | 'requests' | 'ai' | 'billing' | 'iva' | 'boletas' | 'payroll' | 'massupload' | 'financial';

export function AccountantDashboard({ userId }: AccountantDashboardProps) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taxEvents, setTaxEvents] = useState<TaxEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [clientsRes, tasksRes, taxEventsRes, documentsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('accountant_id', userId).order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').eq('accountant_id', userId).order('created_at', { ascending: false }),
      supabase.from('tax_events').select('*').order('event_date', { ascending: true }),
      supabase.from('documents').select('*, client:clients(*)').order('created_at', { ascending: false }),
    ]);

    setClients(clientsRes.data as Client[] || []);
    setTasks(tasksRes.data as Task[] || []);
    setTaxEvents(taxEventsRes.data as TaxEvent[] || []);
    setDocuments(documentsRes.data as DocumentRecord[] || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'clients', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { id: 'documents', label: 'Documentos', icon: <FileText className="h-4 w-4" /> },
    { id: 'requests', label: 'Solicitudes', icon: <Bell className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tareas', icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 'calendar', label: 'Calendario', icon: <Calendar className="h-4 w-4" /> },
    { id: 'iva', label: 'IVA / F29', icon: <Calculator className="h-4 w-4" /> },
    { id: 'boletas', label: 'Boletas', icon: <Receipt className="h-4 w-4" /> },
    { id: 'payroll', label: 'Remuneraciones', icon: <Users className="h-4 w-4" /> },
    { id: 'billing', label: 'Cobros', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'massupload', label: 'Carga Masiva', icon: <UploadCloud className="h-4 w-4" /> },
    { id: 'financial', label: 'Salud Financiera', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'ai', label: 'Asistente IA', icon: <Sparkles className="h-4 w-4" /> },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <DashboardLayout activeTab={tab} onTabChange={(t) => setTab(t as Tab)} tabs={tabs}>
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
        </div>
      ) : selectedClient ? (
        <ClientDetail client={selectedClient} userId={userId} onBack={() => setSelectedClient(null)} />
      ) : (
        <div className="space-y-4">
          <TrialBanner trialEndsAt={profile?.trial_ends_at ?? null} onActivate={() => setTab('overview')} />
          {tab === 'overview' && <OverviewTab clients={clients} tasks={tasks} taxEvents={taxEvents} documents={documents} accountantName={profile?.full_name || ''} greeting={getGreeting()} onSelectClient={(c) => setSelectedClient(c)} />}
          {tab === 'clients' && <ClientsTab clients={clients} userId={userId} onChanged={loadData} onSelectClient={(c) => setSelectedClient(c)} />}
          {tab === 'documents' && <DocumentCenter clients={clients} userId={userId} documents={documents} onChanged={loadData} />}
          {tab === 'requests' && <DocumentRequestsTab clients={clients} userId={userId} onChanged={loadData} />}
          {tab === 'tasks' && <TasksTab tasks={tasks} clients={clients} userId={userId} onChanged={loadData} />}
          {tab === 'calendar' && <InteractiveCalendar clients={clients} userId={userId} />}
          {tab === 'iva' && <IvaCalculator clients={clients} userId={userId} />}
          {tab === 'boletas' && <BoletaRegistry clients={clients} userId={userId} />}
          {tab === 'payroll' && <PayrollCalculator clients={clients} userId={userId} />}
          {tab === 'billing' && <BillingTab clients={clients} userId={userId} />}
          {tab === 'massupload' && <MassUpload clients={clients} userId={userId} onUploaded={loadData} />}
          {tab === 'financial' && <FinancialHealth clients={clients} userId={userId} />}
          {tab === 'ai' && <AIAssistant clients={clients} tasks={tasks} documents={documents} />}
        </div>
      )}
    </DashboardLayout>
  );
}

// ===== OVERVIEW =====
function OverviewTab({ clients, tasks, taxEvents, documents, accountantName, greeting, onSelectClient }: { clients: Client[]; tasks: Task[]; taxEvents: TaxEvent[]; documents: DocumentRecord[]; accountantName: string; greeting: string; onSelectClient: (c: Client) => void }) {
  const alDia = clients.filter(c => c.status === 'al_dia').length;
  const pendiente = clients.filter(c => c.status === 'pendiente').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completada').length;
  const pendingDocs = documents.filter(d => d.status === 'pendiente').length;
  const reviewedDocs = documents.filter(d => d.status === 'revisado').length;
  const upcomingEvents = taxEvents.filter(e => new Date(e.event_date) >= new Date()).slice(0, 5);

  const todayTasks = tasks.filter(t => {
    if (t.status === 'completada') return false;
    if (!t.due_date) return false;
    const due = new Date(t.due_date);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  });

  const stats = [
    { label: 'Clientes totales', value: clients.length, icon: <Users className="h-5 w-5" />, color: 'text-teal-600 bg-teal-50' },
    { label: 'Al día', value: alDia, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-600 bg-green-50' },
    { label: 'Pendientes', value: pendiente, icon: <Clock className="h-5 w-5" />, color: 'text-amber-600 bg-amber-50' },
    { label: 'Tareas activas', value: pendingTasks, icon: <AlertCircle className="h-5 w-5" />, color: 'text-blue-600 bg-blue-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {accountantName}</h1>
        <p className="mt-1 text-sm text-slate-500">Resumen general de tu cartera de clientes</p>
      </div>

      {/* Today's obligations alert */}
      {todayTasks.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">Tienes {todayTasks.length} obligación(es) pendiente(s) hoy</p>
            <p className="text-xs text-amber-700">{todayTasks.map(t => t.title).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Document health */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Documentos revisados</p>
              <p className="text-xl font-bold text-slate-900">{reviewedDocs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Documentos pendientes</p>
              <p className="text-xl font-bold text-slate-900">{pendingDocs}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total documentos</p>
              <p className="text-xl font-bold text-slate-900">{documents.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Próximos vencimientos tributarios" description="Calendario SII" />
          <div className="divide-y divide-slate-100">
            {upcomingEvents.length === 0 ? (
              <EmptyState title="No hay vencimientos próximos" />
            ) : (
              upcomingEvents.map((event) => <TaxEventRow key={event.id} event={event} />)
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Documentos pendientes de revisión" description={`${pendingDocs} documento(s) por revisar`} />
          <div className="divide-y divide-slate-100">
            {pendingDocs === 0 ? (
              <EmptyState title="No hay documentos pendientes" />
            ) : (
              documents.filter(d => d.status === 'pendiente').slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{doc.file_name}</p>
                      <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString('es-CL')}</p>
                    </div>
                  </div>
                  <Badge color="amber">Pendiente</Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ===== CLIENTS =====
function ClientsTab({ clients, userId, onChanged, onSelectClient }: { clients: Client[]; userId: string; onChanged: () => void; onSelectClient: (c: Client) => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ business_name: '', rut: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('clients').insert({
      accountant_id: userId,
      business_name: form.business_name,
      rut: form.rut,
      email: form.email,
      phone: form.phone || null,
      status: 'pendiente',
    });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setForm({ business_name: '', rut: '', email: '', phone: '' });
    setShowAdd(false);
    setSaving(false);
    onChanged();
  };

  const toggleStatus = async (client: Client) => {
    const newStatus: ClientStatus = client.status === 'al_dia' ? 'pendiente' : 'al_dia';
    await supabase.from('clients').update({ status: newStatus }).eq('id', client.id);
    onChanged();
  };

  const deleteClient = async (id: string) => {
    if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return;
    await supabase.from('clients').delete().eq('id', id);
    onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">{clients.length} PYME(s) asociada(s)</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Agregar cliente
        </Button>
      </div>

      <Card>
        {clients.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No tienes clientes asociados"
            description="Agrega tu primera PYME para comenzar a gestionar su contabilidad"
            action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Agregar cliente</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => onSelectClient(client)}>
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Building2 className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{client.business_name}</p>
                    <p className="truncate text-xs text-slate-400">RUT: {client.rut} · {client.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => onSelectClient(client)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Ver detalle">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleStatus(client)} className="transition-transform hover:scale-105">
                    {client.status === 'al_dia' ? (
                      <Badge color="green"><CheckCircle2 className="h-3 w-3" />Al día</Badge>
                    ) : (
                      <Badge color="amber"><Clock className="h-3 w-3" />Pendiente</Badge>
                    )}
                  </button>
                  <button onClick={() => deleteClient(client.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Agregar nuevo cliente">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Nombre o razón social" type="text" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Mi Empresa SpA" required />
          <Input label="RUT" type="text" value={form.rut} onChange={(e) => setForm({ ...form, rut: e.target.value })} placeholder="76.543.210-K" required />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="contacto@empresa.cl" required />
          <Input label="Teléfono (opcional)" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+56 9 1234 5678" />
          {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cliente'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ===== TASKS =====
function TasksTab({ tasks, clients, userId, onChanged }: { tasks: Task[]; clients: Client[]; userId: string; onChanged: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', client_id: '', due_date: '', category: 'otro' as TaskCategory });
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('tasks').insert({
      accountant_id: userId,
      title: form.title,
      description: form.description || null,
      client_id: form.client_id || null,
      due_date: form.due_date || null,
      category: form.category,
      status: 'pendiente',
    });
    setForm({ title: '', description: '', client_id: '', due_date: '', category: 'otro' });
    setShowAdd(false);
    setSaving(false);
    onChanged();
  };

  const cycleStatus = async (task: Task) => {
    const next: TaskStatus = task.status === 'pendiente' ? 'en_progreso' : task.status === 'en_progreso' ? 'completada' : 'pendiente';
    await supabase.from('tasks').update({ status: next }).eq('id', task.id);
    onChanged();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    onChanged();
  };

  const statusBadge = (status: TaskStatus) => {
    if (status === 'completada') return <Badge color="green"><CheckCircle2 className="h-3 w-3" />Completada</Badge>;
    if (status === 'en_progreso') return <Badge color="blue">En progreso</Badge>;
    return <Badge color="amber">Pendiente</Badge>;
  };

  const categoryLabel: Record<TaskCategory, string> = { f29: 'F29', iva: 'IVA', remuneraciones: 'Remuneraciones', otro: 'Otro' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tareas pendientes</h1>
          <p className="mt-1 text-sm text-slate-500">{tasks.filter(t => t.status !== 'completada').length} tarea(s) activa(s)</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Nueva tarea</Button>
      </div>

      <Card>
        {tasks.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No tienes tareas" description="Crea tareas para llevar control de las obligaciones de cada cliente" action={<Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Nueva tarea</Button>} />
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const client = clients.find(c => c.id === task.client_id);
              const overdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completada';
              return (
                <div key={task.id} className="flex items-start justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button onClick={() => cycleStatus(task)} className="mt-0.5 flex-shrink-0">
                      <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${task.status === 'completada' ? 'border-teal-500 bg-teal-500' : 'border-slate-300 hover:border-teal-400'}`}>
                        {task.status === 'completada' && <CheckCircle2 className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${task.status === 'completada' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p>
                      {task.description && <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {client && <Badge color="slate">{client.business_name}</Badge>}
                        <Badge color="blue">{categoryLabel[task.category]}</Badge>
                        {task.due_date && <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>Vence: {new Date(task.due_date).toLocaleDateString('es-CL')}{overdue && ' (vencida)'}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {statusBadge(task.status)}
                    <button onClick={() => deleteTask(task.id)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Nueva tarea">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Título" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Declarar F29 de agosto" required />
          <Textarea label="Descripción (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles de la tarea..." rows={3} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Cliente (opcional)" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
              <option value="">Sin cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
            </Select>
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}>
              <option value="f29">F29</option>
              <option value="iva">IVA</option>
              <option value="remuneraciones">Remuneraciones</option>
              <option value="otro">Otro</option>
            </Select>
          </div>
          <Input label="Fecha de vencimiento (opcional)" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear tarea'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TaxEventRow({ event, dimmed }: { event: TaxEvent; dimmed?: boolean }) {
  const cfg: { color: string; bg: string; label: string } = {
    f29: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', label: 'F29' },
    iva: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'IVA' },
    remuneraciones: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Remuneraciones' },
    renta: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Renta' },
    entrega_documentos: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', label: 'Entrega Docs' },
    otro: { color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200', label: 'Otro' },
  }[event.category] || { color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200', label: event.category };
  const date = new Date(event.event_date);
  const isOverdue = date < new Date();

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 ${dimmed ? 'opacity-50' : ''}`}>
      <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 px-3 py-2 min-w-[60px]">
        <span className="text-xs font-medium text-slate-400">{date.toLocaleDateString('es-CL', { month: 'short' })}</span>
        <span className="text-lg font-bold text-slate-700">{date.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">{event.title}</p>
        {event.description && <p className="mt-0.5 text-xs text-slate-500">{event.description}</p>}
      </div>
      <Badge className={`border ${cfg.bg} ${cfg.color} flex-shrink-0`}>{cfg.label}</Badge>
      {isOverdue && !dimmed && <Badge color="red">Vencido</Badge>}
    </div>
  );
}
