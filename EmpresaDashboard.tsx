import { useState, useEffect, useCallback } from 'react';
import { Store, UploadCloud, Calculator, Calendar, Users, BarChart3, TrendingUp, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { MassUpload } from '@/components/MassUpload';
import { IvaCalculator } from '@/components/IvaCalculator';
import { FinancialHealth } from '@/components/FinancialHealth';
import { PayrollCalculator } from '@/components/PayrollCalculator';
import { InteractiveCalendar } from '@/components/InteractiveCalendar';
import { TrialBanner } from '@/components/TrialBanner';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, Subscription, TaxEvent } from '@/types';

interface EmpresaDashboardProps {
  userId: string;
}

type Tab = 'overview' | 'documents' | 'iva' | 'payroll' | 'calendar' | 'financial';

export function EmpresaDashboard({ userId }: EmpresaDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [client, setClient] = useState<Client | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [taxEvents, setTaxEvents] = useState<TaxEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: clientData } = await supabase
      .from('clients')
      .select('*')
      .eq('empresa_user_id', userId)
      .maybeSingle();

    const clientRecord = clientData as Client | null;

    if (!clientRecord) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const profile = profileData as { full_name: string; email: string } | null;
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          accountant_id: userId,
          empresa_user_id: userId,
          business_name: profile?.full_name || 'Mi Empresa',
          rut: '',
          email: profile?.email || '',
          status: 'pendiente',
        })
        .select()
        .single();
      setClient(newClient as Client | null);
    } else {
      setClient(clientRecord);
    }

    const [subRes, eventsRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('accountant_id', userId).order('created_at', { ascending: false }).maybeSingle(),
      supabase.from('tax_events').select('*').order('event_date', { ascending: true }),
    ]);

    setSubscription(subRes.data as Subscription | null);
    setTaxEvents(eventsRes.data as TaxEvent[] || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const trialEndsAt = subscription?.current_period_end || null;
  const isActive = subscription?.status === 'active' && new Date(subscription.current_period_end) >= new Date();
  const daysLeft = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'documents', label: 'Carga Documentos', icon: <UploadCloud className="h-4 w-4" /> },
    { id: 'iva', label: 'IVA / F29', icon: <Calculator className="h-4 w-4" /> },
    { id: 'payroll', label: 'Remuneraciones', icon: <Users className="h-4 w-4" /> },
    { id: 'calendar', label: 'Vencimientos', icon: <Calendar className="h-4 w-4" /> },
    { id: 'financial', label: 'Salud Financiera', icon: <BarChart3 className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const upcomingEvents = taxEvents.filter(e => new Date(e.event_date) >= new Date()).slice(0, 5);

  return (
    <DashboardLayout
      activeTab={tab}
      onTabChange={(t) => setTab(t as Tab)}
      tabs={tabs}
      trialDaysLeft={isActive && daysLeft && daysLeft <= 15 ? daysLeft : null}
      subscriptionActive={isActive}
    >
      <div className="space-y-4">
        {tab === 'overview' && (
          <div className="space-y-6">
            <TrialBanner trialEndsAt={trialEndsAt} onActivate={() => setTab('overview')} />

            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                <Store className="h-6 w-6 text-teal-600" />
                {client?.business_name || 'Mi Empresa'}
              </h1>
              <p className="mt-1 text-sm text-slate-500">Panel de gestion empresarial</p>
            </div>

            {/* Subscription status */}
            <div className={`flex items-center gap-4 rounded-xl border p-5 ${
              isActive
                ? 'border-green-200 bg-green-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${
                isActive ? 'bg-green-100' : 'bg-amber-100'
              }`}>
                {isActive ? <CheckCircle2 className="h-6 w-6 text-green-600" /> : <Clock className="h-6 w-6 text-amber-600" />}
              </div>
              <div>
                <p className={`text-lg font-semibold ${isActive ? 'text-green-800' : 'text-amber-800'}`}>
                  {isActive && daysLeft && daysLeft <= 30
                    ? `Dias restantes de prueba gratis: ${daysLeft} dias`
                    : isActive
                      ? 'Suscripcion Activa ($25.000 CLP/mes)'
                      : 'Prueba finalizada'
                  }
                </p>
                <p className={`text-sm ${isActive ? 'text-green-600' : 'text-amber-600'}`}>
                  {isActive
                    ? 'Tu plan incluye carga de documentos, calculadora IVA, remuneraciones y calendario tributario'
                    : 'Activa tu suscripcion de $25.000 CLP/mes para continuar'}
                </p>
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Documentos</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">Carga masiva</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                    <UploadCloud className="h-5 w-5 text-teal-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">IVA proyectado</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">19%</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Calculator className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Liquidaciones</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">Activas</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                    <Users className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Vencimientos</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{upcomingEvents.length}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <Calendar className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </Card>
            </div>

            {/* Upcoming deadlines */}
            <Card>
              <CardHeader title="Proximos vencimientos tributarios" description="Calendario SII" />
              <div className="divide-y divide-slate-100">
                {upcomingEvents.length === 0 ? (
                  <EmptyState icon={<Calendar className="h-6 w-6" />} title="No hay vencimientos proximos" />
                ) : (
                  upcomingEvents.map((event) => {
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
                        <Badge color="slate" className="flex-shrink-0">{event.category}</Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === 'documents' && client && (
          <MassUpload clients={[client]} userId={userId} onUploaded={loadData} />
        )}

        {tab === 'iva' && client && (
          <IvaCalculator clients={[client]} userId={userId} />
        )}

        {tab === 'payroll' && client && (
          <PayrollCalculator clients={[client]} userId={userId} />
        )}

        {tab === 'calendar' && client && (
          <InteractiveCalendar clients={[client]} userId={userId} />
        )}

        {tab === 'financial' && client && (
          <FinancialHealth clients={[client]} userId={userId} />
        )}
      </div>
    </DashboardLayout>
  );
}
