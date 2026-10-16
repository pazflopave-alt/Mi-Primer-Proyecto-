import { useState, useEffect, useCallback } from 'react';
import { User, FileText, Download, CheckCircle2, Clock, DollarSign, Loader2, AlertCircle, FolderOpen } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, Task, DocumentRecord, ClientFee, Profile, DocumentStatus, FeeStatus } from '@/types';

interface ClienteDashboardProps {
  userId: string;
}

type Tab = 'overview' | 'documents' | 'tasks' | 'fees';

export function ClienteDashboard({ userId }: ClienteDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [accountant, setAccountant] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [fees, setFees] = useState<ClientFee[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: linkData } = await supabase
      .from('client_links')
      .select('*, client:clients(*)')
      .eq('cliente_id', userId)
      .maybeSingle();

    const link = linkData as { client: Client | null; accountant_id: string; client_record_id: string | null } | null;
    const clientRecord = link?.client as Client | null;

    if (clientRecord) {
      setClient(clientRecord);

      const [docsRes, tasksRes, feesRes, accountantRes] = await Promise.all([
        supabase.from('documents').select('*').eq('client_id', clientRecord.id).order('created_at', { ascending: false }),
        supabase.from('tasks').select('*').eq('client_id', clientRecord.id).order('created_at', { ascending: false }),
        supabase.from('client_fees').select('*').eq('client_id', clientRecord.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', clientRecord.accountant_id).maybeSingle(),
      ]);

      setDocuments(docsRes.data as DocumentRecord[] || []);
      setTasks(tasksRes.data as Task[] || []);
      setFees(feesRes.data as ClientFee[] || []);
      setAccountant(accountantRes.data as Profile | null);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs = [
    { id: 'overview', label: 'Inicio', icon: <User className="h-4 w-4" /> },
    { id: 'documents', label: 'Documentos', icon: <FileText className="h-4 w-4" /> },
    { id: 'tasks', label: 'Tareas', icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: 'fees', label: 'Honorarios', icon: <DollarSign className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <AlertCircle className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sin contador asignado</h2>
          <p className="mt-2 text-sm text-slate-500">
            Tu cuenta no esta vinculada a ningun contador. Pidele a tu contador que te envie una invitacion.
          </p>
        </Card>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.status !== 'completada');
  const completedTasks = tasks.filter(t => t.status === 'completada');
  const paidFees = fees.filter(f => f.status === 'pagado');
  const pendingFees = fees.filter(f => f.status === 'pendiente');
  const overdueFees = fees.filter(f => f.status === 'vencido');

  const downloadDoc = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.file_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const feeStatusBadge = (status: FeeStatus) => {
    if (status === 'pagado') return <Badge color="green"><CheckCircle2 className="h-3 w-3" />Pagado</Badge>;
    if (status === 'vencido') return <Badge color="red">Vencido</Badge>;
    return <Badge color="amber"><Clock className="h-3 w-3" />Pendiente</Badge>;
  };

  const formatCLP = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

  return (
    <DashboardLayout activeTab={tab} onTabChange={(t) => setTab(t as Tab)} tabs={tabs}>
      {tab === 'overview' && (
        <div className="space-y-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <User className="h-6 w-6 text-teal-600" />
              {client.business_name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">Panel de consulta</p>
          </div>

          {/* Accountant info */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
                <User className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Mi contador</p>
                <p className="text-base font-semibold text-slate-900">{accountant?.full_name || 'Sin asignar'}</p>
                {accountant?.email && <p className="text-xs text-slate-400">{accountant.email}</p>}
              </div>
            </div>
          </Card>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Documentos</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{documents.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Tareas pendientes</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{pendingTasks.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Honorarios pagados</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{paidFees.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Honorarios pendientes</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{pendingFees.length + overdueFees.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Recent documents */}
          <Card>
            <CardHeader title="Documentos recientes" description="Archivos compartidos por tu contador" />
            <div className="divide-y divide-slate-100">
              {documents.length === 0 ? (
                <EmptyState icon={<FolderOpen className="h-6 w-6" />} title="No hay documentos" description="Tu contador subira documentos aqui para que puedas descargarlos" />
              ) : (
                documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{doc.file_name}</p>
                        <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString('es-CL')}</p>
                      </div>
                    </div>
                    <button onClick={() => downloadDoc(doc)} className="rounded-lg p-1.5 text-teal-500 hover:bg-teal-50 transition-colors" title="Descargar">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis documentos</h1>
            <p className="mt-1 text-sm text-slate-500">Descarga los documentos e informes emitidos por tu contador</p>
          </div>
          <Card>
            {documents.length === 0 ? (
              <EmptyState icon={<FolderOpen className="h-6 w-6" />} title="No hay documentos" description="Tu contador subira documentos e informes aqui" />
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const typeLabels: Record<string, string> = { factura: 'Factura', cartola_bancaria: 'Cartola bancaria', boleta: 'Boleta', remuneraciones: 'Remuneraciones', documentos_tributarios: 'Doc. Tributarios', contratos: 'Contratos', otro: 'Otro' };
                  return (
                    <div key={doc.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{doc.file_name}</p>
                          <p className="text-xs text-slate-400">{typeLabels[doc.file_type] || 'Documento'} - {new Date(doc.created_at).toLocaleDateString('es-CL')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.status === 'revisado' && <Badge color="green">Revisado</Badge>}
                        {doc.status === 'pendiente' && <Badge color="amber">Pendiente</Badge>}
                        {doc.status === 'rechazado' && <Badge color="red">Rechazado</Badge>}
                        <button onClick={() => downloadDoc(doc)} className="rounded-lg p-1.5 text-teal-500 hover:bg-teal-50 transition-colors" title="Descargar">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'tasks' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mis tareas</h1>
            <p className="mt-1 text-sm text-slate-500">Tareas asignadas por tu contador</p>
          </div>
          {pendingTasks.length > 0 && (
            <Card>
              <CardHeader title="Pendientes" description={`${pendingTasks.length} tarea(s)`} />
              <div className="divide-y divide-slate-100">
                {pendingTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                    <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                      {task.description && <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>}
                    </div>
                    {task.due_date && <span className="text-xs text-slate-400 flex-shrink-0">{new Date(task.due_date).toLocaleDateString('es-CL')}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {completedTasks.length > 0 && (
            <Card>
              <CardHeader title="Completadas" description={`${completedTasks.length} tarea(s)`} />
              <div className="divide-y divide-slate-100">
                {completedTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {tasks.length === 0 && (
            <Card>
              <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No hay tareas" description="Tu contador te asignara tareas que apareceran aqui" />
            </Card>
          )}
        </div>
      )}

      {tab === 'fees' && (
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Estado de honorarios</h1>
            <p className="mt-1 text-sm text-slate-500">Pagos de honorarios a tu contador</p>
          </div>
          <Card>
            {fees.length === 0 ? (
              <EmptyState icon={<DollarSign className="h-6 w-6" />} title="No hay cobros registrados" description="Los cobros de honorarios de tu contador apareceran aqui" />
            ) : (
              <div className="divide-y divide-slate-100">
                {fees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{fee.description}</p>
                      <p className="text-xs text-slate-400">
                        {formatCLP(fee.amount_clp)} {fee.includes_iva ? '(incluye IVA)' : ''}
                        {fee.due_date && ` - Vence: ${new Date(fee.due_date).toLocaleDateString('es-CL')}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {feeStatusBadge(fee.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
