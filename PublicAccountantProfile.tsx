import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, MapPin, Star, ArrowLeft, Mail, Phone, CheckCircle2, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Profile, AccountantPublicProfile } from '@/types';

interface PublicProfileData {
  profile: Profile;
  publicProfile: AccountantPublicProfile;
}

export function PublicAccountantProfile() {
  const { accountantId } = useParams<{ accountantId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accountantId) return;
    (async () => {
      const [profileRes, publicRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', accountantId).maybeSingle(),
        supabase.from('accountant_public_profiles').select('*').eq('accountant_id', accountantId).maybeSingle(),
      ]);
      const profile = profileRes.data as Profile | null;
      const publicProfile = publicRes.data as AccountantPublicProfile | null;
      if (profile && publicProfile && publicProfile.is_published) {
        setData({ profile, publicProfile });
      }
      setLoading(false);
    })();
  }, [accountantId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md p-8 text-center">
          <EmptyState icon={<Calculator className="h-6 w-6" />} title="Perfil no disponible" description="Este contador no tiene un perfil público publicado" />
        </Card>
      </div>
    );
  }

  const { profile, publicProfile } = data;
  const rating = publicProfile.rating || 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">ContaChile</span>
          </div>
          <button onClick={() => navigate('/')} className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            Iniciar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Profile header card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-6 py-8">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Calculator className="h-10 w-10 text-white" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-white">{profile.full_name}</h1>
                <p className="mt-1 text-teal-100">Contador Auditor · ContaChile</p>
                {publicProfile.city && (
                  <div className="mt-2 flex items-center justify-center gap-1.5 text-teal-100 sm:justify-start">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{publicProfile.city}</span>
                  </div>
                )}
              </div>
              <div className="sm:ml-auto">
                <div className="flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1.5 backdrop-blur-sm">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < fullStars ? 'fill-yellow-300 text-yellow-300' : i === fullStars && hasHalf ? 'fill-yellow-300/50 text-yellow-300' : 'text-white/40'}`}
                    />
                  ))}
                  <span className="ml-1 text-sm font-medium text-white">{rating.toFixed(1)}</span>
                  <span className="text-xs text-teal-100">({publicProfile.review_count})</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {publicProfile.bio && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900">Acerca de</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{publicProfile.bio}</p>
              </div>
            )}

            {publicProfile.specialties.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900">Especialidades</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {publicProfile.specialties.map((s) => (
                    <Badge key={s} color="teal">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {publicProfile.services.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900">Servicios ofrecidos</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {publicProfile.services.map((s) => (
                    <div key={s} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal-600" />
                      <span className="text-sm text-slate-700">{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact CTA */}
            <div className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-teal-900">¿Necesitas un contador?</h3>
                <p className="mt-0.5 text-sm text-teal-700">Contáctalo directamente y comienza a trabajar juntos</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <a href={`mailto:${profile.email}`}>
                  <Button variant="primary" size="md">
                    <Mail className="h-4 w-4" />
                    Contactar
                  </Button>
                </a>
                {profile.phone && (
                  <a href={`tel:${profile.phone}`}>
                    <Button variant="outline" size="md">
                      <Phone className="h-4 w-4" />
                      Llamar
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
