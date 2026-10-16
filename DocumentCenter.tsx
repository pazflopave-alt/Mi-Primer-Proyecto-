import { useState, useEffect, useCallback } from 'react';
import { FileText, Folder, Download, CheckCircle2, AlertCircle, Clock, XCircle, Loader2, Trash2, Filter } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, DocumentRecord, DocumentType, DocumentStatus } from '@/types';

const FOLDER_CONFIG: { id: DocumentType; label: string; icon: string }[] = [
  { id: 'factura', label: 'Facturas', icon: '📄' },
  { id: 'boleta', label: 'Boletas', icon: '🧾' },
  { id: 'cartola_bancaria', label: 'Cartolas Bancarias', icon: '🏦' },
  { id: 'remuneraciones', label: 'Remuneraciones', icon: '👥' },
  { id: 'documentos_tributarios', label: 'Documentos Tributarios', icon: '📋' },
  { id: 'contratos', label: 'Contratos', icon: '📝' },
  { id: 'otro', label: 'Otros', icon: '📁' },
];

const STATUS_CONFIG: Record<DocumentStatus, { label: string; icon: string; color: string; badge: 'green' | 'amber' | 'red' | 'slate' }> = {
  revisado: { label: 'Revisado', icon: '✅', color: 'text-green-600', badge: 'green' },
  pendiente: { label: 'Pendiente', icon: '🟡', color: 'text-amber-600', badge: 'amber' },
  rechazado: { label: 'Rechazado', icon: '❌', color: 'text-red-600', badge: 'red' },
  falta_documento: { label: 'Falta Documento', icon: '⚠️', color: 'text-orange-600', badge: 'slate' },
};

interface DocumentCenterProps {
  clients: Client[];
  userId: string;
  documents: DocumentRecord[];
  onChanged: () => void;
}

export function DocumentCenter({ clients, userId, documents, onChanged }: DocumentCenterProps) {
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<DocumentType | 'all'>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ client_id: '', file_type: 'factura' as DocumentType, file: null as File | null });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.client_id) return;
    setUploading(true);
    setError(null);
    try {
      const file = uploadForm.file;
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `${uploadForm.client_id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, file);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('documents').insert({
        client_id: uploadForm.client_id,
        uploaded_by: userId,
        file_name: file.name,
        file_path: filePath,
        file_type: uploadForm.file_type,
        status: 'pendiente',
      });
      if (dbError) throw dbError;
      setUploadForm({ client_id: '', file_type: 'factura', file: null });
      setShowUpload(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo');
    } finally {
      setUploading(false);
    }
  };

  const updateDocStatus = async (doc: DocumentRecord, status: DocumentStatus) => {
    await supabase.from('documents').update({ status }).eq('id', doc.id);
    onChanged();
  };

  const deleteDoc = async (doc: DocumentRecord) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([doc.file_path]);
    await supabase.from('documents').delete().eq('id', doc.id);
    onChanged();
  };

  const downloadDoc = async (doc: DocumentRecord) => {
    const { data } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(doc.file_path, 60);
    if (data) window.open(data.signedUrl, '_blank');
  };

  const filtered = documents.filter((d) => {
    if (selectedClient && d.client_id !== selectedClient) return false;
    if (selectedFolder !== 'all' && d.file_type !== selectedFolder) return false;
    return true;
  });

  const folderCounts = (folderType: DocumentType) => {
    const docs = documents.filter((d) => {
      if (selectedClient && d.client_id !== selectedClient) return false;
      return d.file_type === folderType;
    });
    return docs.length;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Centro de Documentos</h1>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} documento(s) · {documents.filter(d => d.status === 'pendiente').length} pendientes de revisión</p>
        </div>
        <Button onClick={() => { setUploadForm({ client_id: selectedClient, file_type: selectedFolder !== 'all' ? selectedFolder : 'factura', file: null }); setShowUpload(true); }}>
          <FileText className="h-4 w-4" />
          Subir documento
        </Button>
      </div>

      {/* Client selector */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="max-w-xs">
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.business_name}</option>
          ))}
        </Select>
      </div>

      {/* Folder grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <button
          onClick={() => setSelectedFolder('all')}
          className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${
            selectedFolder === 'all' ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <Folder className="h-6 w-6 text-slate-500" />
          <span className="text-xs font-medium text-slate-700">Todos</span>
          <span className="text-xs text-slate-400">{documents.filter(d => !selectedClient || d.client_id === selectedClient).length}</span>
        </button>
        {FOLDER_CONFIG.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setSelectedFolder(folder.id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${
              selectedFolder === folder.id ? 'border-teal-500 bg-teal-50' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <span className="text-2xl">{folder.icon}</span>
            <span className="text-xs font-medium text-slate-700">{folder.label}</span>
            <span className="text-xs text-slate-400">{folderCounts(folder.id)}</span>
          </button>
        ))}
      </div>

      {/* Document list */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={<Folder className="h-6 w-6" />} title="No hay documentos en esta carpeta" description="Sube documentos o pide a tus clientes que los suban" />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((doc) => {
              const client = clients.find((c) => c.id === doc.client_id);
              const cfg = STATUS_CONFIG[doc.status];
              return (
                <div key={doc.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{doc.file_name}</p>
                      <p className="text-xs text-slate-400">
                        {client?.business_name || 'Cliente'} · {FOLDER_CONFIG.find(f => f.id === doc.file_type)?.label || doc.file_type} · {new Date(doc.created_at).toLocaleDateString('es-CL')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm ${cfg.color}`}>{cfg.icon}</span>
                    <Badge color={cfg.badge}>{cfg.label}</Badge>
                    {doc.status === 'pendiente' && (
                      <>
                        <button onClick={() => updateDocStatus(doc, 'revisado')} className="rounded-lg p-1.5 text-green-500 hover:bg-green-50 transition-colors" title="Marcar revisado">
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateDocStatus(doc, 'falta_documento')} className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-50 transition-colors" title="Falta documento">
                          <AlertCircle className="h-4 w-4" />
                        </button>
                        <button onClick={() => updateDocStatus(doc, 'rechazado')} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 transition-colors" title="Rechazar">
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button onClick={() => downloadDoc(doc)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" title="Descargar">
                      <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteDoc(doc)} className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowUpload(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Subir documento</h3>
            <form onSubmit={handleUpload} className="mt-4 space-y-4">
              <Select label="Cliente" value={uploadForm.client_id} onChange={(e) => setUploadForm({ ...uploadForm, client_id: e.target.value })} required>
                <option value="">Selecciona un cliente</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
              </Select>
              <Select label="Carpeta" value={uploadForm.file_type} onChange={(e) => setUploadForm({ ...uploadForm, file_type: e.target.value as DocumentType })}>
                {FOLDER_CONFIG.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </Select>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Archivo (PDF/XML/Imagen)</label>
                <input type="file" accept=".pdf,.xml,.jpg,.jpeg,.png" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100 cursor-pointer" required />
              </div>
              {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
                <Button type="submit" disabled={uploading || !uploadForm.file || !uploadForm.client_id}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Subir'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
