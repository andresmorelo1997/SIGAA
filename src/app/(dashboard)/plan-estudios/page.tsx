'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Tabs, Badge, StatCard, Modal } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PlanEstudio {
  id: number;
  programa_academico: string;
  grado: string;
  modalidad: string;
  cohorte: string;
  semestre: string;
  clase: string;
  catalogo: string;
  asignatura: string;
  componente: string;
  atrib_curso: string;
  fecha_inicial: string;
  fecha_final: string;
  total_hrs_curso: number;
  hrs_semanal: number;
  hrs_semestre: number;
  inscritos: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ValidacionDetalle {
  catalogo: string;
  asignatura_plan: string;
  creditos: number;
  hrs_plan: number;
  hrs_carga: number | null;
  docente: string | null;
  estado: 'ok' | 'sin_carga' | 'diferencia_horas';
}

interface ValidacionResumen {
  total_asignaturas: number;
  con_carga: number;
  sin_carga: number;
  con_diferencia_horas: number;
  docentes_asignados: number;
  programadas_fuera_del_plan?: number;
}

interface ProgramadaNoEnPlan {
  catalogo: string;
  descripcion: string | null;
  nombre_instructor: string | null;
  hrs_semestre: number | null;
  ciclo_lectivo: string | null;
}

interface ValidacionData {
  programa: string;
  plan_entries: PlanEstudio[];
  resumen: ValidacionResumen;
  detalle: ValidacionDetalle[];
  programadas_no_en_plan?: ProgramadaNoEnPlan[];
}

type EditingCell = { id: number; field: keyof PlanEstudio } | null;

const GRADO_OPTIONS = ['PREG', 'POSG', 'ESP', 'MSTR', 'DOCT'];

/* ------------------------------------------------------------------ */
/* Semester sort helper                                                */
/* ------------------------------------------------------------------ */
const ROMAN_ORDER: Record<string, number> = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
  'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
  'XI': 11, 'XII': 12,
};

function semesterSortKey(s: string): number {
  const match = s.match(/^([IVXLC]+)/);
  if (match) return ROMAN_ORDER[match[1]] ?? 99;
  return 99;
}

