import { useState, useEffect, useCallback } from 'react';
import { Shield, Loader2, Power, Users, Mail, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Profile, Subscription } from '@/types';

interface AdminPanelProps {
  userId: string;
}

interface AccountantWithSub extends Profile {
  subscription?: Subscription | null;
}

export function AdminPanel({ userId }: AdminPanelProps) {
  const [accountants, setAccountants] = useState<AccountantWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'contador')
      .order('created_at', { ascending: false });

    const accountantList = (profiles || []) as Profile[];

    const subsPromises = accountantList.map((acc) =>
      supabase
        .from('subscriptions')
        .select('*')
        .eq('accountant_id', acc.id)
        .order('created_at', { ascending: false })
        .maybeSingle()
    );

    const subsResults = await Promise.all(subsPromises);

    const combined: AccountantWithSub[] = accountantList.map((acc, i) => ({
      ...acc,
      subscription: (subsResults[i].data as Subscription) || null,
    }));

    setAccountants(combined);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleActive = async (accountant: AccountantWithSub) => {
    setTogglingId(accountant.id);
    const newValue = !accountant.is_active;
    await supabase.from('profiles').update({ is_active: newValue }).eq('id', accountant.id);
    setAccountants((prev) =>
      prev.map((a) => (a.id === accountant.id ? { ...a, is_active: newValue } : a))
    );
    setTogglingId(null);
  };

  const tabs = [
    { id: 'accountants', label: 'Contadores', icon: <Users className="h-4 w-4" /> },
  ];

  const getSubStatus = (acc: AccountantWithSub) => {
    if (!acc.is_active) return { label: 'Inhabilitada', color: 'red' as const };
    const sub = acc.subscription;
    if (sub?.status === 'active' && new Date(sub.current_period_end) >= new Date()) {
      return { label: 'Activa', color: 'green' as const };
    }
    return { label: 'Pendiente de pago', color: 'amber' as const };
  };

  return (
    <DashboardLayout activeTab="accountants" onTabChange={() => {}} tabs={tabs}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Panel de Administración</h1>
          <p className="mt-1 text-sm text-slate-500">
            Gestiona las cuentas de los contadores registrados en ContaChile
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total contadores</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{accountants.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
                <Users className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Cuentas activas</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {accountants.filter((a) => getSubStatus(a).label === 'Activa').length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-5 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Inhabilitadas</p>
                <p className="mt-1 text-2xl font-bold text-red-500">
                  {accountants.filter((a) => !a.is_active).length}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                <Power className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Contadores registrados" description={`${accountants.length} cuenta(s)`} />
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
          ) : accountants.length === 0 ? (
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No hay contadores registrados"
              description="Cuando los contadores creen sus cuentas aparecerán aquí"
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {accountants.map((acc) => {
                const status = getSubStatus(acc);
                return (
                  <div key={acc.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                        acc.is_active ? 'bg-teal-50' : 'bg-slate-100'
                      }`}>
                        <Users className={`h-5 w-5 ${acc.is_active ? 'text-teal-600' : 'text-slate-400'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{acc.full_name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{acc.email}</span>
                        </div>
                        {acc.subscription && (
                          <p className="mt-0.5 text-xs text-slate-400">
                            Vence: {new Date(acc.subscription.current_period_end).toLocaleDateString('es-CL')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge color={status.color}>{status.label}</Badge>
                      <Button
                        size="sm"
                        variant={acc.is_active ? 'danger' : 'primary'}
                        onClick={() => toggleActive(acc)}
                        disabled={togglingId === acc.id}
                      >
                        {togglingId === acc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Power className="h-3.5 w-3.5" />
                            {acc.is_active ? 'Inhabilitar' : 'Habilitar'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">
            Al inhabilitar un contador, se le bloqueará el acceso inmediatamente. Deberá regularizar su pago
            y contactarte para que vuelvas a habilitar su cuenta.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
