'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';

interface EscalafonRecord {
  id: number;
  docente_id: string;
  nombre: string;
  cedula: string;
  categoria: string;
  titulo: string;
  nivel_formacion: string;
  fecha_ingreso: string;
  antiguedad: string;
  puntos: number;
  observaciones: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORIA_OPTIONS = ['Auxiliar', 'Asistente', 'Asociado', 'Titular'];
const NIVEL_OPTIONS = ['Pregrado', 'Especializacion', 'Maestria', 'Doctorado', 'Posdoctorado'];

const CATEGORIA_COLORS: Record<string, string> = {
  Auxiliar: 'bg-gray-100 text-gray-700 border-gray-200',
  Asistente: 'bg-blue-100 text-blue-700 border-blue-200',
  Asociado: 'bg-unisinu-100 text-unisinu-800 border-unisinu-200',
  Titular: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const emptyForm = {
  docente_id: '',
  nombre: '',
  cedula: '',
  categoria: '',
  titulo: '',
  nivel_formacion: '',
  fecha_ingreso: '',
  antiguedad: '',
  puntos: 0,
  observaciones: '',
};

export default function EscalafonPage() {
  const [data, setData] = useState<EscalafonRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [sortOrder, setSortOrder] = useState('DESC');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (filterCategoria) params.set('categoria', filterCategoria);
      if (filterNivel) params.set('nivel_formacion', filterNivel);
      if (search) params.set('search', search);

      const res = await fetch(`/api/escalafon?${params}`);
      if (!res.ok) throw new Error('Error al cargar escalafon');
      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [filterCategoria, filterNivel, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  function handleSort(field: string) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(item: EscalafonRecord) {
    setEditingId(item.id);
    setForm({
      docente_id: item.docente_id || '',
      nombre: item.nombre || '',
      cedula: item.cedula || '',
      categoria: item.categoria || '',
      titulo: item.titulo || '',
      nivel_formacion: item.nivel_formacion || '',
      fecha_ingreso: item.fecha_ingreso || '',
      antiguedad: item.antiguedad || '',
      puntos: item.puntos || 0,
      observaciones: item.observaciones || '',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;
      const res = await fetch('/api/escalafon', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar');
      }
      setShowModal(false);
      fetchData(pagination.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  function SortIcon({ field }: { field: string }) {
    if (sortBy !== field) {
      return (
        <svg className="w-3 h-3 text-zinc-400 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
        </svg>
      );
    }
    return sortOrder === 'ASC' ? (
      <svg className="w-3 h-3 text-unisinu-700 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-unisinu-700 ml-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
      </svg>
    );
  }

  function TableSkeleton() {
    return (
      <div className="animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-4 px-6 border-b border-zinc-200">
            <div className="h-4 bg-zinc-200 rounded w-40" />
            <div className="h-4 bg-zinc-200 rounded w-24" />
            <div className="h-4 bg-zinc-200 rounded w-20" />
            <div className="h-4 bg-zinc-200 rounded w-32" />
            <div className="h-4 bg-zinc-200 rounded w-28" />
            <div className="h-4 bg-zinc-200 rounded w-24" />
            <div className="h-4 bg-zinc-200 rounded w-16" />
            <div className="h-4 bg-zinc-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Escalafon Docente</h1>
          <p className="text-sm text-zinc-600 mt-2">Clasificacion y ranking del cuerpo docente</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-unisinu-600 hover:bg-unisinu-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Registro
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-600 mb-2">Buscar</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nombre, cedula o titulo..."
                className="w-full pl-10 pr-4 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
              />
            </div>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-zinc-600 mb-2">Categoria</label>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
            >
              <option value="">Todas</option>
              {CATEGORIA_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-zinc-600 mb-2">Nivel Formacion</label>
            <select
              value={filterNivel}
              onChange={(e) => setFilterNivel(e.target.value)}
              className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
            >
              <option value="">Todos</option>
              {NIVEL_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { setFilterCategoria(''); setFilterNivel(''); setSearch(''); }}
            className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374H2.697c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                  <button onClick={() => handleSort('nombre')} className="inline-flex items-center hover:text-unisinu-700 transition-colors">
                    Nombre <SortIcon field="nombre" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">Cedula</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                  <button onClick={() => handleSort('categoria')} className="inline-flex items-center hover:text-unisinu-700 transition-colors">
                    Categoria <SortIcon field="categoria" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">Titulo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">Nivel Formacion</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">Fecha Ingreso</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                  <button onClick={() => handleSort('antiguedad')} className="inline-flex items-center hover:text-unisinu-700 transition-colors">
                    Antiguedad <SortIcon field="antiguedad" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">
                  <button onClick={() => handleSort('puntos')} className="inline-flex items-center hover:text-unisinu-700 transition-colors">
                    Puntos <SortIcon field="puntos" />
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900 uppercase tracking-wide">Observaciones</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-zinc-900 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-0"><TableSkeleton /></td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                      </div>
                      <p className="text-zinc-700 font-medium">No se encontraron registros</p>
                      <p className="text-zinc-500 text-sm">Agrega un nuevo registro al escalafon</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-zinc-950">{item.nombre}</td>
                    <td className="px-6 py-3 font-mono text-xs text-zinc-600">{item.cedula}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${CATEGORIA_COLORS[item.categoria] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                        {item.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-3 max-w-[160px] text-truncate text-zinc-700">{item.titulo || '-'}</td>
                    <td className="px-6 py-3 text-zinc-700">{item.nivel_formacion || '-'}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-zinc-700">{item.fecha_ingreso || '-'}</td>
                    <td className="px-6 py-3 text-zinc-700">{item.antiguedad || '-'}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center justify-center min-w-[40px] px-2.5 py-1 bg-unisinu-100 text-unisinu-800 text-xs font-bold rounded-full">
                        {item.puntos ?? 0}
                      </span>
                    </td>
                    <td className="px-6 py-3 max-w-[140px] text-truncate text-zinc-500">{item.observaciones || '-'}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 text-zinc-400 hover:text-unisinu-700 hover:bg-unisinu-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200">
            <p className="text-sm text-zinc-600">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm bg-white ring-1 ring-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(pagination.page - 2, pagination.totalPages - 4));
                const p = start + i;
                if (p > pagination.totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => fetchData(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      p === pagination.page
                        ? 'bg-unisinu-600 text-white'
                        : 'bg-white ring-1 ring-zinc-200 hover:bg-zinc-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm bg-white ring-1 ring-zinc-200 rounded-lg hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ring-1 ring-zinc-950/5">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-zinc-950">
                {editingId ? 'Editar Registro' : 'Nuevo Registro'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    required
                    className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Cedula</label>
                  <input
                    type="text"
                    value={form.cedula}
                    onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                    required
                    className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">ID Docente</label>
                <input
                  type="text"
                  value={form.docente_id}
                  onChange={(e) => setForm({ ...form, docente_id: e.target.value })}
                  className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                    required
                    className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {CATEGORIA_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Nivel Formacion</label>
                  <select
                    value={form.nivel_formacion}
                    onChange={(e) => setForm({ ...form, nivel_formacion: e.target.value })}
                    required
                    className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                  >
                    <option value="">Seleccionar...</option>
                    {NIVEL_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Titulo</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Fecha Ingreso</label>
                  <input
                    type="date"
                    value={form.fecha_ingreso}
                    onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })}
                    className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Antiguedad</label>
                  <input
                    type="text"
                    value={form.antiguedad}
                    onChange={(e) => setForm({ ...form, antiguedad: e.target.value })}
                    placeholder="Ej: 5 anos"
                    className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">Puntos</label>
                  <input
                    type="number"
                    value={form.puntos}
                    onChange={(e) => setForm({ ...form, puntos: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Observaciones</label>
                <textarea
                  value={form.observaciones}
                  onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-unisinu-600 bg-white resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white ring-1 ring-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-unisinu-600 hover:bg-unisinu-700 rounded-lg shadow-sm disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
