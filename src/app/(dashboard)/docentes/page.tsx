'use client';

import React, { useState, useEffect, useCallback, useRef, FormEvent } from 'react';
import { formatInstructorId } from '@/lib/format';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Docente {
  id: number;
  ciclo_lectivo: string;
  campus: string;
  instructor_id: string;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  tipo_doc: string;
  doc_id: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  correo: string;
  fecha_inicio: string;
  fecha_final: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type EditingCell = { id: number; field: keyof Docente } | null;

const EMPTY_FORM: Omit<Docente, 'id'> = {
  ciclo_lectivo: '',
  campus: '',
  instructor_id: '',
  primer_nombre: '',
  segundo_nombre: '',
  primer_apellido: '',
  segundo_apellido: '',
  tipo_doc: '',
  doc_id: '',
  ciudad: '',
  direccion: '',
  telefono: '',
  correo: '',
  fecha_inicio: '',
  fecha_final: '',
};

const TABLE_COLUMNS: { key: keyof Docente; label: string; width?: string; type?: string; visible: boolean }[] = [
  { key: 'id', label: 'ID', width: 'min-w-[70px]', visible: true },
  { key: 'primer_nombre', label: 'Nombre Completo', width: 'min-w-[220px]', visible: true },
  { key: 'doc_id', label: 'Doc ID', width: 'min-w-[130px]', visible: true },
  { key: 'campus', label: 'Campus', width: 'min-w-[120px]', visible: true },
  { key: 'ciudad', label: 'Ciudad', width: 'min-w-[130px]', visible: true },
  { key: 'telefono', label: 'Telefono', width: 'min-w-[140px]', visible: true },
  { key: 'correo', label: 'Correo', width: 'min-w-[200px]', visible: true },
  { key: 'fecha_inicio', label: 'Fecha Inicio', width: 'min-w-[130px]', type: 'date', visible: true },
  { key: 'fecha_final', label: 'Fecha Final', width: 'min-w-[130px]', type: 'date', visible: true },
];

const EDITABLE_FIELDS: (keyof Docente)[] = ['campus', 'ciudad', 'telefono', 'correo', 'fecha_inicio', 'fecha_final', 'doc_id'];

const FORM_FIELDS: { key: keyof Omit<Docente, 'id'>; label: string; type?: string; required?: boolean }[] = [
  { key: 'primer_nombre', label: 'Primer Nombre', required: true },
  { key: 'segundo_nombre', label: 'Segundo Nombre' },
  { key: 'primer_apellido', label: 'Primer Apellido', required: true },
  { key: 'segundo_apellido', label: 'Segundo Apellido' },
  { key: 'tipo_doc', label: 'Tipo Documento' },
  { key: 'doc_id', label: 'Numero Documento', required: true },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'direccion', label: 'Direccion' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'correo', label: 'Correo Electronico', type: 'email' },
  { key: 'campus', label: 'Campus' },
  { key: 'ciclo_lectivo', label: 'Ciclo Lectivo' },
  { key: 'fecha_inicio', label: 'Fecha Inicio', type: 'date' },
  { key: 'fecha_final', label: 'Fecha Final', type: 'date' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function fullName(d: Docente) {
  return [d.primer_nombre, d.segundo_nombre, d.primer_apellido, d.segundo_apellido]
    .filter(Boolean)
    .join(' ');
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function DocentesPage() {
  const [data, setData] = useState<Docente[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [campusList, setCampusList] = useState<string[]>([]);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Omit<Docente, 'id'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  /* ---- fetch ---- */
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCampus) params.set('campus', filterCampus);
      params.set('page', String(page));
      params.set('limit', '50');

      const res = await fetch(`/api/docentes?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page, limit: 50, total: 0, totalPages: 0 });

      const unique = Array.from(new Set((json.data ?? []).map((r: Docente) => r.campus).filter(Boolean))) as string[];
      setCampusList((prev) => {
        const merged = Array.from(new Set([...prev, ...unique]));
        merged.sort();
        return merged;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [search, filterCampus]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  /* ---- inline edit ---- */
  function startEdit(id: number, field: keyof Docente, currentValue: string | number) {
    if (!EDITABLE_FIELDS.includes(field)) return;
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
    setTimeout(() => editRef.current?.focus(), 0);
  }

  async function saveEdit() {
    if (!editingCell) return;
    const { id, field } = editingCell;
    try {
      const res = await fetch('/api/docentes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: editValue }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setData((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: editValue } : r)));
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
      const res = await fetch('/api/docentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Error al crear docente');
      setShowModal(false);
      setFormData(EMPTY_FORM);
      fetchData(pagination.page);
    } catch {
      setError('Error al crear docente');
    } finally {
      setSaving(false);
    }
  }

  /* ---- delete ---- */
  async function handleDelete() {
    if (deleteId === null) return;
    try {
      const res = await fetch(`/api/docentes?id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar');
      fetchData(pagination.page);
    } catch {
      setError('Error al eliminar docente');
    }
    setDeleteId(null);
  }

  /* ---- render cell ---- */
  function renderCell(row: Docente, col: typeof TABLE_COLUMNS[number]) {
    // Name column shows concatenated name
    if (col.key === 'primer_nombre') {
      return (
        <span className="block text-sm font-medium text-zinc-900 truncate" title={fullName(row)}>
          {fullName(row)}
        </span>
      );
    }

    // ID column not editable
    if (col.key === 'id') {
      return <span className="block text-sm text-zinc-600 font-medium">{row.id}</span>;
    }

    const isEditing = editingCell?.id === row.id && editingCell?.field === col.key;
    const value = row[col.key];

    if (isEditing) {
      return (
        <input
          ref={editRef}
          type={col.type === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
          className="w-full px-2 py-1 text-sm border border-indigo-400 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-zinc-900 transition-colors"
        />
      );
    }

    const isEditable = EDITABLE_FIELDS.includes(col.key);

    // Format employee/instructor IDs with Colombian 10-digit convention.
    let displayValue: unknown = value;
    if ((col.key === 'instructor_id' || col.key === 'doc_id') && value != null && value !== '') {
      displayValue = formatInstructorId(value);
    }

    return (
      <span
        onClick={() => isEditable && startEdit(row.id, col.key, value)}
        className={`block w-full rounded text-sm truncate ${isEditable ? 'cursor-pointer hover:bg-indigo-50 transition-colors px-2 py-1' : ''} ${col.key === 'instructor_id' || col.key === 'doc_id' ? 'font-mono tabular-nums' : ''} text-zinc-900`}
        title={String(displayValue ?? value ?? '')}
      >
        {displayValue ?? '-'}
      </span>
    );
  }

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="px-6 py-8 max-w-full bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Docentes</h1>
          <p className="text-sm text-zinc-600 mt-2">Gestión de docentes del sistema</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 mt-4 sm:mt-0 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nuevo Docente
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, documento, correo..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-zinc-200 rounded-lg ring-1 ring-zinc-200 placeholder-zinc-500 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>
          <div>
            <select
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg ring-1 ring-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
            >
              <option value="">Todos los campus</option>
              {campusList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 shadow-sm">
          <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm font-medium text-red-800">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="rounded-xl ring-1 ring-zinc-950/5 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-zinc-600">Cargando docentes...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <svg className="w-16 h-16 text-zinc-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            <p className="text-lg font-semibold text-zinc-900 mb-1">No se encontraron docentes</p>
            <p className="text-sm text-zinc-600">Intente ajustar los filtros o agregue un nuevo docente</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-zinc-200 bg-zinc-100">
                  {TABLE_COLUMNS.filter((c) => c.visible).map((col) => (
                    <th key={col.key} className={`${col.width} px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600`}>
                      {col.label}
                    </th>
                  ))}
                  <th className="min-w-[80px] px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {data.map((row) => (
                  <React.Fragment key={row.id}>
                    <tr
                      className="cursor-pointer hover:bg-zinc-50 transition-colors"
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                    >
                      {TABLE_COLUMNS.filter((c) => c.visible).map((col) => (
                        <td
                          key={col.key}
                          className={`${col.width} px-4 py-3`}
                          onClick={(e) => { if (EDITABLE_FIELDS.includes(col.key)) e.stopPropagation(); }}
                        >
                          {renderCell(row, col)}
                        </td>
                      ))}
                      <td className="min-w-[80px] px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleteId(row.id)}
                          className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Eliminar docente"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                    {/* Expanded row details */}
                    {expandedId === row.id && (
                      <tr key={`detail-${row.id}`} className="bg-zinc-50 border-b border-zinc-200">
                        <td colSpan={TABLE_COLUMNS.filter((c) => c.visible).length + 1} className="p-0">
                          <div className="px-6 py-5">
                            <h4 className="text-sm font-semibold text-zinc-900 mb-4">Información completa del docente</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                              {[
                                { label: 'Primer Nombre', value: row.primer_nombre },
                                { label: 'Segundo Nombre', value: row.segundo_nombre },
                                { label: 'Primer Apellido', value: row.primer_apellido },
                                { label: 'Segundo Apellido', value: row.segundo_apellido },
                                { label: 'Tipo Documento', value: row.tipo_doc },
                                { label: 'Numero Documento', value: formatInstructorId(row.doc_id) || row.doc_id },
                                { label: 'Instructor ID', value: formatInstructorId(row.instructor_id) },
                                { label: 'Campus', value: row.campus },
                                { label: 'Ciudad', value: row.ciudad },
                                { label: 'Direccion', value: row.direccion },
                                { label: 'Telefono', value: row.telefono },
                                { label: 'Correo', value: row.correo },
                                { label: 'Ciclo Lectivo', value: row.ciclo_lectivo },
                                { label: 'Fecha Inicio', value: row.fecha_inicio },
                                { label: 'Fecha Final', value: row.fecha_final },
                              ].map((item) => (
                                <div key={item.label}>
                                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">{item.label}</p>
                                  <p className="text-sm text-zinc-900">{item.value || '-'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-6 py-4 border-t border-zinc-200 bg-zinc-50">
            <p className="text-sm text-zinc-600 mb-4 sm:mb-0">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
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
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      p === pagination.page
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Docente Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-zinc-900">Nuevo Docente</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {FORM_FIELDS.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-semibold text-zinc-900 mb-1.5">
                      {field.label}
                      {field.required && <span className="text-red-600 ml-0.5">*</span>}
                    </label>
                    <input
                      type={field.type || 'text'}
                      value={(formData as Record<string, string>)[field.key] ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      required={field.required}
                      className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg ring-1 ring-zinc-200 text-zinc-900 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {saving ? 'Guardando...' : 'Crear Docente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Eliminar Docente</h3>
                <p className="text-sm text-zinc-600">Esta accion no se puede deshacer</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-semibold text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
