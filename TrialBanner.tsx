import { Clock, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';

const PAYMENT_URL = 'https://mpago.la/12MmoNd';

interface TrialBannerProps {
  trialEndsAt: string | null;
  onActivate: () => void;
}

export function TrialBanner({ trialEndsAt, onActivate }: TrialBannerProps) {
  if (!trialEndsAt) return null;

  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) return null;

  const isUrgent = daysLeft <= 7;

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
      isUrgent ? 'border-amber-300 bg-amber-50' : 'border-teal-200 bg-teal-50'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
          isUrgent ? 'bg-amber-100' : 'bg-teal-100'
        }`}>
          <Clock className={`h-5 w-5 ${isUrgent ? 'text-amber-600' : 'text-teal-600'}`} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${isUrgent ? 'text-amber-900' : 'text-teal-900'}`}>
            Tienes {daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes de tu prueba gratuita
          </p>
          <p className={`text-xs ${isUrgent ? 'text-amber-700' : 'text-teal-700'}`}>
            Activa tu suscripción mensual de $25.000 CLP/mes para continuar
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-shrink-0">
        <a href={PAYMENT_URL} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant={isUrgent ? 'danger' : 'primary'}>
            <CreditCard className="h-3.5 w-3.5" />
            Pagar $25.000 CLP/mes
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
        <Button size="sm" variant="outline" onClick={onActivate}>
          Ingresar código
        </Button>
      </div>
    </div>
  );
}
