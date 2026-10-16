import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2, Calendar, Bell, Edit2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Client, TaxEvent, TaxCategory, EventPriority } from '@/types';

interface InteractiveCalendarProps {
  clients: Client[];
  userId: string;
}

const CATEGORY_CONFIG: Record<TaxCategory, { color: string; bg: string; label: string }> = {
  f29: { color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200', label: 'F29' },
  iva: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', label: 'IVA' },
  remuneraciones: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', label: 'Remuneraciones' },
  renta: { color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', label: 'Renta' },
  entrega_documentos: { color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200', label: 'Entrega Docs' },
  otro: { color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200', label: 'Otro' },
};

const PRIORITY_CONFIG: Record<EventPriority, { color: string; label: string }> = {
  alta: { color: 'text-red-600', label: 'Alta' },
  media: { color: 'text-amber-600', label: 'Media' },
  baja: { color: 'text-slate-500', label: 'Baja' },
};

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function InteractiveCalendar({ clients, userId }: InteractiveCalendarProps) {
  const [events, setEvents] = useState<TaxEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TaxEvent | null>(null);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState({
    title: '', client_id: '', event_date: '', event_time: '', category: 'f29' as TaxCategory,
    priority: 'media' as EventPriority, notes: '', notify_pyme: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('tax_events').select('*').order('event_date', { ascending: true });
    setEvents((data as TaxEvent[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = (presetDate?: string) => {
    setEditingEvent(null);
    setForm({ title: '', client_id: '', event_date: presetDate || '', event_time: '', category: 'f29', priority: 'media', notes: '', notify_pyme: false });
    setShowAdd(true);
  };

  const openEdit = (event: TaxEvent) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      client_id: event.client_id || '',
      event_date: event.event_date,
      event_time: event.event_time || '',
      category: event.category,
      priority: event.priority,
      notes: event.notes || '',
      notify_pyme: event.notify_pyme,
    });
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      client_id: form.client_id || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      category: form.category,
      priority: form.priority,
      notes: form.notes || null,
      notify_pyme: form.notify_pyme,
      accountant_id: userId,
    };

    if (editingEvent) {
      const { error: updateError } = await supabase.from('tax_events').update(payload).eq('id', editingEvent.id);
      if (updateError) setError(updateError.message);
    } else {
      const { error: insertError } = await supabase.from('tax_events').insert(payload);
      if (insertError) setError(insertError.message);
    }

    if (!error) {
      setShowAdd(false);
      load();
    }
    setSaving(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('¿Eliminar este evento?')) return;
    await supabase.from('tax_events').delete().eq('id', id);
    load();
  };

  // Calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startWeekday = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = lastDay.getDate();

  const monthEvents = events.filter((e) => {
    const d = new Date(e.event_date);
    return d.getMonth() === viewMonth && d.getFullYear() === viewYear;
  });

  const todayStr = new Date().toDateString();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const upcomingEvents = events
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendario Tributario</h1>
          <p className="mt-1 text-sm text-slate-500">Crea y gestiona vencimientos, obligaciones y recordatorios</p>
        </div>
        <Button onClick={() => openAdd()}>
          <Plus className="h-4 w-4" />
          Nuevo evento
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{MONTHS[viewMonth]} {viewYear}</h2>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => { setViewMonth(new Date().getMonth()); setViewYear(new Date().getFullYear()); }} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100">
                  Hoy
                </button>
                <button onClick={nextMonth} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAYS_ES.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: startWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[70px] rounded-lg bg-slate-50/50" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(viewYear, viewMonth, day);
                  const dateStr = date.toDateString();
                  const isToday = dateStr === todayStr;
                  const dayEvents = monthEvents.filter((e) => new Date(e.event_date).toDateString() === dateStr);
                  return (
                    <button
                      key={day}
                      onClick={() => openAdd(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                      className={`min-h-[70px] rounded-lg border p-1.5 text-left transition-all hover:border-teal-300 hover:shadow-sm ${
                        isToday ? 'border-teal-400 bg-teal-50/50' : 'border-slate-100 bg-white'
                      }`}
                    >
                      <span className={`text-xs font-medium ${isToday ? 'text-teal-700' : 'text-slate-500'}`}>{day}</span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map((e) => {
                          const cfg = CATEGORY_CONFIG[e.category];
                          return <div key={e.id} className={`truncate rounded px-1 py-0.5 text-[10px] ${cfg.bg} ${cfg.color}`}>{e.title}</div>;
                        })}
                        {dayEvents.length > 2 && <div className="text-[10px] text-slate-400">+{dayEvents.length - 2} más</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* Upcoming events sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Próximos eventos" description={`${upcomingEvents.length} por venir`} />
            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-500" /></div>
              ) : upcomingEvents.length === 0 ? (
                <EmptyState icon={<Calendar className="h-6 w-6" />} title="No hay eventos próximos" />
              ) : (
                upcomingEvents.map((event) => {
                  const cfg = CATEGORY_CONFIG[event.category];
                  const pCfg = PRIORITY_CONFIG[event.priority];
                  const client = clients.find((c) => c.id === event.client_id);
                  return (
                    <div key={event.id} className="px-5 py-3.5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900">{event.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <Badge className={`border ${cfg.bg} ${cfg.color}`}>{cfg.label}</Badge>
                            <span className={`text-xs ${pCfg.color}`}>● {pCfg.label}</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(event.event_date).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                            {event.event_time && ` · ${event.event_time}`}
                          </p>
                          {client && <p className="text-xs text-slate-400">👤 {client.business_name}</p>}
                          {event.notify_pyme && <p className="text-xs text-teal-500 flex items-center gap-1"><Bell className="h-3 w-3" />Notificar PYME</p>}
                        </div>
                        <div className="flex flex-shrink-0 flex-col gap-1">
                          <button onClick={() => openEdit(event)} className="rounded-lg p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => deleteEvent(event.id)} className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={editingEvent ? 'Editar evento' : 'Nuevo evento'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Título" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Declarar F29 de agosto" required />
          <Select label="Cliente asociado (opcional)" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
            <option value="">Sin cliente específico</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha" type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required />
            <Input label="Hora (opcional)" type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TaxCategory })}>
              <option value="f29">F29 / IVA</option>
              <option value="iva">IVA - Libros</option>
              <option value="remuneraciones">Remuneraciones</option>
              <option value="renta">Renta</option>
              <option value="entrega_documentos">Entrega de Documentos</option>
              <option value="otro">Otro</option>
            </Select>
            <Select label="Prioridad" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as EventPriority })}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </Select>
          </div>
          <Textarea label="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="Detalles del evento..." />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.notify_pyme} onChange={(e) => setForm({ ...form, notify_pyme: e.target.checked })} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
            <span className="text-sm text-slate-700">Enviar notificación automática a la PYME asociada</span>
          </label>
          {error && <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEvent ? 'Guardar cambios' : 'Crear evento'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
