'use client';

import { useState, useEffect, useCallback, useRef, FormEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ProfesorAsignatura {
  id: number;
  instructor: string;
  docente_id: string;
  clase: string;
  programa_academico: string;
  grado: string;
  modalidad: string;
  cohorte: string;
  semestre: string;
  cedula: string;
  dedicacion: string;
  catalogo: string;
  asignatura: string;
  inscritos: number;
  componente: string;
  atrib_curso: string;
  fecha_inicial: string;
  fecha_final: string;
  total_hrs_curso: number;
  hrs_semanal: number;
  hrs_semestre: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type EditingCell = { id: number; field: keyof ProfesorAsignatura } | null;

const GRADO_OPTIONS = ['PREG', 'POSG', 'ESP', 'MAESTRIA'];

const EMPTY_FORM: Omit<ProfesorAsignatura, 'id'> = {
  instructor: '',
  docente_id: '',
  clase: '',
  programa_academico: '',
  grado: '',
  modalidad: '',
  cohorte: '',
  semestre: '',
  cedula: '',
  dedicacion: '',
  catalogo: '',
  asignatura: '',
  inscritos: 0,
  componente: '',
  atrib_curso: '',
  fecha_inicial: '',
  fecha_final: '',
  total_hrs_curso: 0,
  hrs_semanal: 0,
  hrs_semestre: 0,
};

const COLUMNS: { key: keyof ProfesorAsignatura; label: string; width?: string; type?: string }[] = [
  { key: 'instructor', label: 'Instructor', width: 'min-w-[180px]' },
  { key: 'docente_id', label: 'Docente ID', width: 'min-w-[100px]' },
  { key: 'clase', label: 'Clase', width: 'min-w-[80px]' },
  { key: 'programa_academico', label: 'Programa Academico', width: 'min-w-[180px]' },
  { key: 'grado', label: 'Grado', width: 'min-w-[90px]' },
  { key: 'modalidad', label: 'Modalidad', width: 'min-w-[110px]' },
  { key: 'cohorte', label: 'Cohorte', width: 'min-w-[90px]' },
  { key: 'semestre', label: 'Semestre', width: 'min-w-[90px]' },
  { key: 'cedula', label: 'Cedula', width: 'min-w-[120px]' },
  { key: 'dedicacion', label: 'Dedicacion', width: 'min-w-[110px]' },
  { key: 'catalogo', label: 'Catalogo', width: 'min-w-[100px]' },
  { key: 'asignatura', label: 'Asignatura', width: 'min-w-[180px]' },
  { key: 'inscritos', label: 'Inscritos', width: 'min-w-[90px]', type: 'number' },
  { key: 'componente', label: 'Componente', width: 'min-w-[120px]' },
  { key: 'hrs_semanal', label: 'Hrs Semanal', width: 'min-w-[110px]', type: 'number' },
  { key: 'hrs_semestre', label: 'Hrs Semestre', width: 'min-w-[110px]', type: 'number' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function ProfesoresAsignaturaPage() {
  const [data, setData] = useState<ProfesorAsignatura[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterPrograma, setFilterPrograma] = useState('');
  const [filterGrado, setFilterGrado] = useState('');
  const [programas, setProgramas] = useState<string[]>([]);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Omit<ProfesorAsignatura, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  /* ---- fetch ---- */
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterPrograma) params.set('programa', filterPrograma);
      if (filterGrado) params.set('grado', filterGrado);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/profesores-asignatura?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page, limit: 50, total: 0, totalPages: 0 });

      const unique = Array.from(new Set((json.data ?? []).map((r: ProfesorAsignatura) => r.programa_academico).filter(Boolean))) as string[];
      setProgramas((prev) => {
        const merged = Array.from(new Set([...prev, ...unique]));
        merged.sort();
        return merged;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [search, filterPrograma, filterGrado]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  /* ---- inline edit ---- */
  function startEdit(id: number, field: keyof ProfesorAsignatura, currentValue: string | number) {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
    setTimeout(() => editRef.current?.focus(), 0);
  }

  async function saveEdit() {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const col = COLUMNS.find((c) => c.key === field);
    const value = col?.type === 'number' ? parseFloat(editValue) || 0 : editValue;

    try {
      const res = await fetch('/api/profesores-asignatura', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    } catch {
      setError('Error al guardar cambio');
    }
    setEditingCell(null);
  }

  /* ---- create ---- */
  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/profesores-asignatura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Error al crear registro');
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchData(pagination.page);
    } catch {
      setError('Error al crear registro');
    } finally {
      setSaving(false);
    }
  }

  /* ---- delete ---- */
  async function handleDelete() {
    if (deleteId === null) return;
    try {
      const res = await fetch(`/api/profesores-asignatura?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchData(pagination.page);
    } catch {
      setError('Error al eliminar registro');
    }
    setDeleteId(null);
  }

  /* ---- summary ---- */
  const totalAsignaciones = pagination.total;
  const docentesUnicos = new Set(data.map((r) => r.docente_id).filter(Boolean)).size;
  const promedioHrsDocente = docentesUnicos > 0
    ? (data.reduce((s, r) => s + (r.hrs_semanal || 0), 0) / docentesUnicos).toFixed(1)
    : '0';

  /* ---- render cell ---- */
  function renderCell(row: ProfesorAsignatura, col: typeof COLUMNS[number]) {
    const isEditing = editingCell?.id === row.id && editingCell?.field === col.key;
    const value = row[col.key];

    if (isEditing) {
      return (
        <input
          ref={editRef}
          type={col.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          step={col.type === 'number' ? 'any' : undefined}
        />
      );
    }

    return (
      <span
        onClick={() => startEdit(row.id, col.key, value)}
        className="block w-full px-2 py-1 rounded cursor-pointer hover:bg-blue-50 transition-colors text-sm truncate"
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
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f]">Profesores por Asignatura</h1>
          <p className="text-sm text-gray-500 mt-1">Mapeo de docentes a asignaturas academicas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 mt-4 sm:mt-0 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#2a4d7a] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva Asignacion
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Asignaciones', value: totalAsignaciones, icon: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.44-1.757 1.757a4.5 4.5 0 0 1-6.364-6.364l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364Z', color: 'bg-blue-50 text-blue-600' },
          { label: 'Docentes Unicos', value: docentesUnicos, icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z', color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Prom. Hrs/Docente', value: promedioHrsDocente, icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z', color: 'bg-amber-50 text-amber-600' },
        ].map((card) => (
          <div key={card.label} className="card p-5 flex items-center gap-4">
            <div className={`shrink-0 p-3 rounded-lg ${card.color}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{card.label}</p>
              <p className="text-2xl font-bold text-[#1e3a5f]">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar docente, asignatura..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
              />
            </div>
          </div>
          <select
            value={filterPrograma}
            onChange={(e) => setFilterPrograma(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] bg-white"
          >
            <option value="">Todos los programas</option>
            {programas.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={filterGrado}
            onChange={(e) => setFilterGrado(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] bg-white"
          >
            <option value="">Todos los grados</option>
            {GRADO_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
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
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-3 text-gray-500">Cargando asignaciones...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.44-1.757 1.757a4.5 4.5 0 0 1-6.364-6.364l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364Z" />
            </svg>
            <p className="text-lg font-medium">No se encontraron asignaciones</p>
            <p className="text-sm mt-1">Intente ajustar los filtros o cree una nueva asignacion</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col.key} className={col.width}>{col.label}</th>
                  ))}
                  <th className="min-w-[60px] text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className={col.width}>
                        {renderCell(row, col)}
                      </td>
                    ))}
                    <td className="text-center">
                      <button
                        onClick={() => setDeleteId(row.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
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
                    className={`px-3 py-1.5 text-sm rounded-lg ${p === pagination.page ? 'bg-[#1e3a5f] text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-[#1e3a5f]">Nueva Asignacion Profesor-Asignatura</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {COLUMNS.map((col) => (
                  <div key={col.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{col.label}</label>
                    {col.key === 'grado' ? (
                      <select
                        value={(formData as Record<string, string | number>)[col.key] ?? ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [col.key]: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f] bg-white"
                      >
                        <option value="">Seleccionar</option>
                        {GRADO_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    ) : (
                      <input
                        type={col.type === 'number' ? 'number' : 'text'}
                        value={(formData as Record<string, string | number>)[col.key] ?? ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [col.key]: col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30 focus:border-[#1e3a5f]"
                        step={col.type === 'number' ? 'any' : undefined}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#2a4d7a] disabled:opacity-60">
                  {saving ? 'Guardando...' : 'Crear Asignacion'}
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
                <h3 className="text-lg font-bold text-gray-900">Eliminar Asignacion</h3>
                <p className="text-sm text-gray-500">Esta accion no se puede deshacer</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
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
