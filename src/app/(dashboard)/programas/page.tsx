'use client';

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Programa {
  id: number;
  codigo: string;
  nombre: string;
  grado: string;
  modalidad: string;
  facultad: string;
  creditos: number;
  duracion: string;
  snies: string;
  estado: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type EditingCell = { id: number; field: keyof Programa } | null;

const GRADO_OPTIONS = ['Pregrado', 'Posgrado', 'Especializaci\u00f3n', 'Maestr\u00eda', 'Doctorado'];
const MODALIDAD_OPTIONS = ['Presencial', 'Virtual', 'H\u00edbrido', 'Distancia'];
const ESTADO_OPTIONS = ['activo', 'inactivo', 'en_revision'];

const GRADO_COLORS: Record<string, string> = {
  'Pregrado': 'bg-blue-100 text-blue-800 border-blue-200',
  'Posgrado': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Especializaci\u00f3n': 'bg-violet-100 text-violet-800 border-violet-200',
  'Maestr\u00eda': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Doctorado': 'bg-amber-100 text-amber-800 border-amber-200',
};

const ESTADO_COLORS: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  inactivo: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  en_revision: 'bg-amber-100 text-amber-800 border-amber-200',
};

const EDITABLE_FIELDS: (keyof Programa)[] = ['nombre', 'facultad', 'creditos', 'duracion', 'snies'];

