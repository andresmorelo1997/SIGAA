'use client';

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Parametro {
  id: number;
  clave: string;
  valor: string;
  descripcion: string;
  categoria: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORIA_OPTIONS = ['General', 'Acad\u00e9mico', 'Financiero', 'Sistema'];

const CATEGORIA_ICONS: Record<string, string> = {
  'General': 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z',
  'Acad\u00e9mico': 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
  'Financiero': 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z',
  'Sistema': 'M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z',
};

const CATEGORIA_COLORS: Record<string, string> = {
  'General': 'bg-blue-50 text-blue-600 border-blue-200',
  'Acad\u00e9mico': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  'Financiero': 'bg-amber-50 text-amber-600 border-amber-200',
  'Sistema': 'bg-violet-50 text-violet-600 border-violet-200',
};

const EMPTY_FORM = {
  clave: '',
  valor: '',
  descripcion: '',
  categoria: 'General',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ParametrosPage() {
  const [data, setData] = useState<Parametro[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [editingCell, setEditingCell] = useState<{ id: number; field: 'valor' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

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
      if (search) params.set('search', search);

      const res = await fetch(`/api/parametros?${params}`);
      if (!res.ok) throw new Error('Error al cargar par\u00e1metros');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page, limit: 100, total: 0, totalPages: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  /* ---- inline edit valor ---- */
  function startEditValor(id: number, currentValue: string) {
    setEditingCell({ id, field: 'valor' });
    setEditValue(currentValue ?? '');
    setTimeout(() => editRef.current?.focus(), 0);
  }

  async function saveEditValor() {
    if (!editingCell) return;
    const { id } = editingCell;
    try {
      const res = await fetch('/api/parametros', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, valor: editValue }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, valor: editValue } : r)));
    } catch {
      setError('Error al guardar cambio');
    }
    setEditingCell(null);
  }

  /* ---- create / edit ---- */
  function openAdd() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(item: Parametro) {
    setEditingId(item.id);
    setFormData({
      clave: item.clave || '',
      valor: item.valor || '',
      descripcion: item.descripcion || '',
      categoria: item.categoria || 'General',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;
      const res = await fetch('/api/parametros', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setShowModal(false);
      fetchData(pagination.page);
    } catch {
      setError('Error al guardar par\u00e1metro');
    } finally {
      setSaving(false);
    }
  }

  /* ---- delete ---- */
  async function handleDelete() {
    if (deleteId === null) return;
    try {
      const res = await fetch(`/api/parametros?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchData(pagination.page);
    } catch {
      setError('Error al eliminar par\u00e1metro');
    }
    setDeleteId(null);
  }

  /* ---- group by category ---- */
  function groupByCategoria(params: Parametro[]) {
    const filtered = search
      ? params.filter((p) =>
          p.clave?.toLowerCase().includes(search.toLowerCase()) ||
          p.valor?.toLowerCase().includes(search.toLowerCase()) ||
          p.descripcion?.toLowerCase().includes(search.toLowerCase())
        )
      : params;

    const groups: Record<string, Parametro[]> = {};
    CATEGORIA_OPTIONS.forEach((c) => { groups[c] = []; });

    filtered.forEach((p) => {
      const cat = CATEGORIA_OPTIONS.includes(p.categoria) ? p.categoria : 'General';
      groups[cat].push(p);
    });

    return groups;
  }

  const grouped = groupByCategoria(data);
  const totalParams = data.length;

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="p-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{"Par\u00e1metros del Sistema"}</h1>
          <p className="text-sm text-zinc-600 mt-1">{"Configuraci\u00f3n general del sistema SIGAA"}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {"Nuevo Par\u00e1metro"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="shrink-0 p-2.5 rounded-lg bg-zinc-100 text-zinc-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">Total</p>
            <p className="text-xl font-bold text-[#1e3a5f]">{totalParams}</p>
          </div>
        </div>
        {CATEGORIA_OPTIONS.map((cat) => (
          <div key={cat} className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 flex items-center gap-3">
            <div className={`shrink-0 p-2 rounded-lg ${CATEGORIA_COLORS[cat]}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORIA_ICONS[cat]} />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-600 truncate">{cat}</p>
              <p className="text-lg font-bold text-[#1e3a5f]">{grouped[cat]?.length || 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 mb-6">
        <div className="relative max-w-md">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={"Buscar por clave, valor o descripci\u00f3n..."}
            className="w-full pl-10 pr-4 py-2 text-sm ring-1 ring-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
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

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, gi) => (
            <div key={gi} className="card animate-pulse p-6">
              <div className="h-5 bg-zinc-200 rounded w-32 mb-4" />
              {Array.from({ length: 3 }).map((__, i) => (
                <div key={i} className="flex gap-4 py-3 border-b border-zinc-200">
                  <div className="h-4 bg-zinc-200 rounded w-40" />
                  <div className="h-4 bg-zinc-200 rounded w-32" />
                  <div className="h-4 bg-zinc-200 rounded w-64 flex-1" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-zinc-400">
          <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          <p className="text-lg font-medium">{"No se encontraron par\u00e1metros"}</p>
          <p className="text-sm mt-1">{"Cree un nuevo par\u00e1metro para comenzar"}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIA_OPTIONS.map((cat) => {
            const items = grouped[cat] || [];
            if (items.length === 0) return null;
            const colors = CATEGORIA_COLORS[cat];

            return (
              <div key={cat} className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm overflow-hidden">
                {/* Category Header */}
                <div className={`px-6 py-4 border-b border-zinc-200 flex items-center gap-3 ${colors.split(' ')[0]}`}>
                  <div className={`p-2 rounded-lg ${colors}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORIA_ICONS[cat]} />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#1e3a5f]">{cat}</h2>
                    <p className="text-xs text-zinc-600">{items.length} {"par\u00e1metro"}{items.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {/* Parameters List */}
                <div className="divide-y divide-gray-100">
                  {items.map((param) => (
                    <div key={param.id} className="px-6 py-4 hover:bg-white/50 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-semibold text-[#1e3a5f] bg-slate-100 px-2 py-0.5 rounded">{param.clave}</code>
                          </div>
                          {param.descripcion && (
                            <p className="text-xs text-zinc-600 mt-0.5">{param.descripcion}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Editable valor */}
                          {editingCell?.id === param.id ? (
                            <input
                              ref={editRef}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={saveEditValor}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEditValor(); if (e.key === 'Escape') setEditingCell(null); }}
                              className="w-48 px-3 py-1.5 text-sm border border-blue-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                            />
                          ) : (
                            <span
                              onClick={() => startEditValor(param.id, param.valor)}
                              className="inline-flex px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm font-mono text-gray-800 cursor-pointer hover:border-[#2563eb] hover:bg-indigo-50/50 transition-colors min-w-[120px]"
                              title="Clic para editar"
                            >
                              {param.valor || '-'}
                            </span>
                          )}
                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(param)} className="p-1.5 text-zinc-400 hover:text-[#2563eb] hover:bg-indigo-50 rounded-lg transition-colors" title="Editar completo">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                              </svg>
                            </button>
                            <button onClick={() => setDeleteId(param.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">
                {editingId ? 'Editar Par\u00e1metro' : 'Nuevo Par\u00e1metro'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Clave <span className="text-red-500">*</span></label>
                <input type="text" value={formData.clave} onChange={(e) => setFormData({ ...formData, clave: e.target.value })} required placeholder="nombre_parametro" className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Valor <span className="text-red-500">*</span></label>
                <input type="text" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{"Categor\u00eda"}</label>
                <select value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {CATEGORIA_OPTIONS.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{"Descripci\u00f3n"}</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows={2} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
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
                <h3 className="text-lg font-bold text-zinc-950">{"Eliminar Par\u00e1metro"}</h3>
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
