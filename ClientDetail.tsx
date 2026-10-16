import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Folder, FileText, CheckCircle2, Clock, AlertCircle, Loader2, Download, Building2, Mail, Phone } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChatPanel } from '@/components/ChatPanel';
import { DocumentRequests } from '@/components/DocumentRequests';
import type { Client, Task, DocumentRecord, DocumentType, DocumentStatus } from '@/types';

interface ClientDetailProps {
  client: Client;
  userId: string;
  onBack: () => void;
}

const MONTH_FOLDERS = [
  { id: 'enero', label: 'Enero', month: 1 },
  { id: 'febrero', label: 'Febrero', month: 2 },
  { id: 'marzo', label: 'Marzo', month: 3 },
  { id: 'abril', label: 'Abril', month: 4 },
  { id: 'mayo', label: 'Mayo', month: 5 },
  { id: 'junio', label: 'Junio', month: 6 },
  { id: 'julio', label: 'Julio', month: 7 },
  { id: 'agosto', label: 'Agosto', month: 8 },
  { id: 'septiembre', label: 'Septiembre', month: 9 },
  { id: 'octubre', label: 'Octubre', month: 10 },
  { id: 'noviembre', label: 'Noviembre', month: 11 },
  { id: 'diciembre', label: 'Diciembre', month: 12 },
];

const CATEGORY_FOLDERS = [
  { id: 'facturas', label: 'Facturas', type: 'factura' as DocumentType },
  { id: 'boletas', label: 'Boletas', type: 'boleta' as DocumentType },
  { id: 'bancos', label: 'Bancos', type: 'cartola_bancaria' as DocumentType },
  { id: 'remuneraciones', label: 'Remuneraciones', type: 'remuneraciones' as DocumentType },
  { id: 'impuestos', label: 'Doc. Tributarios', type: 'documentos_tributarios' as DocumentType },
  { id: 'contratos', label: 'Contratos', type: 'contratos' as DocumentType },
  { id: 'otros', label: 'Otros', type: 'otro' as DocumentType },
];

type FolderId = string;

export function ClientDetail({ client, userId, onBack }: ClientDetailProps) {
  const [activeFolder, setActiveFolder] = useState<FolderId>('resumen');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [tasksRes, docsRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
      supabase.from('documents').select('*').eq('client_id', client.id).order('created_at', { ascending: false }),
    ]);
    setTasks((tasksRes.data as Task[]) || []);
    setDocuments((docsRes.data as DocumentRecord[]) || []);
    setLoading(false);
  }, [client.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const docsInMonthFolder = (monthNum: number) => {
    return documents.filter((d) => {
      const docMonth = new Date(d.created_at).getMonth() + 1;
      return docMonth === monthNum;
    });
  };

  const docsInCategoryFolder = (docType: DocumentType) => {
    return documents.filter((d) => d.file_type === docType);
  };

  const getFolderDocs = (folderId: string): DocumentRecord[] => {
    const month = MONTH_FOLDERS.find((f) => f.id === folderId);
    if (month) return docsInMonthFolder(month.month);
    const cat = CATEGORY_FOLDERS.find((f) => f.id === folderId);
    if (cat) return docsInCategoryFolder(cat.type);
    return [];
  };

  const downloadDoc = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.file_path, 60);
    if (data) window.open(data.signedUrl, '_blank');
  };

  const updateDocStatus = async (doc: DocumentRecord, status: DocumentStatus) => {
    await supabase.from('documents').update({ status }).eq('id', doc.id);
    loadData();
  };

  const statusBadge = (status: DocumentStatus) => {
    if (status === 'revisado') return <Badge color="green"><CheckCircle2 className="h-3 w-3" />Revisado</Badge>;
    if (status === 'rechazado') return <Badge color="red">Rechazado</Badge>;
    if (status === 'falta_documento') return <Badge color="slate">Falta Documento</Badge>;
    return <Badge color="amber">Pendiente</Badge>;
  };

  const pendingTasks = tasks.filter((t) => t.status !== 'completada').length;
  const pendingDocs = documents.filter((d) => d.status === 'pendiente').length;

  const allFolders = [
    { id: 'resumen', label: 'Resumen', icon: <Building2 className="h-4 w-4" /> },
    ...MONTH_FOLDERS.map((f) => ({ id: f.id, label: f.label, icon: <Folder className="h-4 w-4" /> })),
    ...CATEGORY_FOLDERS.map((f) => ({ id: f.id, label: f.label, icon: <Folder className="h-4 w-4" /> })),
    { id: 'solicitudes', label: 'Solicitudes', icon: <FileText className="h-4 w-4" /> },
    { id: 'chat', label: 'Chat', icon: <Mail className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{client.business_name}</h1>
          <p className="text-sm text-slate-500">RUT: {client.rut}</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Folder sidebar */}
        <aside className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {allFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(folder.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  activeFolder === folder.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {folder.icon}
                <span>{folder.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Folder content */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-teal-500" /></div>
          ) : activeFolder === 'resumen' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-5">
                  <p className="text-sm text-slate-500">Tareas pendientes</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{pendingTasks}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm text-slate-500">Documentos pendientes</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{pendingDocs}</p>
                </Card>
                <Card className="p-5">
                  <p className="text-sm text-slate-500">Total documentos</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{documents.length}</p>
                </Card>
              </div>

              <Card>
                <CardHeader title="Información del cliente" />
                <div className="space-y-3 px-5 py-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{client.business_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600">{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    {client.status === 'al_dia' ? (
                      <Badge color="green"><CheckCircle2 className="h-3 w-3" />Al día</Badge>
                    ) : (
                      <Badge color="amber"><Clock className="h-3 w-3" />Pendiente</Badge>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <CardHeader title="Tareas recientes" description={`${tasks.length} tarea(s)`} />
                <div className="divide-y divide-slate-100">
                  {tasks.length === 0 ? (
                    <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="Sin tareas" />
                  ) : (
                    tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                          task.status === 'completada' ? 'border-teal-500 bg-teal-500' : 'border-slate-300'
                        }`}>
                          {task.status === 'completada' && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        <p className={`text-sm flex-1 ${task.status === 'completada' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{task.title}</p>
                        {task.due_date && <span className="text-xs text-slate-400">{new Date(task.due_date).toLocaleDateString('es-CL')}</span>}
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : activeFolder === 'solicitudes' ? (
            <DocumentRequests clientId={client.id} accountantId={userId} isAccountant />
          ) : activeFolder === 'chat' ? (
            <ChatPanel clientId={client.id} userId={userId} pymeName={client.business_name} />
          ) : (
            <Card>
              <CardHeader
                title={allFolders.find((f) => f.id === activeFolder)?.label || 'Documentos'}
                description={`${getFolderDocs(activeFolder).length} documento(s)`}
              />
              {getFolderDocs(activeFolder).length === 0 ? (
                <EmptyState icon={<Folder className="h-6 w-6" />} title="Carpeta vacía" description="No hay documentos en esta carpeta" />
              ) : (
                <div className="divide-y divide-slate-100">
                  {getFolderDocs(activeFolder).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{doc.file_name}</p>
                          <p className="text-xs text-slate-400">{new Date(doc.created_at).toLocaleDateString('es-CL')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {statusBadge(doc.status)}
                        {doc.status === 'pendiente' && (
                          <>
                            <button onClick={() => updateDocStatus(doc, 'revisado')} className="rounded-lg p-1.5 text-green-500 hover:bg-green-50 transition-colors" title="Aprobar">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => updateDocStatus(doc, 'rechazado')} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 transition-colors" title="Rechazar">
                              <AlertCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => downloadDoc(doc)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Descargar">
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