const EMPTY_FORM = {
  codigo: '',
  nombre: '',
  grado: '',
  modalidad: '',
  facultad: '',
  creditos: '',
  duracion: '',
  snies: '',
  estado: 'activo',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ProgramasPage() {
  const [data, setData] = useState<Programa[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [filterModalidad, setFilterModalidad] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
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
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (filterGrado) params.set('grado', filterGrado);
      if (filterModalidad) params.set('modalidad', filterModalidad);
      if (filterEstado) params.set('estado', filterEstado);

      const res = await fetch(`/api/programas?${params}`);
      if (!res.ok) throw new Error('Error al cargar programas');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page, limit: 20, total: 0, totalPages: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [search, filterGrado, filterModalidad, filterEstado]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  /* ---- inline edit ---- */
  function startEdit(id: number, field: keyof Programa, currentValue: string | number) {
    if (!EDITABLE_FIELDS.includes(field)) return;
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
    setTimeout(() => editRef.current?.focus(), 0);
  }

  async function saveEdit() {
    if (!editingCell) return;
    const { id, field } = editingCell;
    try {
      const val = field === 'creditos' ? Number(editValue) : editValue;
      const res = await fetch('/api/programas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: val }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
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

  function openEdit(item: Programa) {
    setEditingId(item.id);
    setFormData({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      grado: item.grado || '',
      modalidad: item.modalidad || '',
      facultad: item.facultad || '',
      creditos: String(item.creditos || ''),
      duracion: item.duracion || '',
      snies: item.snies || '',
      estado: item.estado || 'activo',
    });
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = {
        ...(editingId ? { id: editingId } : {}),
        ...formData,
        creditos: Number(formData.creditos) || 0,
      };
      const res = await fetch('/api/programas', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar');
      setShowModal(false);
      fetchData(pagination.page);
    } catch {
      setError('Error al guardar programa');
    } finally {
      setSaving(false);
    }
  }

  /* ---- delete ---- */
  async function handleDelete() {
    if (deleteId === null) return;
    try {
      const res = await fetch(`/api/programas?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchData(pagination.page);
    } catch {
      setError('Error al eliminar programa');
    }
    setDeleteId(null);
  }

  /* ---- stats ---- */
  const total = pagination.total;
  const activos = data.filter((r) => r.estado === 'activo').length;
  const gradoBreakdown = GRADO_OPTIONS.reduce<Record<string, number>>((acc, g) => {
    acc[g] = data.filter((r) => r.grado === g).length;
    return acc;
  }, {});

  /* ---- render cell ---- */
  function renderCell(row: Programa, field: keyof Programa) {
    const isEditing = editingCell?.id === row.id && editingCell?.field === field;
    const value = row[field];

    if (isEditing) {
      return (
        <input
          ref={editRef}
          type={field === 'creditos' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
          className="w-full px-2 py-1 text-sm ring-1 ring-indigo-400 rounded focus:outline-none focus:ring-indigo-500 bg-white"
        />
      );
    }

    const isEditable = EDITABLE_FIELDS.includes(field);
    return (
      <span
        onClick={() => isEditable && startEdit(row.id, field, value)}
        className={`block w-full px-2 py-1 rounded text-sm truncate ${isEditable ? 'cursor-pointer hover:bg-indigo-50 transition-colors' : ''}`}
        title={String(value ?? '')}
      >
        {value ?? '-'}
      </span>
    );
  }

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{"Programas Acad\u00e9micos"}</h1>
          <p className="text-sm text-zinc-600 mt-1">{"Gesti\u00f3n de programas acad\u00e9micos institucionales"}</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Programa
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="shrink-0 p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">Total</p>
            <p className="text-xl font-bold text-[#1e3a5f]">{total}</p>
          </div>
        </div>
        <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 flex items-center gap-3">
          <div className="shrink-0 p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600">Activos</p>
            <p className="text-xl font-bold text-[#1e3a5f]">{activos}</p>
          </div>
        </div>
        {GRADO_OPTIONS.map((g) => (
          <div key={g} className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 flex items-center gap-3">
            <div className={`shrink-0 p-2 rounded-lg ${GRADO_COLORS[g]?.split(' ').slice(0, 1).join(' ')}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-600 truncate">{g}</p>
              <p className="text-lg font-bold text-[#1e3a5f]">{gradoBreakdown[g] || 0}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Buscar</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={"Nombre, c\u00f3digo, SNIES..."} className="w-full pl-10 pr-4 py-2 text-sm ring-1 ring-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Grado</label>
            <select value={filterGrado} onChange={(e) => setFilterGrado(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos</option>
              {GRADO_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Modalidad</label>
            <select value={filterModalidad} onChange={(e) => setFilterModalidad(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todas</option>
              {MODALIDAD_OPTIONS.map((m) => (<option key={m} value={m}>{m}</option>))}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-zinc-600 mb-1">Estado</label>
            <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Todos</option>
              {ESTADO_OPTIONS.map((e) => (<option key={e} value={e}>{e === 'en_revision' ? 'En revisi\u00f3n' : e.charAt(0).toUpperCase() + e.slice(1)}</option>))}
            </select>
          </div>
          <button onClick={() => { setSearch(''); setFilterGrado(''); setFilterModalidad(''); setFilterEstado(''); }} className="px-3 py-2 text-sm text-zinc-600 hover:text-indigo-600 hover:bg-zinc-100 rounded-lg transition-colors">
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

      {/* Table */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-4 px-6 border-b border-zinc-200">
                <div className="h-4 bg-zinc-200 rounded w-20" />
                <div className="h-4 bg-zinc-200 rounded w-48 flex-1" />
                <div className="h-4 bg-zinc-200 rounded w-24" />
                <div className="h-4 bg-zinc-200 rounded w-20" />
                <div className="h-4 bg-zinc-200 rounded w-24" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
            <p className="text-lg font-medium">No se encontraron programas</p>
            <p className="text-sm mt-1">Cree un nuevo programa o ajuste los filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="min-w-[80px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">{"C\u00f3digo"}</th>
                  <th className="min-w-[200px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Nombre</th>
                  <th className="min-w-[120px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Grado</th>
                  <th className="min-w-[100px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Modalidad</th>
                  <th className="min-w-[150px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Facultad</th>
                  <th className="min-w-[80px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">{"Cr\u00e9ditos"}</th>
                  <th className="min-w-[90px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">{"Duraci\u00f3n"}</th>
                  <th className="min-w-[90px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">SNIES</th>
                  <th className="min-w-[90px] px-6 py-3 text-left text-xs font-semibold text-zinc-950 uppercase tracking-wide">Estado</th>
                  <th className="min-w-[80px] px-6 py-3 text-center text-xs font-semibold text-zinc-950 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3"><span className="text-sm font-mono text-zinc-700">{row.codigo || '-'}</span></td>
                    <td className="px-6 py-3">{renderCell(row, 'nombre')}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${GRADO_COLORS[row.grado] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                        {row.grado || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3"><span className="text-sm text-zinc-700">{row.modalidad || '-'}</span></td>
                    <td className="px-6 py-3">{renderCell(row, 'facultad')}</td>
                    <td className="px-6 py-3">{renderCell(row, 'creditos')}</td>
                    <td className="px-6 py-3">{renderCell(row, 'duracion')}</td>
                    <td className="px-6 py-3">{renderCell(row, 'snies')}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full border ${ESTADO_COLORS[row.estado] || 'bg-zinc-100 text-zinc-700 border-zinc-200'}`}>
                        {row.estado === 'en_revision' ? 'En revisi\u00f3n' : row.estado ? row.estado.charAt(0).toUpperCase() + row.estado.slice(1) : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(row)} className="p-1.5 text-zinc-400 hover:text-[#2563eb] hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeleteId(row.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200">
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 rounded-t-xl">
              <h2 className="text-lg font-semibold text-[#1e3a5f]">
                {editingId ? 'Editar Programa' : 'Nuevo Programa'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{"C\u00f3digo"} <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">SNIES</label>
                  <input type="text" value={formData.snies} onChange={(e) => setFormData({ ...formData, snies: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Grado <span className="text-red-500">*</span></label>
                  <select value={formData.grado} onChange={(e) => setFormData({ ...formData, grado: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Seleccionar...</option>
                    {GRADO_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Modalidad <span className="text-red-500">*</span></label>
                  <select value={formData.modalidad} onChange={(e) => setFormData({ ...formData, modalidad: e.target.value })} required className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Seleccionar...</option>
                    {MODALIDAD_OPTIONS.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Facultad</label>
                <input type="text" value={formData.facultad} onChange={(e) => setFormData({ ...formData, facultad: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{"Cr\u00e9ditos"}</label>
                  <input type="number" value={formData.creditos} onChange={(e) => setFormData({ ...formData, creditos: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">{"Duraci\u00f3n"}</label>
                  <input type="text" value={formData.duracion} onChange={(e) => setFormData({ ...formData, duracion: e.target.value })} placeholder="10 semestres" className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Estado</label>
                  <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })} className="w-full px-3 py-2 bg-white ring-1 ring-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {ESTADO_OPTIONS.map((e) => (<option key={e} value={e}>{e === 'en_revision' ? 'En revisi\u00f3n' : e.charAt(0).toUpperCase() + e.slice(1)}</option>))}
                  </select>
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
                <h3 className="text-lg font-bold text-zinc-950">Eliminar Programa</h3>
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
