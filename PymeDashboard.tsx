import { useState, useEffect, useCallback } from 'react';
import { Building2, CheckCircle2, Clock, FileText, Calendar, Upload, Loader2, AlertCircle, Trash2, User, FolderOpen, MessageCircle, FileQuestion, CheckCircle, UploadCloud, BarChart3 } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ChatPanel } from '@/components/ChatPanel';
import { DocumentRequests } from '@/components/DocumentRequests';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { MassUpload } from '@/components/MassUpload';
import { FinancialHealth } from '@/components/FinancialHealth';
import type { Client, Task, TaxEvent, DocumentRecord, DocumentType, DocumentStatus, Profile, TaskStatus, TaskCategory } from '@/types';

interface PymeDashboardProps {
  userId: string;
}

type Tab = 'overview' | 'documents' | 'deadlines' | 'requests' | 'chat' | 'massupload' | 'financial';

export function PymeDashboard({ userId }: PymeDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [accountant, setAccountant] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taxEvents, setTaxEvents] = useState<TaxEvent[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('pyme_user_id', userId)
      .maybeSingle();

    const clientRecord = clientData as Client | null;
    setClient(clientRecord);

    if (clientRecord) {
      const [tasksRes, taxEventsRes, documentsRes, accountantRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('client_id', clientRecord.id).order('created_at', { ascending: false }),
        supabase.from('tax_events').select('*').order('event_date', { ascending: true }),
        supabase.from('documents').select('*').eq('client_id', clientRecord.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', clientRecord.accountant_id).maybeSingle(),
      ]);

      setTasks(tasksRes.data as Task[] || []);
      setTaxEvents(taxEventsRes.data as TaxEvent[] || []);
      setDocuments(documentsRes.data as DocumentRecord[] || []);
      setAccountant(accountantRes.data as Profile | null);
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const tabs = [
    { id: 'overview', label: 'Mi contabilidad', icon: <Building2 className="h-4 w-4" /> },
    { id: 'documents', label: 'Documentos', icon: <FileText className="h-4 w-4" /> },
    { id: 'massupload', label: 'Carga Masiva', icon: <UploadCloud className="h-4 w-4" /> },
    { id: 'requests', label: 'Solicitudes', icon: <FileQuestion className="h-4 w-4" /> },
    { id: 'deadlines', label: 'Vencimientos', icon: <Calendar className="h-4 w-4" /> },
    { id: 'financial', label: 'Salud Financiera', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
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
            Tu cuenta no está vinculada a ningún contador. Pídele a tu contador que te envíe una invitación
            para que puedas acceder a tu panel de gestión contable.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <DashboardLayout activeTab={tab} onTabChange={(t) => setTab(t as Tab)} tabs={tabs}>
      {tab === 'overview' && <PymeOverview client={client} accountant={accountant} tasks={tasks} documents={documents} />}
      {tab === 'documents' && <PymeDocuments client={client} userId={userId} documents={documents} onChanged={loadData} />}
      {tab === 'massupload' && <MassUpload clients={[client]} userId={userId} onUploaded={loadData} />}
      {tab === 'requests' && <DocumentRequests clientId={client.id} accountantId={client.accountant_id} isAccountant={false} />}
      {tab === 'deadlines' && <PymeDeadlines taxEvents={taxEvents} tasks={tasks} />}
      {tab === 'financial' && <FinancialHealth clients={[client]} userId={userId} />}
      {tab === 'chat' && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chat con tu contador</h1>
            <p className="mt-1 text-sm text-slate-500">Comunicación directa con {accountant?.full_name || 'tu contador'}</p>
          </div>
          <ChatPanel clientId={client.id} userId={userId} accountantName={accountant?.full_name} pymeName={client.business_name} />
        </div>
      )}
    </DashboardLayout>
  );
}

// ===== PYME OVERVIEW =====
function PymeOverview({ client, accountant, tasks, documents }: { client: Client; accountant: Profile | null; tasks: Task[]; documents: DocumentRecord[] }) {
  const pendingTasks = tasks.filter(t => t.status !== 'completada').length;
  const pendingDocs = documents.filter(d => d.status === 'pendiente').length;
  const recentDocs = documents.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{client.business_name}</h1>
        <p className="mt-1 text-sm text-slate-500">RUT: {client.rut}</p>
      </div>

      {/* Status banner */}
      <div className={`flex items-center gap-4 rounded-xl border p-5 ${
        client.status === 'al_dia'
          ? 'border-green-200 bg-green-50'
          : 'border-amber-200 bg-amber-50'
      }`}>
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
          client.status === 'al_dia' ? 'bg-green-100' : 'bg-amber-100'
        }`}>
          {client.status === 'al_dia'
            ? <CheckCircle2 className="h-6 w-6 text-green-600" />
            : <Clock className="h-6 w-6 text-amber-600" />
          }
        </div>
        <div>
          <p className={`text-lg font-semibold ${client.status === 'al_dia' ? 'text-green-800' : 'text-amber-800'}`}>
            {client.status === 'al_dia' ? 'Contabilidad al día' : 'Contabilidad pendiente'}
          </p>
          <p className={`text-sm ${client.status === 'al_dia' ? 'text-green-600' : 'text-amber-600'}`}>
            {client.status === 'al_dia'
              ? 'Todas tus obligaciones tributarias están al día'
              : 'Tienes obligaciones pendientes — revisa las tareas y vencimientos'}
          </p>
        </div>
      </div>

      {/* Accountant info + quick stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <User className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Mi contador</p>
              <p className="text-sm font-semibold text-slate-900">{accountant?.full_name || 'Sin asignar'}</p>
              {accountant?.email && <p className="text-xs text-slate-400">{accountant.email}</p>}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Tareas pendientes</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{pendingTasks}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Documentos pendientes</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{pendingDocs}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent documents */}
      <Card>
        <CardHeader title="Documentos recientes" description="Últimos archivos subidos" />
        <div className="divide-y divide-slate-100">
          {recentDocs.length === 0 ? (
            <EmptyState icon={<FolderOpen className="h-6 w-6" />} title="No has subido documentos" description="Sube tus facturas y cartolas bancarias para que tu contador las revise" />
          ) : (
            recentDocs.map((doc) => <DocRow key={doc.id} doc={doc} compact />)
          )}
        </div>
      </Card>
    </div>
  );
}

// ===== PYME DOCUMENTS =====
function PymeDocuments({ client, userId, documents, onChanged }: { client: Client; userId: string; documents: DocumentRecord[]; onChanged: () => void }) {
  const [showUpload, setShowUpload] = useState(false);
  const [fileType, setFileType] = useState<DocumentType>('factura');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `${client.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert({
        client_id: client.id,
        uploaded_by: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        status: 'pendiente',
      });

      if (dbError) throw dbError;

      setFile(null);
      setFileType('factura');
      setShowUpload(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const deleteDoc = async (doc: DocumentRecord) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    onChanged();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis documentos</h1>
          <p className="mt-1 text-sm text-slate-500">{documents.length} documento(s) subido(s)</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="h-4 w-4" />
          Subir documento
        </Button>
      </div>

      <Card>
        {documents.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title="No has subido documentos"
            description="Sube tus facturas, cartolas bancarias y otros documentos para que tu contador los revise"
            action={<Button onClick={() => setShowUpload(true)}><Upload className="h-4 w-4" />Subir documento</Button>}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <DocRow key={doc.id} doc={doc} onDelete={() => deleteDoc(doc)} />
            ))}
          </div>
        )}
      </Card>

      <Modal open={showUpload} onClose={() => { setShowUpload(false); setError(null); setFile(null); }} title="Subir documento">
        <form onSubmit={handleUpload} className="space-y-4">
          <Select
            label="Tipo de documento"
            value={fileType}
            onChange={(e) => setFileType(e.target.value as DocumentType)}
          >
            <option value="factura">Factura</option>
            <option value="cartola_bancaria">Cartola bancaria</option>
            <option value="boleta">Boleta</option>
            <option value="otro">Otro</option>
          </Select>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Archivo (PDF/XML)</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile) setFile(droppedFile);
              }}
              className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                dragging ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                  <FileText className="h-5 w-5 text-teal-500" />
                  <span className="font-medium">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)} className="ml-2 text-xs text-red-400 hover:text-red-600">Quitar</button>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">Arrastra tu archivo aquí o</p>
                  <label className="mt-2 inline-block cursor-pointer rounded-lg bg-teal-50 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-100 transition-colors">
                    Seleccionar archivo
                    <input
                      type="file"
                      accept=".pdf,.xml"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button type="submit" disabled={uploading || !file}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subir documento'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ===== PYME DEADLINES =====
