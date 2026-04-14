'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Documento {
  id: number;
  titulo: string;
  tipo: string;
  descripcion: string;
  archivo: string;
  fecha: string;
  estado: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TIPO_OPTIONS = ['Resoluci\u00f3n', 'Acta', 'Circular', 'Informe', 'Otro'];
const ESTADO_OPTIONS = ['activo', 'archivado', 'borrador'];

const TIPO_COLORS: Record<string, string> = {
  'Resoluci\u00f3n': 'bg-blue-100 text-blue-800 border-blue-200',
  'Acta': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Circular': 'bg-violet-100 text-violet-800 border-violet-200',
  'Informe': 'bg-amber-100 text-amber-800 border-amber-200',
  'Otro': 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

const TIPO_ICONS: Record<string, string> = {
  'Resoluci\u00f3n': 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z',
  'Acta': 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  'Circular': 'M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z',
  'Informe': 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  'Otro': 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
};

const EMPTY_FORM = {
  titulo: '',
  tipo: '',
  descripcion: '',
  archivo: '',
  fecha: '',
  estado: 'activo',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function DocumentosPage() {
  const [data, setData] = useState<Documento[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterTipo) params.set('tipo', filterTipo);
      if (filterEstado) params.set('estado', filterEstado);

      const res = await fetch(`/api/documentos?${params}`);
      if (!res.ok) throw new Error('Error al cargar documentos');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page, limit: 20, total: 0, totalPages: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [search, filterTipo, filterEstado]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  /* ---- create / edit ---- */
  function openAdd() {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(item: Documento) {
    setEditingId(item.id);
    setFormData({
      titulo: item.titulo || '',
      tipo: item.tipo || '',
      descripcion: item.descripcion || '',
      archivo: item.archivo || '',
      fecha: item.fecha || '',
      estado: item.estado || 'activo',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;
      const res = await fetch('/api/documentos', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar documento');
      setShowModal(false);
      fetchData(pagination.page);
    } catch {
      setError('Error al guardar documento');
    } finally {
      setSaving(false);
    }
  }

  /* ---- delete ---- */
  async function handleDelete() {
    if (deleteId === null) return;
    try {
      const res = await fetch(`/api/documentos?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchData(pagination.page);
    } catch {
      setError('Error al eliminar documento');
    }
    setDeleteId(null);
  }

  /* ---- stats ---- */
  const totalDocs = pagination.total;
  const tipoBreakdown = TIPO_OPTIONS.reduce<Record<string, number>>((acc, t) => {
    acc[t] = data.filter((d) => d.tipo === t).length;
    return acc;
  }, {});

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Documentos</h1>
          <p className="text-sm text-zinc-600 mt-1">{"Gesti\u00f3n de documentos institucionales"}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-unisinu-600 hover:bg-unisinu-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Documento
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 col-span-2 sm:col-span-1 flex items-center gap-3">
          <div className="shrink-0 p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">Total</p>
            <p className="text-xl font-bold text-[#1e3a5f]">{totalDocs}</p>
          </div>
        </div>
        {TIPO_OPTIONS.map((tipo) => (
          <div key={tipo} className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 flex items-center gap-3">
            <div className={`shrink-0 p-2 rounded-lg ${TIPO_COLORS[tipo]?.split(' ').slice(0, 1).join(' ')} bg-opacity-50`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={TIPO_ICONS[tipo] || TIPO_ICONS['Otro']} />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-600 truncate">{tipo}</p>
              <p className="text-lg font-bold text-[#1e3a5f]">{tipoBreakdown[tipo] || 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Buscar</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={"T\u00edtulo, descripci\u00f3n..."}
                className="w-full pl-10 pr-4 py-2 text-sm ring-1 ring-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-unisinu-600"
              />
            </div>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Tipo</label>
            <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600">
              <option value="">Todos</option>
              {TIPO_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Estado</label>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600">
              <option value="">Todos</option>
              {ESTADO_OPTIONS.map((e) => (<option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>))}
            </select>
          </div>
          <button onClick={() => { setSearch(''); setFilterTipo(''); setFilterEstado(''); }} className="px-3 py-2 text-sm text-zinc-600 hover:text-unisinu-700 hover:bg-zinc-100 rounded-lg transition-colors">
            Limpiar
          </button>
          {/* View toggle */}
          <div className="flex items-center ring-1 ring-zinc-200 rounded-lg overflow-hidden ml-auto">
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-[#1e3a5f] text-white' : 'text-zinc-600 hover:bg-zinc-100'} transition-colors`} title={"Vista cuadr\u00edcula"}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 ${viewMode === 'list' ? 'bg-[#1e3a5f] text-white' : 'text-zinc-600 hover:bg-zinc-100'} transition-colors`} title="Vista lista">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
              </svg>
            </button>
          </div>
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
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-5 animate-pulse">
              <div className="h-4 bg-zinc-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-zinc-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-zinc-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-zinc-400">
          <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p className="text-lg font-medium">No se encontraron documentos</p>
          <p className="text-sm mt-1">Cree un nuevo documento o ajuste los filtros</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ---- Grid View ---- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((doc) => (
            <div key={doc.id} className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg border ${TIPO_COLORS[doc.tipo] || TIPO_COLORS['Otro']}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={TIPO_ICONS[doc.tipo] || TIPO_ICONS['Otro']} />
                  </svg>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(doc)} className="p-1.5 text-zinc-400 hover:text-[#2563eb] hover:bg-unisinu-50 rounded-lg transition-colors" title="Editar">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                    </svg>
                  </button>
                  <button onClick={() => setDeleteId(doc.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-[#1e3a5f] text-sm mb-1 line-clamp-2">{doc.titulo}</h3>
              <p className="text-xs text-zinc-600 mb-3 line-clamp-2">{doc.descripcion || 'Sin descripci\u00f3n'}</p>
              <div className="flex items-center justify-between text-xs">
                <span className={`inline-flex px-2 py-0.5 rounded-full border ${TIPO_COLORS[doc.tipo] || TIPO_COLORS['Otro']}`}>{doc.tipo}</span>
                <span className="text-zinc-400">{doc.fecha || '-'}</span>
              </div>
              {doc.archivo && (
                <div className="mt-3 pt-3 border-t border-zinc-200">
                  <span className="text-xs text-[#2563eb] hover:underline cursor-pointer flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                    </svg>
                    {doc.archivo}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* ---- List View ---- */
        <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="min-w-[60px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">ID</th>
                  <th className="min-w-[200px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">{"T\u00edtulo"}</th>
                  <th className="min-w-[110px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Tipo</th>
                  <th className="min-w-[200px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">{"Descripci\u00f3n"}</th>
                  <th className="min-w-[100px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Fecha</th>
                  <th className="min-w-[90px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Estado</th>
                  <th className="min-w-[80px] px-6 py-3 text-center text-xs font-semibold text-zinc-950 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3"><span className="text-sm text-zinc-600">{doc.id}</span></td>
                    <td className="px-6 py-3"><span className="text-sm font-medium text-zinc-950 truncate block">{doc.titulo}</span></td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${TIPO_COLORS[doc.tipo] || TIPO_COLORS['Otro']}`}>
                        {doc.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-3"><span className="text-sm text-zinc-600 truncate block max-w-[200px]">{doc.descripcion || '-'}</span></td>
                    <td className="px-6 py-3"><span className="text-sm whitespace-nowrap text-zinc-700">{doc.fecha || '-'}</span></td>
                    <td className="px-6 py-3"><span className="text-sm capitalize text-zinc-700">{doc.estado || '-'}</span></td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(doc)} className="p-1.5 text-zinc-400 hover:text-[#2563eb] hover:bg-unisinu-50 rounded-lg transition-colors" title="Editar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteId(doc.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {editingId ? 'Editar Documento' : 'Nuevo Documento'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{"T\u00edtulo"} <span className="text-red-500">*</span></label>
                <input type="text" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                  <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600">
                    <option value="">Seleccionar...</option>
                    {TIPO_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Estado</label>
                  <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600">
                    {ESTADO_OPTIONS.map((e) => (<option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">{"Descripci\u00f3n"}</label>
                <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} rows={3} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Archivo (URL/nombre)</label>
                  <input type="text" value={formData.archivo} onChange={(e) => setFormData({ ...formData, archivo: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Fecha</label>
                  <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-unisinu-600" />
                </div>
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
                <h3 className="text-lg font-bold text-zinc-950">Eliminar Documento</h3>
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
