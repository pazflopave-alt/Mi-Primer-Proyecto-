import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X, CheckCircle2, Loader2, AlertCircle, FolderOpen } from 'lucide-react';
import { supabase, DOCUMENTS_BUCKET } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import type { Client, DocumentType } from '@/types';

interface MassUploadProps {
  clients: Client[];
  userId: string;
  onUploaded?: () => void;
}

interface PendingFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  detectedType: DocumentType;
  detectedMonth: string;
  client_id: string;
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const detectType = (fileName: string): DocumentType => {
  const lower = fileName.toLowerCase();
  if (lower.includes('factura') || lower.includes('xml')) return 'factura';
  if (lower.includes('boleta')) return 'boleta';
  if (lower.includes('remuneracion') || lower.includes('liquidacion') || lower.includes('sueldo')) return 'remuneraciones';
  if (lower.includes('cartola') || lower.includes('banco') || lower.includes('bancaria')) return 'cartola_bancaria';
  if (lower.includes('contrato')) return 'contratos';
  if (lower.includes('tributario') || lower.includes('sii') || lower.includes('f29')) return 'documentos_tributarios';
  return 'otro';
};

const detectMonth = (fileName: string): string => {
  const now = new Date();
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const lower = fileName.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (lower.includes(monthNames[i])) {
      return `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}-01`;
    }
  }
  const monthMatch = lower.match(/(\d{4})[-_](\d{1,2})/);
  if (monthMatch) {
    return `${monthMatch[1]}-${monthMatch[2].padStart(2, '0')}-01`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const TYPE_LABELS: Record<DocumentType, string> = {
  factura: 'Factura',
  cartola_bancaria: 'Cartola Bancaria',
  boleta: 'Boleta',
  remuneraciones: 'Remuneraciones',
  documentos_tributarios: 'Doc. Tributarios',
  contratos: 'Contratos',
  otro: 'Otro',
};

export function MassUpload({ clients, userId, onUploaded }: MassUploadProps) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [defaultClient, setDefaultClient] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: PendingFile[] = Array.from(fileList).map((file) => ({
      file,
      id: crypto.randomUUID(),
      status: 'pending' as const,
      detectedType: detectType(file.name),
      detectedMonth: detectMonth(file.name),
      client_id: defaultClient,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [defaultClient]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<PendingFile>) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const uploadAll = async () => {
    if (!defaultClient) {
      alert('Selecciona un cliente antes de subir los archivos.');
      return;
    }
    setUploading(true);
    let successCount = 0;

    for (const pending of files) {
      if (pending.status === 'done') continue;
      updateFile(pending.id, { status: 'uploading' });

      const clientId = pending.client_id || defaultClient;
      const filePath = `${clientId}/${pending.detectedMonth}/${pending.id}-${pending.file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(filePath, pending.file);

      if (uploadError) {
        updateFile(pending.id, { status: 'error' });
        continue;
      }

      const { error: dbError } = await supabase.from('documents').insert({
        client_id: clientId,
        uploaded_by: userId,
        file_name: pending.file.name,
        file_path: filePath,
        file_type: pending.detectedType,
        status: 'pendiente',
      });

      if (dbError) {
        updateFile(pending.id, { status: 'error' });
        continue;
      }

      updateFile(pending.id, { status: 'done' });
      successCount++;
    }

    setUploading(false);
    if (successCount > 0 && onUploaded) onUploaded();
  };

  const doneCount = files.filter((f) => f.status === 'done').length;
  const errorCount = files.filter((f) => f.status === 'error').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <UploadCloud className="h-6 w-6 text-teal-600" />
          Carga Masiva de Documentos
        </h1>
        <p className="mt-1 text-sm text-slate-500">Arrastra múltiples archivos PDF, XML o imágenes. La plataforma los clasifica automáticamente.</p>
      </div>

      <div className="flex items-center gap-3">
        <Select label="Cliente destino" value={defaultClient} onChange={(e) => setDefaultClient(e.target.value)} className="max-w-xs" required>
          <option value="">Selecciona un cliente</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
        </Select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
          dragging ? 'border-teal-500 bg-teal-50/50 scale-[1.01]' : 'border-slate-300 bg-slate-50/50 hover:border-teal-400 hover:bg-teal-50/30'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xml,.png,.jpg,.jpeg,.xls,.xlsx,.csv"
          className="hidden"
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
        />
        <UploadCloud className={`mx-auto h-12 w-12 ${dragging ? 'text-teal-500' : 'text-slate-400'}`} />
        <p className="mt-3 text-sm font-medium text-slate-700">
          {dragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí o haz clic para seleccionar'}
        </p>
        <p className="mt-1 text-xs text-slate-400">PDF, XML, imágenes, Excel · Clasificación automática por mes y categoría</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <Card>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{files.length} archivo(s) — {doneCount} completado(s){errorCount > 0 && `, ${errorCount} con error`}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setFiles([])} disabled={uploading}>
                Limpiar
              </Button>
              <Button size="sm" onClick={uploadAll} disabled={uploading || !defaultClient || doneCount === files.length}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                Subir todo
              </Button>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {files.map((pending) => (
              <div key={pending.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  {pending.status === 'done' ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
                   pending.status === 'uploading' ? <Loader2 className="h-5 w-5 animate-spin text-teal-500" /> :
                   pending.status === 'error' ? <AlertCircle className="h-5 w-5 text-red-500" /> :
                   <FileText className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{pending.file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(pending.file.size)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge color="slate">{TYPE_LABELS[pending.detectedType]}</Badge>
                  <span className="text-xs text-slate-400">
                    {new Date(pending.detectedMonth).toLocaleDateString('es-CL', { month: 'short', year: 'numeric' })}
                  </span>
                  {pending.status === 'pending' && (
                    <button onClick={(e) => { e.stopPropagation(); removeFile(pending.id); }} className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