function PymeDeadlines({ taxEvents, tasks }: { taxEvents: TaxEvent[]; tasks: Task[] }) {
  const now = new Date();
  const upcomingEvents = taxEvents.filter(e => new Date(e.event_date) >= now).slice(0, 10);
  const myDeadlines = tasks.filter(t => t.due_date && new Date(t.due_date) >= now && t.status !== 'completada');

  const categoryConfig: Record<string, { color: string; bg: string; label: string }> = {
    f29: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', label: 'F29' },
    iva: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'IVA' },
    remuneraciones: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Remuneraciones' },
    otro: { color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200', label: 'Otro' },
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Próximos vencimientos</h1>
        <p className="mt-1 text-sm text-slate-500">Fechas límite del SII y tareas asignadas por tu contador</p>
      </div>

      {myDeadlines.length > 0 && (
        <Card>
          <CardHeader title="Mis tareas pendientes" description={`${myDeadlines.length} tarea(s) por completar`} />
          <div className="divide-y divide-slate-100">
            {myDeadlines.map((task) => {
              const cfg = categoryConfig[task.category] || categoryConfig.otro;
              const date = new Date(task.due_date!);
              return (
                <div key={task.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 px-3 py-2 min-w-[60px]">
                    <span className="text-xs font-medium text-slate-400">{date.toLocaleDateString('es-CL', { month: 'short' })}</span>
                    <span className="text-lg font-bold text-slate-700">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    {task.description && <p className="mt-0.5 text-xs text-slate-500">{task.description}</p>}
                  </div>
                  <Badge className={`border ${cfg.bg} ${cfg.color} flex-shrink-0`}>{cfg.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Calendario tributario SII" description="Vencimientos oficiales del Servicio de Impuestos Internos" />
        <div className="divide-y divide-slate-100">
          {upcomingEvents.length === 0 ? (
            <EmptyState icon={<Calendar className="h-6 w-6" />} title="No hay vencimientos próximos" />
          ) : (
            upcomingEvents.map((event) => {
              const cfg = categoryConfig[event.category] || categoryConfig.otro;
              const date = new Date(event.event_date);
              return (
                <div key={event.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="flex flex-shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 px-3 py-2 min-w-[60px]">
                    <span className="text-xs font-medium text-slate-400">{date.toLocaleDateString('es-CL', { month: 'short' })}</span>
                    <span className="text-lg font-bold text-slate-700">{date.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{event.title}</p>
                    {event.description && <p className="mt-0.5 text-xs text-slate-500">{event.description}</p>}
                  </div>
                  <Badge className={`border ${cfg.bg} ${cfg.color} flex-shrink-0`}>{cfg.label}</Badge>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

// ===== SHARED DOC ROW =====
function DocRow({ doc, onDelete, compact }: { doc: DocumentRecord; onDelete?: () => void; compact?: boolean }) {
  const typeLabel: Record<DocumentType, string> = { factura: 'Factura', cartola_bancaria: 'Cartola bancaria', boleta: 'Boleta', remuneraciones: 'Remuneraciones', documentos_tributarios: 'Doc. Tributarios', contratos: 'Contratos', otro: 'Otro' };
  const statusBadge = (status: DocumentStatus) => {
    if (status === 'revisado') return <Badge color="green"><CheckCircle2 className="h-3 w-3" />Revisado</Badge>;
    if (status === 'rechazado') return <Badge color="red">Rechazado</Badge>;
    return <Badge color="amber">Pendiente</Badge>;
  };

  return (
    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{doc.file_name}</p>
          {!compact && (
            <p className="text-xs text-slate-400">{typeLabel[doc.file_type]} · {new Date(doc.created_at).toLocaleDateString('es-CL')}</p>
          )}
          {compact && <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString('es-CL')}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {statusBadge(doc.status)}
        {onDelete && (
          <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
