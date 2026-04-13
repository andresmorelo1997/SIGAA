'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Pagination,
  StatCard,
  EmptyState,
  Modal,
} from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ImportRecord {
  id: number;
  filename: string;
  file_type: string;
  ciclo_lectivo: string;
  grado: string;
  campus: string;
  inserted: number;
  updated: number;
  errors: number;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  status: 'completed' | 'error' | 'processing';
  created_at: string;
  error_details?: string;
  error_message?: string;
}

interface ImportStats {
  total_imports: number;
  total_records: number;
  last_import: string | null;
  total_errors: number;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Filters {
  search: string;
  file_type: string;
  status: string;
  ciclo_lectivo: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */
const FILE_TYPE_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'US_PROG', label: 'US_PROG' },
  { value: 'US_DATOS', label: 'US_DATOS' },
  { value: 'LC_PROG', label: 'LC_PROG' },
  { value: 'DOCENTES_IES', label: 'DOCENTES_IES' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'completed', label: 'Completado' },
  { value: 'error', label: 'Error' },
  { value: 'processing', label: 'Procesando' },
];

const FILE_TYPE_BADGE_VARIANT: Record<string, 'info' | 'primary' | 'warning' | 'neutral'> = {
  US_PROG: 'info',
  US_DATOS: 'primary',
  LC_PROG: 'warning',
  DOCENTES_IES: 'neutral',
};