/* ------------------------------------------------------------------ */
/*  Icons (inline SVGs)                                                */
/* ------------------------------------------------------------------ */
function IconBook() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}
function IconAcademic() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}
function IconWarning() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}
function IconX() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 text-zinc-600 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}
function IconPrinter() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
    </svg>
  );
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
export default function PlanEstudiosPage() {
  /* ---- state ---- */
  const [activeTab, setActiveTab] = useState('plan');
  const [data, setData] = useState<PlanEstudio[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 500, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [programas, setProgramas] = useState<string[]>([]);
  /** Map programa code → full human-readable name (from /api/programas). */
  const [programaNombres, setProgramaNombres] = useState<Record<string, string>>({});
  const [filterPrograma, setFilterPrograma] = useState('');
  const [filterGrado, setFilterGrado] = useState('');

  const [collapsedSemesters, setCollapsedSemesters] = useState<Set<string>>(new Set());

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation state
  const [validacionData, setValidacionData] = useState<ValidacionData | null>(null);
  const [validacionLoading, setValidacionLoading] = useState(false);

  /* ---- fetch programas list ---- */
  const fetchProgramas = useCallback(async () => {
    try {
      const res = await fetch('/api/plan-estudios?limit=9999');
      if (!res.ok) return;
      const json = await res.json();
      const allRows = json.data ?? [];
      const unique = Array.from(new Set(allRows.map((r: PlanEstudio) => r.programa_academico).filter(Boolean))) as string[];
      unique.sort();
      setProgramas(unique);
      // Auto-select first programa if none selected
      if (!filterPrograma && unique.length > 0) {
        setFilterPrograma(unique[0]);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchProgramas(); }, [fetchProgramas]);

  /* ---- fetch programa full names (code → nombre) ---- */
  useEffect(() => {
    async function loadProgramaNames() {
      try {
        const res = await fetch('/api/programas?limit=9999');
        if (!res.ok) return;
        const json = await res.json();
        const map: Record<string, string> = {};
        for (const p of json.data ?? []) {
          if (p.codigo && p.nombre) map[p.codigo] = p.nombre;
        }
        setProgramaNombres(map);
      } catch { /* ignore */ }
    }
    loadProgramaNames();
  }, []);

  /* ---- fetch plan data ---- */
  const fetchData = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filterPrograma) params.set('programa', filterPrograma);
      if (filterGrado) params.set('grado', filterGrado);
      params.set('page', String(page));
      params.set('limit', '500');

      const res = await fetch(`/api/plan-estudios?${params}`);
      if (!res.ok) throw new Error('Error al cargar datos');
      const json = await res.json();
      setData(json.data ?? []);
      setPagination(json.pagination ?? { page, limit: 500, total: 0, totalPages: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [filterPrograma, filterGrado]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  /* ---- fetch validacion ---- */
  const fetchValidacion = useCallback(async () => {
    if (!filterPrograma) {
      setValidacionData(null);
      return;
    }
    setValidacionLoading(true);
    try {
      const params = new URLSearchParams({ programa: filterPrograma });
      const res = await fetch(`/api/plan-estudios/validar?${params}`);
      if (!res.ok) throw new Error('Error al cargar validacion');
      const json = await res.json();
      setValidacionData(json);
    } catch {
      setValidacionData(null);
    } finally {
      setValidacionLoading(false);
    }
  }, [filterPrograma]);

  useEffect(() => {
    if (activeTab === 'validacion') fetchValidacion();
  }, [activeTab, fetchValidacion]);

  /* ---- group by semester ---- */
  const grouped = data.reduce<Record<string, PlanEstudio[]>>((acc, row) => {
    const key = row.semestre || 'Sin Semestre';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const sortedSemesters = Object.keys(grouped).sort((a, b) => semesterSortKey(a) - semesterSortKey(b));

  function toggleSemester(s: string) {
    setCollapsedSemesters(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  /* ---- inline edit ---- */
  function startEdit(id: number, field: keyof PlanEstudio, currentValue: string | number) {
    setEditingCell({ id, field });
    setEditValue(String(currentValue ?? ''));
    setTimeout(() => editRef.current?.focus(), 0);
  }

  async function saveEdit() {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const isNumber = ['total_hrs_curso', 'hrs_semanal', 'hrs_semestre', 'inscritos'].includes(field);
    const value = isNumber ? parseFloat(editValue) || 0 : editValue;

    try {
      const res = await fetch('/api/plan-estudios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setData(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
    } catch {
      setError('Error al guardar cambio');
    }
    setEditingCell(null);
  }

  /* ---- summary calculations ---- */
  const totalAsignaturas = data.length;
  const totalCreditos = data.reduce((s, r) => s + (Number(r.total_hrs_curso) || 0), 0);
  const totalHrsSemestre = data.reduce((s, r) => s + (Number(r.hrs_semestre) || 0), 0);
  const uniqueSemesters = sortedSemesters.length;

  // Get cohorte / plan info
  const cohorteInfo = data.length > 0 ? data[0].cohorte : '';
  // Prefer the full human-readable name from /api/programas, falling back to
  // modalidad (legacy) and then the program code.
  const programaCodigo = data.length > 0 ? data[0].programa_academico : filterPrograma;
  const programaFullName =
    programaNombres[programaCodigo] ||
    (data.length > 0 ? data[0].modalidad || data[0].programa_academico : programaCodigo);
  const gradoInfo = data.length > 0 ? data[0].grado : '';

  /* ---- export ---- */
  function handleExport() {
    const headers = ['Catalogo', 'Asignatura', 'Semestre', 'Creditos', 'Hrs Semanal', 'Hrs Semestre', 'Atrib Curso'];
    const rows = data.map(r => [r.catalogo, r.asignatura, r.semestre, r.total_hrs_curso, r.hrs_semanal, r.hrs_semestre, r.atrib_curso]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan_estudios_${filterPrograma || 'todos'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---- import ---- */
  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/carga-academica/import', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al importar');
      setImportResult(`Importacion exitosa: ${json.totalInserted} insertados, ${json.totalUpdated} actualizados`);
      fetchData(1);
      fetchProgramas();
    } catch (err) {
      setImportResult(err instanceof Error ? err.message : 'Error al importar');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /* ---- print ---- */
  function handlePrint() {
    window.print();
  }

  /* ---- render helpers ---- */
  function renderEditableCell(row: PlanEstudio, field: keyof PlanEstudio, isNumber = false) {
    const isEditing = editingCell?.id === row.id && editingCell?.field === field;
    const value = row[field];

    if (isEditing) {
      return (
        <input
          ref={editRef}
          type={isNumber ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingCell(null); }}
          className="w-full px-2 py-1 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          step={isNumber ? 'any' : undefined}
        />
      );
    }

    return (
      <span
        onClick={() => startEdit(row.id, field, value)}
        className="block w-full cursor-pointer hover:bg-unisinu-50/50 rounded px-1 py-0.5 transition-colors text-sm"
        title="Clic para editar"
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
      {/* ── Print-friendly styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .plan-print-area, .plan-print-area * { visibility: visible; }
          .plan-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          table { font-size: 10px; }
          th, td { padding: 4px 8px !important; }
        }
      `}</style>

      {/* ── Header Section ── */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Plan de Estudios</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Revision de carga academica por planes de estudio
          </p>
        </div>
        <div className="flex items-center gap-2 mt-4 sm:mt-0 flex-wrap">
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-700 bg-white ring-1 ring-zinc-200 rounded-lg hover:bg-white transition-colors">
            <IconPrinter /> Imprimir
          </button>
          <button onClick={handleExport} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-zinc-700 bg-white ring-1 ring-zinc-200 rounded-lg hover:bg-white transition-colors">
            <IconDownload /> Exportar
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#2a4d7a] transition-colors"
          >
            <IconUpload /> Importar Plan
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="no-print bg-white rounded-xl border border-zinc-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Programa Academico</label>
            <select
              value={filterPrograma}
              onChange={(e) => setFilterPrograma(e.target.value)}
              className="w-full px-3 py-2 text-sm ring-1 ring-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-unisinu-600 bg-white"
            >
              <option value="">Todos los programas</option>
              {programas.map(p => (
                <option key={p} value={p}>
                  {programaNombres[p] ? `${p} — ${programaNombres[p]}` : p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Grado</label>
            <select
              value={filterGrado}
              onChange={(e) => setFilterGrado(e.target.value)}
              className="w-full px-3 py-2 text-sm ring-1 ring-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-unisinu-600 bg-white"
            >
              <option value="">Todos los grados</option>
              {GRADO_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {filterPrograma && cohorteInfo && (
              <div className="text-sm text-zinc-600">
                <span className="font-medium text-[#1e3a5f]">Plan:</span> {cohorteInfo}
                {gradoInfo && <> &middot; <Badge variant="primary" size="sm">{gradoInfo}</Badge></>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="no-print mb-6">
        <Tabs
          tabs={[
            { id: 'plan', label: 'Plan Academico', count: totalAsignaturas },
            { id: 'validacion', label: 'Validacion de Carga' },
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="no-print mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <IconWarning />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <IconX />
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/*  TAB: Plan Academico                                             */}
      {/* ================================================================ */}
      {activeTab === 'plan' && (
        <div className="plan-print-area">
          {/* ── Print Header ── */}
          <div className="hidden print:block mb-6 text-center">
            <p className="text-xs text-zinc-600 mb-1">Universidad del Sinu - Elias Bechara Zainum</p>
            <h2 className="text-lg font-bold text-[#1e3a5f]">PLAN ACADEMICO</h2>
            {filterPrograma && (
              <p className="text-sm mt-1">
                {programaFullName} ({filterPrograma}) &middot; Plan: {cohorteInfo} &middot; Grado: {gradoInfo}
              </p>
            )}
          </div>

          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 no-print">
            <StatCard label="Total Asignaturas" value={totalAsignaturas} icon={<IconBook />} color="primary" />
            <StatCard label="Total Creditos" value={totalCreditos} icon={<IconAcademic />} color="success" />
            <StatCard label="Hrs Semestre" value={totalHrsSemestre} icon={<IconClock />} color="warning" />
            <StatCard label="Semestres" value={uniqueSemesters} icon={<IconUsers />} color="neutral" />
          </div>

          {/* ── Program Info Bar ── */}
          {filterPrograma && data.length > 0 && (
            <div className="bg-[#1e3a5f]/5 border border-[#1e3a5f]/10 rounded-xl p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <p className="text-xs text-zinc-600">Programa</p>
                  <p className="text-sm font-semibold text-[#1e3a5f]">{programaFullName || filterPrograma}</p>
                </div>
                <div className="w-px h-8 bg-gray-300 hidden sm:block" />
                <div>
                  <p className="text-xs text-zinc-600">Codigo</p>
                  <p className="text-sm font-semibold text-[#1e3a5f]">{filterPrograma}</p>
                </div>
                <div className="w-px h-8 bg-gray-300 hidden sm:block" />
                <div>
                  <p className="text-xs text-zinc-600">Plan / Cohorte</p>
                  <p className="text-sm font-semibold text-[#1e3a5f]">{cohorteInfo || '-'}</p>
                </div>
                <div className="w-px h-8 bg-gray-300 hidden sm:block" />
                <div>
                  <p className="text-xs text-zinc-600">Grado</p>
                  <Badge variant="primary" size="sm">{gradoInfo || '-'}</Badge>
                </div>
              </div>
            </div>
          )}

          {/* ── Main Content: Semester Groups ── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin h-8 w-8 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-3 text-zinc-600">Cargando plan de estudios...</span>
            </div>
          ) : data.length === 0 ? (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center py-20 text-zinc-400">
              <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
              <p className="text-lg font-medium">No se encontraron registros</p>
              <p className="text-sm mt-1">Seleccione un programa o importe un archivo de Plan de Estudio</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSemesters.map((semester) => {
                const rows = grouped[semester];
                const isOpen = !collapsedSemesters.has(semester);
                const semCreditos = rows.reduce((s, r) => s + (Number(r.total_hrs_curso) || 0), 0);
                const semHrsSemanal = rows.reduce((s, r) => s + (Number(r.hrs_semanal) || 0), 0);
                const semHrsSemestre = rows.reduce((s, r) => s + (Number(r.hrs_semestre) || 0), 0);

                return (
                  <div key={semester} className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                    {/* Semester Header */}
                    <button
                      onClick={() => toggleSemester(semester)}
                      className="w-full flex items-center justify-between px-5 py-3 bg-white hover:bg-zinc-100 transition-colors cursor-pointer no-print"
                    >
                      <div className="flex items-center gap-3">
                        <IconChevron open={isOpen} />
                        <span className="font-semibold text-[#1e3a5f] text-sm">{semester}</span>
                        <Badge variant="neutral" size="sm">{rows.length} asignaturas</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-600">
                        <span>{semCreditos} creditos</span>
                        <span>{semHrsSemestre} hrs/sem</span>
                      </div>
                    </button>
                    {/* Print: always show header */}
                    <div className="hidden print:flex items-center justify-between px-5 py-2 bg-white border-b">
                      <span className="font-semibold text-[#1e3a5f] text-sm">{semester}</span>
                      <span className="text-xs text-zinc-600">{rows.length} asignaturas</span>
                    </div>

                    {/* Semester Table */}
                    {(isOpen || true) && (
                      <div className={`overflow-x-auto ${!isOpen ? 'hidden print:block' : ''}`}>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-zinc-200">
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[110px]">Catalogo</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50">Asignatura</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[90px]">Creditos</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[100px]">Hrs Semanal</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[110px]">Hrs Semestre</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[100px]">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.id} className="border-b border-zinc-200 hover:bg-unisinu-50/30 transition-colors">
                                <td className="px-4 py-2">
                                  <span className="text-sm font-mono text-zinc-700">{row.catalogo}</span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className="text-sm text-gray-800">{row.asignatura}</span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {renderEditableCell(row, 'total_hrs_curso', true)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {renderEditableCell(row, 'hrs_semanal', true)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {renderEditableCell(row, 'hrs_semestre', true)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {row.atrib_curso ? (
                                    <Badge variant={row.atrib_curso === 'A' ? 'success' : 'neutral'} size="sm">
                                      {row.atrib_curso}
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {/* Subtotal row */}
                          <tfoot>
                            <tr className="bg-white border-t-2 border-zinc-200 font-semibold text-sm">
                              <td className="px-4 py-2.5 text-zinc-700" colSpan={2}>
                                Total {semester}
                              </td>
                              <td className="px-4 py-2.5 text-center text-[#1e3a5f]">{semCreditos}</td>
                              <td className="px-4 py-2.5 text-center text-[#1e3a5f]">{semHrsSemanal.toFixed(1)}</td>
                              <td className="px-4 py-2.5 text-center text-[#1e3a5f]">{semHrsSemestre}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* ── Total General ── */}
              <div className="bg-[#1e3a5f] text-white rounded-xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <span className="text-lg font-bold">Total General</span>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center">
                      <p className="text-white/60 text-xs">Asignaturas</p>
                      <p className="text-xl font-bold">{totalAsignaturas}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">Creditos</p>
                      <p className="text-xl font-bold">{totalCreditos}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">Hrs Semanal</p>
                      <p className="text-xl font-bold">{data.reduce((s, r) => s + (Number(r.hrs_semanal) || 0), 0).toFixed(1)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-xs">Hrs Semestre</p>
                      <p className="text-xl font-bold">{totalHrsSemestre}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Pagination ── */}
          {pagination.totalPages > 1 && (
            <div className="no-print flex items-center justify-between px-2 py-4 mt-4">
              <p className="text-sm text-zinc-600">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchData(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm ring-1 ring-zinc-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => fetchData(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm ring-1 ring-zinc-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  TAB: Validacion de Carga                                        */}
      {/* ================================================================ */}
      {activeTab === 'validacion' && (
        <div>
          {!filterPrograma ? (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center py-20 text-zinc-400">
              <IconAcademic />
              <p className="text-lg font-medium mt-4">Seleccione un programa</p>
              <p className="text-sm mt-1">Elija un programa academico en el filtro para ver la validacion</p>
            </div>
          ) : validacionLoading ? (
            <div className="flex items-center justify-center py-20">
              <svg className="animate-spin h-8 w-8 text-[#1e3a5f]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="ml-3 text-zinc-600">Validando carga academica...</span>
            </div>
          ) : validacionData ? (
            <div className="space-y-6">
              {/* Resumen cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                  label="Total Asignaturas"
                  value={validacionData.resumen.total_asignaturas}
                  icon={<IconBook />}
                  color="primary"
                />
                <StatCard
                  label="Con Carga"
                  value={validacionData.resumen.con_carga}
                  icon={<IconCheck />}
                  color="success"
                />
                <StatCard
                  label="Sin Carga"
                  value={validacionData.resumen.sin_carga}
                  icon={<IconX />}
                  color="danger"
                />
                <StatCard
                  label="Diferencia Horas"
                  value={validacionData.resumen.con_diferencia_horas}
                  icon={<IconWarning />}
                  color="warning"
                />
                <StatCard
                  label="Docentes Asignados"
                  value={validacionData.resumen.docentes_asignados}
                  icon={<IconUsers />}
                  color="neutral"
                />
              </div>

              {/* Detalle table */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-white border-b border-zinc-200">
                  <h3 className="font-semibold text-[#1e3a5f] text-sm">Detalle de Validacion - {filterPrograma}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[100px]">Catalogo</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50">Asignatura (Plan)</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[80px]">Creditos</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[90px]">Hrs Plan</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[90px]">Hrs Carga</th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[200px]">Docente Asignado</th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-white/50 w-[100px]">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validacionData.detalle.map((item, idx) => (
                        <tr key={`${item.catalogo}-${idx}`} className="border-b border-zinc-200 hover:bg-white transition-colors">
                          <td className="px-4 py-2">
                            <span className="text-sm font-mono text-zinc-700">{item.catalogo}</span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm text-gray-800">{item.asignatura_plan}</span>
                          </td>
                          <td className="px-4 py-2 text-center text-sm text-zinc-700">{item.creditos}</td>
                          <td className="px-4 py-2 text-center text-sm text-zinc-700">{item.hrs_plan}</td>
                          <td className="px-4 py-2 text-center text-sm">
                            {item.hrs_carga != null ? (
                              <span className={item.estado === 'diferencia_horas' ? 'text-amber-600 font-medium' : 'text-zinc-700'}>
                                {item.hrs_carga}
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-sm text-zinc-700 truncate block max-w-[200px]" title={item.docente ?? ''}>
                              {item.docente || <span className="text-gray-300">Sin asignar</span>}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {item.estado === 'ok' && (
                              <Badge variant="success" size="sm" dot>Correcto</Badge>
                            )}
                            {item.estado === 'diferencia_horas' && (
                              <Badge variant="warning" size="sm" dot>Diferencia</Badge>
                            )}
                            {item.estado === 'sin_carga' && (
                              <Badge variant="danger" size="sm" dot>Sin carga</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {validacionData.detalle.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
                    <p className="text-sm">No hay datos de validacion</p>
                  </div>
                )}
              </div>

              {/* Sección: Programadas fuera del plan */}
              {validacionData.programadas_no_en_plan &&
               validacionData.programadas_no_en_plan.length > 0 && (
                <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden mt-6">
                  <div className="px-6 py-4 bg-amber-50 border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                      </svg>
                      <h3 className="text-base font-semibold text-amber-900">
                        Programadas fuera del plan ({validacionData.programadas_no_en_plan.length})
                      </h3>
                    </div>
                    <p className="text-xs text-amber-800 mt-1">
                      Estas asignaturas están programadas en carga académica con catálogo similar al del programa, pero no aparecen en el plan de estudios.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 border-b border-zinc-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">Catálogo</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">Descripción</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">Docente</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-700 uppercase tracking-wider">Hrs Sem</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-700 uppercase tracking-wider">Ciclo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {validacionData.programadas_no_en_plan.map((row, i) => (
                          <tr key={i} className="hover:bg-amber-50/30">
                            <td className="px-4 py-2 font-mono text-xs text-zinc-900">{row.catalogo}</td>
                            <td className="px-4 py-2 text-zinc-700">{row.descripcion || '-'}</td>
                            <td className="px-4 py-2 text-zinc-600">{row.nombre_instructor || '-'}</td>
                            <td className="px-4 py-2 text-right text-zinc-900 tabular-nums">{row.hrs_semestre ?? '-'}</td>
                            <td className="px-4 py-2 text-zinc-600">{row.ciclo_lectivo || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center py-20 text-zinc-400">
              <p className="text-sm">No se pudo cargar la validacion</p>
            </div>
          )}
        </div>
      )}

      {/* ── Import Modal ── */}
      <Modal
        open={showImport}
        onClose={() => { setShowImport(false); setImportResult(''); }}
        title="Importar Plan de Estudio"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            Seleccione un archivo Excel (.xlsx) de Plan de Estudio exportado desde Elysa.
            El archivo debe contener las columnas: Prog Acad, Nom Largo, ID Curso, Catalogo, etc.
          </p>

          <div className="border-2 border-dashed border-zinc-200 rounded-lg p-8 text-center hover:border-[#1e3a5f] transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              id="plan-import-file"
            />
            <label
              htmlFor="plan-import-file"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <IconUpload />
              <span className="text-sm font-medium text-zinc-700">
                {importing ? 'Importando...' : 'Clic para seleccionar archivo'}
              </span>
              <span className="text-xs text-zinc-400">.xlsx o .xls</span>
            </label>
          </div>

          {importing && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Procesando archivo...
            </div>
          )}

          {importResult && (
            <div className={`p-3 rounded-lg text-sm ${importResult.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              {importResult}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
