'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  MultiSelect,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
  Pagination,
  Tabs,
  EmptyState,
} from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface GlobalFilters {
  periodo: string;
  campus: string[];
  facultad: string;
}

interface TabFilterConfig {
  key: string;
  label: string;
  type: 'select' | 'input';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
}

interface TabConfig {
  id: string;
  label: string;
  columns: ColumnDef[];
  filters?: TabFilterConfig[];
  requiresCicloAnterior?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Tab Configurations                                                 */
/* ------------------------------------------------------------------ */
const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'actividad-academica',
    label: 'Actividad Academica',
    columns: [
      { key: '_index', label: 'N.' },
      { key: 'facultad', label: 'Facultad' },
      { key: 'programa', label: 'Programa' },
      { key: 'dedicacion', label: 'Dedicacion' },
      { key: 'cedula', label: 'Cedula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'actividad_academica', label: 'Actividad Academica' },
      { key: 'nivel_formacion', label: 'Nivel Formacion' },
    ],
    filters: [
      {
        key: 'actividad',
        label: 'Actividad',
        type: 'select',
        options: [
          { value: '', label: 'Todas las actividades' },
          { value: 'PROFESOR', label: 'Profesor' },
          { value: 'PROFESOR INVESTIGADOR', label: 'Profesor Investigador' },
          { value: 'JEFE DE AREA', label: 'Jefe de Area' },
          { value: 'COORDINADOR', label: 'Coordinador' },
          { value: 'PROF. PRACTICA CLINICA', label: 'Prof. Practica Clinica' },
        ],
      },
    ],
  },
  {
    id: 'dedicacion',
    label: 'Dedicacion',
    columns: [
      { key: '_index', label: 'N.' },
      { key: 'facultad', label: 'Facultad' },
      { key: 'programa', label: 'Programa' },
      { key: 'cedula', label: 'Cedula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'dedicacion', label: 'Dedicacion' },
      { key: 'actividad', label: 'Actividad' },
    ],
    filters: [
      {
        key: 'dedicacion',
        label: 'Dedicacion',
        type: 'select',
        options: [
          { value: '', label: 'Todas las dedicaciones' },
          { value: 'Tiempo Completo', label: 'Tiempo Completo' },
          { value: 'Medio Tiempo', label: 'Medio Tiempo' },
          { value: 'Catedratico', label: 'Catedratico' },
        ],
      },
    ],
  },
  {
    id: 'nivel-formacion',
    label: 'Nivel Formacion',
    columns: [
      { key: '_index', label: 'N.' },
      { key: 'facultad', label: 'Facultad' },
      { key: 'programa', label: 'Programa' },
      { key: 'cedula', label: 'Cedula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'nivel_formacion', label: 'Nivel Formacion' },
      { key: 'titulo', label: 'Titulo' },
      { key: 'dedicacion', label: 'Dedicacion' },
    ],
    filters: [
      {
        key: 'nivel',
        label: 'Nivel',
        type: 'select',
        options: [
          { value: '', label: 'Todos los niveles' },
          { value: 'Universitaria', label: 'Universitaria' },
          { value: 'Especializacion', label: 'Especializacion' },
          { value: 'Maestria', label: 'Maestria' },
          { value: 'Doctorado', label: 'Doctorado' },
          { value: 'Posdoctorado', label: 'Posdoctorado' },
        ],
      },
    ],
  },
  {
    id: 'profesores-asignaturas',
    label: 'Profesores x Asig.',
    columns: [
      { key: 'facultad', label: 'Facultad' },
      { key: 'org_academica', label: 'Org Academica' },
      { key: 'dedicacion', label: 'Dedicacion' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'instructor_id', label: 'ID Instructor' },
      { key: 'nro_clase', label: 'N. Clase' },
      { key: 'catalogo', label: 'Catalogo' },
      { key: 'asignatura', label: 'Asignatura' },
      { key: 'hrs_semanal', label: 'Hrs Semanal', align: 'right' },
      { key: 'hrs_semestre', label: 'Hrs Semestre', align: 'right' },
    ],
    filters: [
      {
        key: 'programa',
        label: 'Programa',
        type: 'input',
        placeholder: 'Filtrar por programa...',
      },
      {
        key: 'grado',
        label: 'Grado',
        type: 'input',
        placeholder: 'Filtrar por grado...',
      },
    ],
  },
  {
    id: 'planta-profesoral',
    label: 'Planta Profesoral',
    columns: [
      { key: 'facultad', label: 'Facultad' },
      { key: 'programa', label: 'Programa' },
      { key: 'instructor_id', label: 'Instructor ID' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'dedicacion', label: 'Dedicacion' },
      { key: 'actividad_academica', label: 'Actividad Academica' },
      { key: 'fecha_inicial', label: 'F.Inicial' },
      { key: 'fecha_final', label: 'F.Final' },
    ],
    filters: [
      {
        key: 'dedicacion',
        label: 'Dedicacion',
        type: 'select',
        options: [
          { value: '', label: 'Todas las dedicaciones' },
          { value: 'Tiempo Completo', label: 'Tiempo Completo' },
          { value: 'Medio Tiempo', label: 'Medio Tiempo' },
          { value: 'Catedratico', label: 'Catedratico' },
        ],
      },
      {
        key: 'actividad',
        label: 'Actividad',
        type: 'input',
        placeholder: 'Filtrar por actividad...',
      },
    ],
  },
  {
    id: 'horas-docentes',
    label: 'Horas Docentes',
    columns: [
      { key: 'instructor_id', label: 'Instructor ID' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'fecha_inicial', label: 'F.Inicial' },
      { key: 'fecha_final', label: 'F.Final' },
      { key: 'hrs_semanal_total', label: 'Hrs Semanal Total', align: 'right' },
      { key: 'hrs_semestre_total', label: 'Hrs Semestre Total', align: 'right' },
    ],
  },
  {
    id: 'escala-salarial',
    label: 'Escala Salarial',
    columns: [
      { key: 'programa', label: 'Programa' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'dedicacion', label: 'Dedicacion' },
      { key: 'contrato', label: 'Contrato' },
      { key: 'tipo_escala', label: 'Tipo Escala' },
      { key: 'calificacion', label: 'Calificacion' },
      { key: 'categoria', label: 'Categoria' },
    ],
  },
  {
    id: 'nuevas-plazas',
    label: 'Nuevas Plazas',
    columns: [
      { key: '_index', label: 'N.' },
      { key: 'facultad', label: 'Facultad' },
      { key: 'programa', label: 'Programa' },
      { key: 'dedicacion', label: 'Dedicacion' },
      { key: 'cedula', label: 'Cedula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'actividad', label: 'Actividad' },
    ],
    requiresCicloAnterior: true,
  },
  {
    id: 'reemplazos',
    label: 'Reemplazos',
    columns: [
      { key: '_index', label: 'N.' },
      { key: 'facultad', label: 'Facultad' },
      { key: 'programa', label: 'Programa' },
      { key: 'dedicacion', label: 'Dedicacion' },
      { key: 'cedula', label: 'Cedula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'actividad', label: 'Actividad' },
    ],
  },
  {
    id: 'no-continuan',
    label: 'No Continuan',
    columns: [
      { key: '_index', label: 'N.' },
      { key: 'facultad', label: 'Facultad' },
      { key: 'programa', label: 'Programa' },
      { key: 'cedula', label: 'Cedula' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'actividad', label: 'Actividad' },
      { key: '_no_continua', label: 'Continua?' },
    ],
    requiresCicloAnterior: true,
    filters: [
      {
        key: 'actividad',
        label: 'Actividad',
        type: 'input',
        placeholder: 'Filtrar por actividad...',
      },
    ],
  },
];

const TABS = TAB_CONFIGS.map((t) => ({ id: t.id, label: t.label }));

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getCellValue(row: Record<string, unknown>, col: ColumnDef, rowIndex: number): string {
  if (col.key === '_index') return String(rowIndex + 1);
  if (col.key === '_no_continua') return 'NO';
  const val = row[col.key];
  if (val == null || val === '') return '-';
  return String(val);
}

/* ------------------------------------------------------------------ */
/*  Dedicacion summary component                                       */
/* ------------------------------------------------------------------ */
function DedicacionSummary({ data }: { data: Record<string, unknown>[] }) {
  const counts: Record<string, number> = {};
  for (const row of data) {
    const ded = String(row.dedicacion ?? 'Sin dedicacion');
    counts[ded] = (counts[ded] ?? 0) + 1;
  }

  if (Object.keys(counts).length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      {Object.entries(counts).map(([label, count]) => (
        <div
          key={label}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
        >
          <Badge variant="primary" size="sm">{count}</Badge>
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 bg-[#1e3a5f]/5 border border-[#1e3a5f]/20 rounded-lg px-3 py-2">
        <Badge variant="info" size="sm">{data.length}</Badge>
        <span className="text-sm font-medium text-[#1e3a5f]">Total</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function ReportesPage() {
  const [activeTab, setActiveTab] = useState(TAB_CONFIGS[0].id);
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    periodo: '',
    campus: [],
    facultad: '',
  });
  const [tabFilters, setTabFilters] = useState<Record<string, Record<string, string>>>({});
  const [cicloAnterior, setCicloAnterior] = useState('');

  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  /* ---- Dynamic campus options from API ---- */
  const [campusList, setCampusList] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    async function fetchCampus() {
      try {
        const res = await fetch('/api/ciclos');
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json.campus)) setCampusList(json.campus);
      } catch {
        /* silent */
      }
    }
    fetchCampus();
  }, []);

  const currentConfig = TAB_CONFIGS.find((t) => t.id === activeTab)!;
  const currentTabFilters = tabFilters[activeTab] ?? {};

  /* ---- build query params ---- */
  const buildParams = useCallback(
    (page = 1, limit = pagination.limit, forExport = false) => {
      const params = new URLSearchParams();
      params.set('tipo', activeTab);
      params.set('page', String(page));
      params.set('limit', String(limit));

      if (globalFilters.periodo) params.set('periodo', globalFilters.periodo);
      if (globalFilters.campus.length > 0) params.set('campus', globalFilters.campus.join(','));
      if (globalFilters.facultad) params.set('facultad', globalFilters.facultad);

      const tabF = tabFilters[activeTab] ?? {};
      for (const [k, v] of Object.entries(tabF)) {
        if (v) params.set(k, v);
      }

      if (currentConfig.requiresCicloAnterior && cicloAnterior) {
        params.set('ciclo_anterior', cicloAnterior);
        if (globalFilters.periodo) {
          params.set('ciclo_actual', globalFilters.periodo);
        }
      }

      if (forExport) params.set('export', 'true');

      return params;
    },
    [activeTab, globalFilters, tabFilters, cicloAnterior, pagination.limit, currentConfig.requiresCicloAnterior],
  );

  /* ---- fetch ---- */
  const fetchReport = useCallback(
    async (page = 1, limit = pagination.limit) => {
      setLoading(true);
      setError('');
      try {
        const params = buildParams(page, limit);
        const res = await fetch(`/api/reportes?${params}`);
        if (!res.ok) throw new Error('Error al cargar el reporte');
        const json = await res.json();
        setData(json.data ?? []);
        setPagination(
          json.pagination ?? { page, limit, total: 0, totalPages: 0 },
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [buildParams, pagination.limit],
  );

  useEffect(() => {
    fetchReport(1);
  }, [fetchReport]);

  /* ---- export ---- */
  async function handleExport() {
    setExporting(true);
    try {
      const params = buildParams(1, pagination.limit, true);
      const res = await fetch(`/api/reportes?${params}`);
      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${activeTab}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError('Error al exportar el reporte');
    } finally {
      setExporting(false);
    }
  }

  /* ---- filter helpers ---- */
  function updateGlobalFilter<K extends keyof GlobalFilters>(
    key: K,
    value: GlobalFilters[K],
  ) {
    setGlobalFilters((prev) => ({ ...prev, [key]: value }));
  }

  function updateTabFilter(key: string, value: string) {
    setTabFilters((prev) => ({
      ...prev,
      [activeTab]: { ...(prev[activeTab] ?? {}), [key]: value },
    }));
  }

  function handleTabChange(tabId: string) {
    setActiveTab(tabId);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  const tabsContainerRef = useRef<HTMLDivElement>(null);

  /* ================================================================ */
  /*  JSX                                                              */
  /* ================================================================ */
  return (
    <div className="p-6 max-w-full bg-zinc-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900">Reportes</h1>
            <p className="text-sm text-zinc-600 mt-2">
              Centro de reportes y estadisticas del sistema academico
            </p>
          </div>
        </div>
      </div>

      {/* Global Filters Card */}
      <Card padding="none" className="mb-6 ring-1 ring-zinc-200 rounded-xl bg-white">
        <div className="p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Filtros Globales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Periodo / Ciclo"
              placeholder="Ej: 2025-1"
              value={globalFilters.periodo}
              onChange={(e) => updateGlobalFilter('periodo', e.target.value)}
            />
            <MultiSelect
              label="Campus"
              value={globalFilters.campus}
              onChange={(vals) => updateGlobalFilter('campus', vals)}
              options={campusList}
              placeholder="Todos los campus"
              searchPlaceholder="Buscar campus..."
            />
            <Input
              label="Facultad"
              placeholder="Filtrar por facultad..."
              value={globalFilters.facultad}
              onChange={(e) => updateGlobalFilter('facultad', e.target.value)}
            />
          </div>

          {/* Ciclo Anterior — only for tabs that require it */}
          {currentConfig.requiresCicloAnterior && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <h3 className="text-sm font-medium text-zinc-700 mb-3">Requerido para este reporte</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Ciclo Anterior"
                  placeholder="Ej: 2024-2"
                  value={cicloAnterior}
                  onChange={(e) => setCicloAnterior(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Info Banner */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/50 px-4 py-3 text-blue-900">
        <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <p className="text-sm">
          Algunos campos pueden aparecer vacios. Importe Docentes_IES (SNIES) para completar datos de dedicacion, actividad academica y nivel de formacion.
        </p>
      </div>

      {/* Main Content Card */}
      <Card padding="none" className="ring-1 ring-zinc-200 rounded-xl overflow-hidden">
        {/* Tabs Section with Scrollable Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-6">
            {/* Scrollable Tabs Container */}
            <div
              ref={tabsContainerRef}
              className="overflow-x-auto flex-1 -mx-6 px-6"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="inline-flex gap-0 min-w-full md:min-w-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${
                        activeTab === tab.id
                          ? 'border-indigo-600 text-indigo-600'
                          : 'border-transparent text-zinc-600 hover:text-zinc-900'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Button in Tab Bar */}
            <div className="ml-4 shrink-0 border-l border-zinc-200 pl-4">
              <Button
                variant="secondary"
                size="sm"
                loading={exporting}
                onClick={handleExport}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                }
              >
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Per-tab Filters */}
        {currentConfig.filters && currentConfig.filters.length > 0 && (
          <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50">
            <h3 className="text-sm font-semibold text-zinc-900 mb-3">Filtros del reporte</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentConfig.filters.map((filter) =>
                filter.type === 'select' ? (
                  <Select
                    key={filter.key}
                    label={filter.label}
                    value={currentTabFilters[filter.key] ?? ''}
                    onChange={(e) => updateTabFilter(filter.key, e.target.value)}
                    options={filter.options ?? []}
                  />
                ) : (
                  <Input
                    key={filter.key}
                    label={filter.label}
                    placeholder={filter.placeholder}
                    value={currentTabFilters[filter.key] ?? ''}
                    onChange={(e) => updateTabFilter(filter.key, e.target.value)}
                  />
                ),
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6">
          {/* Dedicacion summary — only for the "dedicacion" tab */}
          {activeTab === 'dedicacion' && !loading && data.length > 0 && (
            <DedicacionSummary data={data} />
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="animate-spin h-8 w-8 text-indigo-600 mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-zinc-600">Cargando reporte...</span>
            </div>
          ) : data.length === 0 ? (
            <EmptyState
              title="Sin datos para mostrar"
              description="No se encontraron registros con los filtros actuales. Ajuste los criterios de busqueda o seleccione un periodo diferente."
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Zm3.75 11.625a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              }
            />
          ) : (
            <>
              {/* Table Wrapper */}
              <div className="rounded-xl ring-1 ring-zinc-950/5 overflow-x-auto bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50">
                      {currentConfig.columns.map((col) => (
                        <TableHeaderCell
                          key={col.key}
                          className={`text-xs font-semibold text-zinc-900 ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                          }`}
                        >
                          {col.label}
                        </TableHeaderCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((row, rowIdx) => (
                      <TableRow key={rowIdx} className="hover:bg-zinc-50/50">
                        {currentConfig.columns.map((col) => {
                          const value = getCellValue(row, col, (pagination.page - 1) * pagination.limit + rowIdx);

                          return (
                            <TableCell
                              key={col.key}
                              className={`text-sm ${
                                col.align === 'right' ? 'text-right tabular-nums' : ''
                              } ${col.align === 'center' ? 'text-center' : ''} ${
                                col.key === '_no_continua' ? 'font-semibold text-red-600' : ''
                              } ${col.key === 'nombre' ? 'font-medium text-zinc-900' : 'text-zinc-700'}`}
                            >
                              {col.key === 'dedicacion' ? (
                                <Badge
                                  variant={
                                    value === 'Tiempo Completo'
                                      ? 'info'
                                      : value === 'Medio Tiempo'
                                        ? 'warning'
                                        : value === 'Catedratico'
                                          ? 'neutral'
                                          : 'primary'
                                  }
                                  size="sm"
                                >
                                  {value}
                                </Badge>
                              ) : col.key === 'actividad_academica' || col.key === 'actividad' ? (
                                <Badge variant="primary" size="sm">
                                  {value}
                                </Badge>
                              ) : col.key === 'nivel_formacion' ? (
                                <Badge
                                  variant={
                                    value === 'Doctorado' || value === 'Posdoctorado'
                                      ? 'success'
                                      : value === 'Maestria'
                                        ? 'info'
                                        : value === 'Especializacion'
                                          ? 'warning'
                                          : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {value}
                                </Badge>
                              ) : (
                                value
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Footer with pagination and stats */}
              <div className="mt-6 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-xs font-medium text-zinc-600">
                    <span className="text-zinc-900">{pagination.total.toLocaleString('es-CO')}</span> registros encontrados
                    {globalFilters.periodo && (
                      <> &middot; Periodo: <span className="font-semibold text-zinc-900">{globalFilters.periodo}</span></>
                    )}
                  </p>
                  <Pagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={(p) => fetchReport(p)}
                    limit={pagination.limit}
                    onLimitChange={(l) => fetchReport(1, l)}
                    total={pagination.total}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