const STATUS_BADGE: Record<string, { variant: 'success' | 'danger' | 'warning'; label: string }> = {
  completed: { variant: 'success', label: 'Completado' },
  error: { variant: 'danger', label: 'Error' },
  processing: { variant: 'warning', label: 'Procesando' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function HistorialImportacionesPage() {
  const [data, setData] = useState<ImportRecord[]>([]);
  const [stats, setStats] = useState<ImportStats>({
    total_imports: 0,
    total_records: 0,
    last_import: null,
    total_errors: 0,
  });
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState<Filters>({
    search: '',
    file_type: '',
    status: '',
    ciclo_lectivo: '',
  });

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ImportRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- fetch ---- */
  const fetchData = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (filters.search) params.set('search', filters.search);
        if (filters.file_type) params.set('file_type', filters.file_type);
        if (filters.status) params.set('status', filters.status);
        if (filters.ciclo_lectivo) params.set('ciclo_lectivo', filters.ciclo_lectivo);

        const res = await fetch(`/api/import-history?${params}`);
        if (!res.ok) throw new Error('Error al cargar historial de importaciones');
        const json = await res.json();

        setData(json.data ?? []);
        setPagination(
          json.pagination ?? { page, limit, total: 0, totalPages: 0 },
        );
        if (json.stats) setStats(json.stats);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  /* ---- delete ---- */
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/import-history?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Error al eliminar importacion');
      setDeleteTarget(null);
      fetchData(pagination.page);
    } catch {
      setError('Error al eliminar la importacion');
    } finally {
      setDeleting(false);
    }
  }

  /* ---- helpers ---- */
  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    try {
      return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  function formatShortDate(dateStr: string | null) {
    if (!dateStr) return 'N/A';
    try {
      return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  const deleteRecordCount = deleteTarget
    ? (deleteTarget.inserted ?? deleteTarget.records_inserted ?? 0) + (deleteTarget.updated ?? deleteTarget.records_updated ?? 0)
    : 0;

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
          Historial de Importaciones
        </h1>
        <p className="text-sm text-zinc-600 mt-1">
          Registro de todos los archivos importados al sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Importaciones"
          value={stats.total_imports}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
          }
        />
        <StatCard
          label="Registros Totales"
          value={stats.total_records.toLocaleString('es-CO')}
          color="green"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v.75" />
            </svg>
          }
        />
        <StatCard
          label="Ultima Importacion"
          value={formatShortDate(stats.last_import)}
          color="purple"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          }
        />
        <StatCard
          label="Errores"
          value={stats.total_errors}
          color="red"
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
        />
      </div>

      {/* Filter Bar */}
      <Card padding="none" className="mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Buscar por nombre de archivo..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              }
            />
            <Select
              value={filters.file_type}
              onChange={(e) => updateFilter('file_type', e.target.value)}
              options={FILE_TYPE_OPTIONS}
            />
            <Select
              value={filters.status}
              onChange={(e) => updateFilter('status', e.target.value)}
              options={STATUS_OPTIONS}
            />
            <Input
              placeholder="Ciclo lectivo (ej: 2025-1)"
              value={filters.ciclo_lectivo}
              onChange={(e) => updateFilter('ciclo_lectivo', e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-400 hover:text-red-600 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Table */}
      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="ml-3 text-zinc-600">Cargando historial...</span>
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            title="No se encontraron importaciones"
            description="No hay registros de importacion que coincidan con los filtros aplicados."
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            }
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setFilters({ search: '', file_type: '', status: '', ciclo_lectivo: '' })
                }
              >
                Limpiar filtros
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Archivo</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Ciclo</TableHeaderCell>
                  <TableHeaderCell>Grado</TableHeaderCell>
                  <TableHeaderCell>Campus</TableHeaderCell>
                  <TableHeaderCell className="text-right">Insertados</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actualizados</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Fecha</TableHeaderCell>
                  <TableHeaderCell className="text-center">Acciones</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <Fragment key={row.id}>
                    <TableRow
                      className={expandedId === row.id ? 'bg-blue-50/50' : ''}
                    >
                      <TableCell>
                        <span
                          className="font-medium text-zinc-950 truncate block max-w-[200px]"
                          title={row.filename}
                        >
                          {row.filename}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={FILE_TYPE_BADGE_VARIANT[row.file_type] ?? 'neutral'}
                          size="sm"
                        >
                          {row.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.ciclo_lectivo || '-'}</TableCell>
                      <TableCell>{row.grado || '-'}</TableCell>
                      <TableCell>{row.campus || '-'}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {(row.inserted ?? row.records_inserted ?? 0).toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {(row.updated ?? row.records_updated ?? 0).toLocaleString('es-CO')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_BADGE[row.status]?.variant ?? 'neutral'}
                          size="sm"
                          dot
                        >
                          {STATUS_BADGE[row.status]?.label ?? row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-600 text-xs">
                        {formatDate(row.created_at)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Expand / View details */}
                          <button
                            onClick={() =>
                              setExpandedId(expandedId === row.id ? null : row.id)
                            }
                            className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver detalles"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${expandedId === row.id ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(row)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {/* Expanded detail row */}
                    {expandedId === row.id && (
                      <tr>
                        <td colSpan={10} className="!p-0">
                          <div className="bg-slate-50 border-t border-b border-blue-100 px-8 py-5">
                            <h4 className="text-sm font-semibold text-[#1e3a5f] mb-3">
                              Detalles de la Importacion
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-3">
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Archivo</p>
                                <p className="text-sm text-gray-800 mt-0.5 break-all">{row.filename}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Tipo</p>
                                <p className="text-sm text-gray-800 mt-0.5">{row.file_type}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Ciclo Lectivo</p>
                                <p className="text-sm text-gray-800 mt-0.5">{row.ciclo_lectivo || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Grado</p>
                                <p className="text-sm text-gray-800 mt-0.5">{row.grado || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Campus</p>
                                <p className="text-sm text-gray-800 mt-0.5">{row.campus || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Registros Insertados</p>
                                <p className="text-sm text-gray-800 mt-0.5 font-medium">{(row.inserted ?? row.records_inserted ?? 0).toLocaleString('es-CO')}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Registros Actualizados</p>
                                <p className="text-sm text-gray-800 mt-0.5 font-medium">{(row.updated ?? row.records_updated ?? 0).toLocaleString('es-CO')}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Errores</p>
                                <p className={`text-sm mt-0.5 font-medium ${row.errors > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                  {row.errors}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Estado</p>
                                <div className="mt-0.5">
                                  <Badge variant={STATUS_BADGE[row.status]?.variant ?? 'neutral'} size="sm" dot>
                                    {STATUS_BADGE[row.status]?.label ?? row.status}
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Fecha</p>
                                <p className="text-sm text-gray-800 mt-0.5">{formatDate(row.created_at)}</p>
                              </div>
                            </div>
                            {row.error_details && (
                              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs font-medium text-red-700 uppercase tracking-wider mb-1">Detalle del Error</p>
                                <p className="text-sm text-red-600 whitespace-pre-wrap">{row.error_details}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="px-5 py-4 border-t border-zinc-200">
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => fetchData(p)}
                limit={pagination.limit}
                onLimitChange={(l) => fetchData(1, l)}
                total={pagination.total}
              />
            </div>
          </>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar Importacion"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={deleting}
              onClick={handleDelete}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              }
            >
              Eliminar
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0 p-2.5 bg-red-100 rounded-lg">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-zinc-700">
              Esta a punto de eliminar la importacion del archivo:
            </p>
            <p className="mt-1 text-sm font-semibold text-zinc-950">
              {deleteTarget?.filename}
            </p>
            {deleteRecordCount > 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  Esto eliminara {deleteRecordCount.toLocaleString('es-CO')} registros asociados
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ({(deleteTarget?.inserted ?? deleteTarget?.records_inserted ?? 0).toLocaleString('es-CO')} insertados + {(deleteTarget?.updated ?? deleteTarget?.records_updated ?? 0).toLocaleString('es-CO')} actualizados)
                </p>
              </div>
            )}
            <p className="mt-3 text-xs text-zinc-600">
              Esta accion no se puede deshacer.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
