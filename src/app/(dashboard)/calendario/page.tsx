'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface EventoCalendario {
  id: number;
  periodo: string;
  evento: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string;
  descripcion: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TIPO_OPTIONS = ['Acad\u00e9mico', 'Administrativo', 'Evaluaci\u00f3n', 'Vacaciones', 'Festivo'];

const TIPO_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'Acad\u00e9mico': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
  'Administrativo': { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500' },
  'Evaluaci\u00f3n': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  'Vacaciones': { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'Festivo': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
};

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const EMPTY_FORM = {
  periodo: '',
  evento: '',
  fecha_inicio: '',
  fecha_fin: '',
  tipo: '',
  descripcion: '',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function CalendarioPage() {
  const [data, setData] = useState<EventoCalendario[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [periodosList, setPeriodosList] = useState<string[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- fetch ---- */
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (filterPeriodo) params.set('periodo', filterPeriodo);
      if (filterTipo) params.set('tipo', filterTipo);

      const res = await fetch(`/api/calendario?${params}`);
      if (!res.ok) throw new Error('Error al cargar calendario');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page, limit: 100, total: 0, totalPages: 0 });

      const uniquePeriodos = Array.from(new Set((json.data ?? []).map((r: EventoCalendario) => r.periodo).filter(Boolean))) as string[];
      setPeriodosList((prev) => {
        const merged = Array.from(new Set([...prev, ...uniquePeriodos]));
        merged.sort();
        return merged;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [filterPeriodo, filterTipo]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  /* ---- create / edit ---- */
  function openAdd() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(item: EventoCalendario) {
    setEditingId(item.id);
    setFormData({
      periodo: item.periodo || '',
      evento: item.evento || '',
      fecha_inicio: item.fecha_inicio || '',
      fecha_fin: item.fecha_fin || '',
      tipo: item.tipo || '',
      descripcion: item.descripcion || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;
      const res = await fetch('/api/calendario', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar evento');
      setShowModal(false);
      fetchData(pagination.page);
    } catch {
      setError('Error al guardar evento');
    } finally {
      setSaving(false);
    }
  }

  /* ---- delete ---- */
  async function handleDelete() {
    if (deleteId === null) return;
    try {
      const res = await fetch(`/api/calendario?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchData(pagination.page);
    } catch {
      setError('Error al eliminar evento');
    }
    setDeleteId(null);
  }

  /* ---- group by month ---- */
  function groupByMonth(events: EventoCalendario[]) {
    const sorted = [...events].sort((a, b) => {
      const da = a.fecha_inicio || '';
      const db = b.fecha_inicio || '';
      return da.localeCompare(db);
    });

    const groups: { month: string; year: number; events: EventoCalendario[] }[] = [];

    sorted.forEach((ev) => {
      if (!ev.fecha_inicio) {
        const last = groups[groups.length - 1];
        if (last) {
          last.events.push(ev);
        } else {
          groups.push({ month: 'Sin fecha', year: 0, events: [ev] });
        }
        return;
      }
      const d = new Date(ev.fecha_inicio + 'T00:00:00');
      const monthIdx = d.getMonth();
      const year = d.getFullYear();
      const monthName = MONTH_NAMES[monthIdx];
      const key = `${year}-${monthIdx}`;

      let group = groups.find((g) => `${g.year}-${MONTH_NAMES.indexOf(g.month)}` === key);
      if (!group) {
        group = { month: monthName, year, events: [] };
        groups.push(group);
      }
      group.events.push(ev);
    });

    return groups;
  }

  function formatDate(d: string) {
    if (!d) return '-';
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }

  function getColorConfig(tipo: string) {
    return TIPO_COLORS[tipo] || { bg: 'bg-white', text: 'text-zinc-700', border: 'border-zinc-200', dot: 'bg-gray-400' };
  }

  const monthGroups = groupByMonth(data);

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{"Calendario Acad\u00e9mico"}</h1>
          <p className="text-sm text-zinc-600 mt-1">{"Eventos y fechas importantes del per\u00edodo acad\u00e9mico"}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Evento
        </button>
      </div>

      {/* Legend + Filters */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          {TIPO_OPTIONS.map((tipo) => {
            const c = getColorConfig(tipo);
            return (
              <div key={tipo} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${c.dot}`} />
                <span className="text-xs font-medium text-zinc-600">{tipo}</span>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">{"Per\u00edodo"}</label>
            <select value={filterPeriodo} onChange={(e) => setFilterPeriodo(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos</option>
              {periodosList.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo</label>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos</option>
              {TIPO_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <button onClick={() => { setFilterPeriodo(''); setFilterTipo(''); }} className="px-3 py-2 text-sm text-zinc-600 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg transition-colors">
            Limpiar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Timeline Content */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, gi) => (
            <div key={gi} className="animate-pulse">
              <div className="h-6 bg-zinc-200 rounded w-48 mb-4" />
              {Array.from({ length: 4 }).map((__, i) => (
                <div key={i} className="ml-6 mb-3 flex gap-3 items-start">
                  <div className="w-3 h-3 bg-zinc-200 rounded-full mt-1" />
                  <div className="flex-1">
                    <div className="h-4 bg-zinc-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-zinc-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-zinc-400">
          <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <p className="text-lg font-medium">No se encontraron eventos</p>
          <p className="text-sm mt-1">Cree un nuevo evento o ajuste los filtros</p>
        </div>
      ) : (
        <div className="space-y-8">
          {monthGroups.map((group) => (
            <div key={`${group.month}-${group.year}`}>
              {/* Month Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-[#1e3a5f] rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#1e3a5f]">{group.month} {group.year || ''}</h2>
                  <p className="text-xs text-zinc-600">{group.events.length} evento{group.events.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Timeline Events */}
              <div className="ml-4 border-l-2 border-zinc-200 pl-6 space-y-3">
                {group.events.map((ev) => {
                  const c = getColorConfig(ev.tipo);
                  return (
                    <div key={ev.id} className={`relative p-4 rounded-lg border ${c.border} ${c.bg} group`}>
                      {/* Timeline dot */}
                      <div className={`absolute -left-[33px] top-5 w-3 h-3 rounded-full ${c.dot} ring-4 ring-white`} />

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${c.bg} ${c.text} border ${c.border}`}>
                              {ev.tipo}
                            </span>
                            {ev.periodo && (
                              <span className="text-xs text-zinc-600 font-mono">{ev.periodo}</span>
                            )}
                          </div>
                          <h3 className={`font-semibold text-sm ${c.text}`}>{ev.evento}</h3>
                          {ev.descripcion && (
                            <p className="text-xs text-zinc-600 mt-1">{ev.descripcion}</p>
                          )}
                          <div className="flex items-center gap-1 mt-2 text-xs text-zinc-600">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                            </svg>
                            <span>{formatDate(ev.fecha_inicio)}</span>
                            {ev.fecha_fin && ev.fecha_fin !== ev.fecha_inicio && (
                              <>
                                <span className="mx-1">-</span>
                                <span>{formatDate(ev.fecha_fin)}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => openEdit(ev)} className="p-1.5 text-zinc-400 hover:text-[#2563eb] hover:bg-white/80 rounded-lg transition-colors" title="Editar">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteId(ev.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-white/80 rounded-lg transition-colors" title="Eliminar">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <p className="text-sm text-zinc-600">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => fetchData(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1.5 text-sm ring-1 ring-zinc-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Anterior
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
              const p = start + i;
              if (p > pagination.totalPages) return null;
              return (
                <button key={p} onClick={() => fetchData(p)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${p === pagination.page ? 'bg-[#1e3a5f] text-white' : 'ring-1 ring-zinc-200 hover:bg-white'}`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => fetchData(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1.5 text-sm ring-1 ring-zinc-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">
                {editingId ? 'Editar Evento' : 'Nuevo Evento'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Evento <span className="text-red-500">*</span></label>
                <input type="text" value={formData.evento} onChange={(e) => setFormData({ ...formData, evento: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{"Per\u00edodo"} <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.periodo} onChange={(e) => setFormData({ ...formData, periodo: e.target.value })} required placeholder="2025-1" className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                  <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Seleccionar...</option>
                    {TIPO_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha Inicio <span className="text-red-500">*</span></label>
                  <input type="date" value={formData.fecha_inicio} onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha Fin</label>
                  <input type="date" value={formData.fecha_fin} onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{"Descripci\u00f3n"}</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows={3} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#2a4d7a] disabled:opacity-60 transition-colors">
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm m-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-950">Eliminar Evento</h3>
                <p className="text-sm text-zinc-600">{"Esta acci\u00f3n no se puede deshacer"}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white ring-1 ring-zinc-200 rounded-lg hover:bg-white">
                Cancelar
              </button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
