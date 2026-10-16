import { useState, useEffect } from 'react';
import { KeyRound, Loader2, CheckCircle2, AlertCircle, Calendar, CreditCard, ExternalLink, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Subscription } from '@/types';

const PAYMENT_URL = 'https://mpago.la/12MmoNd';
const MASTER_CODE = 'CONTABLE2026';

interface SubscriptionPageProps {
  userId: string;
  onActivated: () => void;
  disabled?: boolean;
}

export function SubscriptionPage({ userId, onActivated, disabled }: SubscriptionPageProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingSub, setLoadingSub] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('accountant_id', userId)
        .order('created_at', { ascending: false })
        .maybeSingle();
      setSubscription(data as Subscription | null);
      setLoadingSub(false);
    })();
  }, [userId]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedCode = code.trim().toUpperCase();

      if (normalizedCode !== MASTER_CODE) {
        const { data: accessCode } = await supabase
          .from('access_codes')
          .select('*')
          .eq('code', normalizedCode)
          .maybeSingle();

        if (!accessCode) throw new Error('El código ingresado no es válido.');
        if (accessCode.status === 'used') throw new Error('Este código ya fue utilizado.');
        if (accessCode.status === 'expired') throw new Error('Este código ha expirado.');

        const now = new Date();
        if (new Date(accessCode.expires_at) < now) throw new Error('Este código ha expirado.');

        await supabase
          .from('access_codes')
          .update({ status: 'used', activated_by: userId, activated_at: now.toISOString() })
          .eq('id', accessCode.id)
          .eq('status', 'active');
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 15);

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          accountant_id: userId,
          status: 'active',
          current_period_start: now.toISOString().split('T')[0],
          current_period_end: periodEnd.toISOString().split('T')[0],
          amount_clp: 25000,
        })
        .select()
        .single();

      if (subError) throw subError;
      setSubscription(subData as Subscription);
      setSuccess(true);
      setTimeout(() => onActivated(), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al activar el código');
    } finally {
      setLoading(false);
    }
  };

  if (loadingSub) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-teal-500" />
          <h2 className="text-2xl font-bold text-slate-900">Suscripción activada</h2>
          <p className="mt-2 text-slate-600">Tu acceso mensual está activo. Redirigiendo...</p>
          <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin text-teal-500" />
        </div>
      </div>
    );
  }

  const isActive = !disabled && subscription?.status === 'active' && new Date(subscription.current_period_end) >= new Date();

  if (isActive && subscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50/30 py-12 px-4">
        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader title="Suscripción activa" description="Tu suscripción está vigente" />
            <div className="p-5">
              <div className="flex items-center justify-between rounded-lg bg-teal-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  <span className="text-sm font-medium text-teal-800">Acceso activo</span>
                </div>
                <Badge color="green">Vigente</Badge>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400">Inicio del período</p>
                  <p className="mt-0.5 font-medium text-slate-700">
                    {new Date(subscription.current_period_start).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Término del período</p>
                  <p className="mt-0.5 font-medium text-slate-700">
                    {new Date(subscription.current_period_end).toLocaleDateString('es-CL')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400">Monto</p>
                  <p className="mt-0.5 font-medium text-slate-700">$25.000 CLP/mes</p>
                </div>
              </div>
              <Button className="mt-5 w-full" onClick={onActivated}>
                Ir a mi panel
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50/30 py-12 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 shadow-lg shadow-teal-500/20">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {disabled ? 'Cuenta inhabilitada' : 'Activar suscripción'}
          </h1>
          <p className="mt-1 text-slate-500">
            {disabled
              ? 'Tu cuenta ha sido inhabilitada por el administrador'
              : 'Activa tu cuenta de Contador para acceder al panel'}
          </p>
        </div>

        {disabled && (
          <div className="mx-auto mb-5 max-w-lg">
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
              <Lock className="h-5 w-5 mt-0.5 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">Tu suscripción ha vencido</p>
                <p className="mt-0.5 text-sm text-red-600">
                  Tu cuenta ha sido inhabilitada. Por favor regulariza tu pago para volver a acceder.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment button */}
        <Card className="mb-5">
          <div className="p-5">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
                <CreditCard className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Pagar Suscripción de Contador</h3>
              <p className="mt-1 text-sm text-slate-500">$25.000 CLP/mes — Pago seguro vía Mercado Pago</p>
              <a href={PAYMENT_URL} target="_blank" rel="noopener noreferrer" className="mt-4 w-full">
                <Button size="lg" className="w-full">
                  <CreditCard className="h-5 w-5" />
                  Pagar $25.000 CLP/mes
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
              <p className="mt-3 text-xs text-slate-400">
                Al completar el pago recibirás tu código de activación mensual
              </p>
            </div>
          </div>
        </Card>

        {/* Code activation */}
        <Card>
          <CardHeader title="Código de Activación Mensual" description="Ingresa el código que recibiste al pagar" />
          <div className="p-5">
            <form onSubmit={handleActivate} className="space-y-4">
              <Input
                label="Código de activación"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CONTABLE2026"
                className="font-mono uppercase"
                required
              />

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Activar acceso
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
              <h4 className="text-sm font-semibold text-slate-700">¿Cómo funciona?</h4>
              <ol className="mt-2 space-y-1.5 text-sm text-slate-500">
                <li className="flex gap-2"><span className="font-medium text-slate-600">1.</span> Paga $25.000 CLP con el botón de arriba</li>
                <li className="flex gap-2"><span className="font-medium text-slate-600">2.</span> Recibe tu código de activación por correo</li>
                <li className="flex gap-2"><span className="font-medium text-slate-600">3.</span> Ingrésalo aquí para activar tu acceso por 15 días</li>
              </ol>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>Vigencia: 15 días desde la activación</span>
              <span className="mx-1">·</span>
              <CreditCard className="h-3.5 w-3.5" />
              <span>$25.000 CLP/mes</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
