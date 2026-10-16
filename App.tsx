import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/pages/AuthPage';
import { SubscriptionPage } from '@/pages/SubscriptionPage';
import { AccountantDashboard } from '@/pages/AccountantDashboard';
import { PymeDashboard } from '@/pages/PymeDashboard';
import { AdminPanel } from '@/pages/AdminPanel';
import { PublicAccountantProfile } from '@/pages/PublicAccountantProfile';
import { EmpresaDashboard } from '@/pages/EmpresaDashboard';
import { ClienteDashboard } from '@/pages/ClienteDashboard';
import { supabase } from '@/lib/supabase';
import type { Subscription } from '@/types';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!session || !profile) {
      setSubLoading(false);
      return;
    }

    if (profile.role !== 'contador' && profile.role !== 'empresa') {
      setSubLoading(false);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('accountant_id', session.user.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      setSubscription(data as Subscription | null);
      setSubLoading(false);
    })();
  }, [session, profile, refreshKey]);

  if (loading || subLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthPage onAuthSuccess={() => setRefreshKey(k => k + 1)} />;
  }

  if (profile.role === 'admin') {
    return <AdminPanel userId={session.user.id} />;
  }

  if (profile.role === 'contador') {
    if (!profile.is_active) {
      return (
        <SubscriptionPage
          userId={session.user.id}
          onActivated={() => setRefreshKey(k => k + 1)}
          disabled
        />
      );
    }

    const isActive = subscription?.status === 'active' && new Date(subscription.current_period_end) >= new Date();
    if (!isActive) {
      return (
        <SubscriptionPage
          userId={session.user.id}
          onActivated={() => setRefreshKey(k => k + 1)}
        />
      );
    }
    return <AccountantDashboard userId={session.user.id} />;
  }

  if (profile.role === 'empresa') {
    const isActive = subscription?.status === 'active' && new Date(subscription.current_period_end) >= new Date();
    if (!isActive) {
      return (
        <SubscriptionPage
          userId={session.user.id}
          onActivated={() => setRefreshKey(k => k + 1)}
        />
      );
    }
    return <EmpresaDashboard userId={session.user.id} />;
  }

  if (profile.role === 'cliente') {
    return <ClienteDashboard userId={session.user.id} />;
  }

  return <PymeDashboard userId={session.user.id} />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/perfil/:accountantId" element={<PublicAccountantProfile />} />
        <Route path="/*" element={
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
