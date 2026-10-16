import { useState } from 'react';
import { Calculator, Shield, ArrowRight, Loader2, CheckCircle2, User, Store } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { UserRole } from '@/types';

interface AuthPageProps {
  onAuthSuccess: () => void;
}

type Mode = 'login' | 'signup';

export function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>('signup');
  const [role, setRole] = useState<UserRole>('contador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (role === 'admin') {
          setError('El rol de administrador no está disponible para registro público.');
          setLoading(false);
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        if (data.user) {
          const roleToInsert: UserRole = role;
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email,
              full_name: fullName,
              role: roleToInsert,
              phone: phone || null,
              is_active: true,
              trial_ends_at: (role === 'contador' || role === 'empresa') ? new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() : null,
            });
          if (profileError) throw profileError;

          if (role === 'contador' || role === 'empresa') {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setDate(periodEnd.getDate() + 15);
            await supabase.from('subscriptions').insert({
              accountant_id: data.user.id,
              status: 'active',
              current_period_start: now.toISOString().split('T')[0],
              current_period_end: periodEnd.toISOString().split('T')[0],
              amount_clp: 25000,
              user_type: role === 'empresa' ? 'empresa' : 'contador',
            });
          }
        }
        setSuccess(true);
        setTimeout(() => onAuthSuccess(), 1500);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onAuthSuccess();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error inesperado';
      if (msg.includes('User already registered')) {
        setError('Ya existe una cuenta con este correo. Inicia sesión.');
      } else if (msg.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'pazflopave@gmail.com',
        password: '26362636Flo',
      });
      if (signInError) throw signInError;
      onAuthSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al ingresar como administrador';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-teal-50/30 p-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-teal-500" />
          <h2 className="text-2xl font-bold text-slate-900">Cuenta creada</h2>
          <p className="mt-2 text-slate-600">Redirigiendo a tu panel...</p>
          <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin text-teal-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50/30 lg:flex-row">
      {/* Left panel — branding */}
      <div className="flex flex-col justify-between bg-slate-900 p-8 text-white lg:w-1/2 lg:p-12">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500">
            <Calculator className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">ContaChile</span>
        </div>

        <div className="my-12 lg:my-0">
          <h1 className="text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
            Gestión contable<br />para contadores y PYMEs
          </h1>
          <p className="mt-4 text-slate-300 lg:text-lg">
            Administra tus clientes, calendario tributario y documentos en un solo lugar.
            Diseñado para la realidad tributaria chilena.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Calendario tributario con F29, IVA y Remuneraciones',
              'Subida de documentos PDF/XML por parte de la PYME',
              'Control de estado contable de cada cliente',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-500/20">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-400" />
                </div>
                {feature}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500">© 2026 ContaChile — Hecho para Chile</p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === 'signup'
                ? 'Selecciona tu tipo de cuenta y comienza a usar ContaChile'
                : 'Ingresa tus credenciales para acceder'}
            </p>
          </div>

          {/* Role selector — only for signup */}
          {mode === 'signup' && (
            <div className="mb-5 space-y-3">
              <button
                type="button"
                onClick={() => setRole('contador')}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  role === 'contador'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${role === 'contador' ? 'bg-teal-100' : 'bg-slate-100'}`}>
                  <Calculator className={`h-5 w-5 ${role === 'contador' ? 'text-teal-600' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${role === 'contador' ? 'text-teal-700' : 'text-slate-700'}`}>
                    Contador
                  </span>
                  <span className="block text-xs text-slate-400">Para asesores contables e independientes.</span>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-slate-500">$25.000 / mes</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('empresa')}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  role === 'empresa'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${role === 'empresa' ? 'bg-teal-100' : 'bg-slate-100'}`}>
                  <Store className={`h-5 w-5 ${role === 'empresa' ? 'text-teal-600' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${role === 'empresa' ? 'text-teal-700' : 'text-slate-700'}`}>
                    Empresa
                  </span>
                  <span className="block text-xs text-slate-400">Para empresas o negocios que gestionan sus documentos e IVA.</span>
                </div>
                <span className="flex-shrink-0 text-right text-xs font-medium text-slate-500">
                  15 días gratis<br />$25.000 / mes
                </span>
              </button>

              <button
                type="button"
                onClick={() => setRole('cliente')}
                className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                  role === 'cliente'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${role === 'cliente' ? 'bg-teal-100' : 'bg-slate-100'}`}>
                  <User className={`h-5 w-5 ${role === 'cliente' ? 'text-teal-600' : 'text-slate-400'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`block text-sm font-semibold ${role === 'cliente' ? 'text-teal-700' : 'text-slate-700'}`}>
                    Cliente
                  </span>
                  <span className="block text-xs text-slate-400">Para clientes finales que consultan sus informes contables.</span>
                </div>
                <span className="flex-shrink-0 text-xs font-medium text-slate-500">Consulta Gratis</span>
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Input
                label="Nombre completo"
                type="text"
                name="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan Pérez"
                required
              />
            )}

            <Input
              label="Correo electrónico"
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="juan@empresa.cl"
              required
            />

            <Input
              label="Contraseña"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />

            {mode === 'signup' && (
              <Input
                label="Teléfono (opcional)"
                type="tel"
                name="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+56 9 1234 5678"
              />
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            {mode === 'signup' ? (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className="font-medium text-teal-600 hover:text-teal-700"
                >
                  Inicia sesión
                </button>
              </>
            ) : (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="font-medium text-teal-600 hover:text-teal-700"
                >
                  Regístrate gratis
                </button>
              </>
            )}
          </div>

          {mode === 'login' && (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <button
                onClick={handleAdminLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-800 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-all hover:bg-slate-800 active:bg-slate-950 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Ingresar como Administrador
                  </>
                )}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                Acceso exclusivo para el administrador de ContaChile
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
