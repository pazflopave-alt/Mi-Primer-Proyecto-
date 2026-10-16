import { Download, X, Share, Plus, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Modal } from '@/components/ui/Modal';

export function InstallBanner() {
  const { canInstall, installed, promptInstall, showIOSHint } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (installed || dismissed) return null;

  if (canInstall) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm text-teal-800">
          <Download className="h-4 w-4 flex-shrink-0" />
          <span className="font-medium">Instalar App</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={promptInstall}
            className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-700"
          >
            Instalar
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-md p-1 text-teal-400 hover:bg-teal-100 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (showIOSHint) {
    return (
      <>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-teal-800">
            <Smartphone className="h-4 w-4 flex-shrink-0" />
            <span className="font-medium">Instalar App en iPhone</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIOSModal(true)}
              className="rounded-md bg-teal-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-teal-700"
            >
              Cómo instalar
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="rounded-md p-1 text-teal-400 hover:bg-teal-100 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <Modal open={showIOSModal} onClose={() => setShowIOSModal(false)} title="Instalar en iPhone/iPad">
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg bg-teal-50 p-4">
              <Smartphone className="h-5 w-5 mt-0.5 flex-shrink-0 text-teal-600" />
              <div className="text-sm text-slate-700">
                Para instalar ContaChile en tu dispositivo iOS:
              </div>
            </div>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">1</span>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  Toca el boton
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    <Share className="h-3.5 w-3.5" />
                    Compartir
                  </span>
                  en Safari
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">2</span>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  Selecciona
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    <Plus className="h-3.5 w-3.5" />
                    Agregar a inicio
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">3</span>
                <span className="text-sm text-slate-700">Confirma y la app aparecera en tu pantalla de inicio</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Entendido
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return null;
}
