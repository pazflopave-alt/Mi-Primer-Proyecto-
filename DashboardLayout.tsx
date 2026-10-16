import { type ReactNode } from 'react';
import { Calculator, LogOut, Building2, Shield, Store, User, Smartphone, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { InstallBanner } from '@/components/InstallBanner';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon: ReactNode }[];
  trialDaysLeft?: number | null;
  subscriptionActive?: boolean;
}

export function DashboardLayout({ children, activeTab, onTabChange, tabs, trialDaysLeft, subscriptionActive }: DashboardLayoutProps) {
  const { profile, signOut } = useAuth();
  const { canInstall, installed, promptInstall, showIOSHint } = usePWAInstall();

  const roleLabel = profile?.role === 'contador' ? 'Contador'
    : profile?.role === 'admin' ? 'Admin'
    : profile?.role === 'empresa' ? 'Empresa'
    : profile?.role === 'cliente' ? 'Cliente'
    : 'PYME';

  const roleIcon = profile?.role === 'contador' ? <Calculator className="h-4.5 w-4.5 text-slate-600" />
    : profile?.role === 'admin' ? <Shield className="h-4.5 w-4.5 text-slate-600" />
    : profile?.role === 'empresa' ? <Store className="h-4.5 w-4.5 text-slate-600" />
    : profile?.role === 'cliente' ? <User className="h-4.5 w-4.5 text-slate-600" />
    : <Building2 className="h-4.5 w-4.5 text-slate-600" />;

  const showInstallButton = !installed && (canInstall || showIOSHint);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ContaChile</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Trial / Subscription indicator */}
            {trialDaysLeft !== undefined && trialDaysLeft !== null && trialDaysLeft > 0 && (
              <div className="hidden items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 sm:flex">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Prueba: {trialDaysLeft} dias</span>
              </div>
            )}
            {subscriptionActive && (
              <div className="hidden items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 sm:flex">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-medium text-green-700">Suscripcion Activa</span>
              </div>
            )}

            {/* Install button */}
            {showInstallButton && (
              <button
                onClick={showIOSHint ? undefined : promptInstall}
                className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100"
                title="Instalar aplicacion"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}

            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-700">{profile?.full_name || 'Usuario'}</p>
              <p className="text-xs text-slate-400">{roleLabel}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              {roleIcon}
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Cerrar sesion"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <div className="lg:hidden">
          <InstallBanner />
        </div>
        {/* Sidebar */}
        <aside className="lg:w-56 lg:flex-shrink-0">
          <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 lg:flex-col">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-teal-50 text-teal-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-3 hidden lg:block">
            <InstallBanner />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
