'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import {
  Button,
  Card,
  Badge,
  Tabs,
  Modal,
  Pagination,
  Select,
  Input,
  useToast,
  ToastContainer,
} from '@/components/ui';
import { formatInstructorId } from '@/lib/format';

/* ================================================================== */
/*  Icons (inline SVG helpers)                                        */
/* ================================================================== */
const LockIcon = () => (
  <svg className="w-3 h-3 inline-block ml-0.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const ChevronDownIcon = ({ isExpanded }: { isExpanded: boolean }) => (
  <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const EmptyStateIcon = () => (
  <svg className="w-12 h-12 text-zinc-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ClaseDetail {
  num_clase: number;
  catalogo: string;
  asignatura: string;
  componente: string;
  inscritos: number;
  hrs_semana: number;
  hrs_semestre: number;
  fecha_inicial: string;
  fecha_final: string;
  cortes: number[];
  programa: string;
  campus: string;
}

interface ConsolidadoDocente {
  instructor_id: string;
  nombre: string;
  cedula: string;
  tipo_doc: string;
  dedicacion: string;
  campus: string;
  programa: string;
  hrs_semana: number;
  hrs_semestre: number;
  cortes: number[];
  cortes_congelados: boolean[];
  hrs_prenomina: number;
  saldo: number;
  fecha_inicio: string;
  fecha_final: string;
  clases: ClaseDetail[];
}

interface CorteInfo {
  num: number;
  fecha_inicio: string;
  fecha_fin: string;
  emitido: boolean;
}

interface CalcResponse {
  consolidado: ConsolidadoDocente[];
  num_cortes: number;
  cortes_info: CorteInfo[];
  error?: string;
}

interface CiclosResponse {
  ciclos: { value: string; label: string }[];
  periodos: { value: string; label: string }[];
  campus: { value: string; label: string }[];
  dedicaciones?: { value: string; label: string }[];
  grados: { value: string; label: string }[];
  cicloMap: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  Constants & labels                                                 */
/* ------------------------------------------------------------------ */
const LBL_PRENOMINA = 'Pren\u00f3mina';
const LBL_CONSOLIDADO = 'Consolidado General';
const LBL_DEDICACION = 'Dedicaci\u00f3n';
const LBL_PROGRAMA = 'Programa';
const LBL_TIPO_DOC = 'Tipo Doc';
const LBL_DOCUMENTO = 'C\u00e9dula';
const LBL_DOCENTE = 'Docente';
const LBL_HRS_SEMANA = 'Hrs/Sem';
const LBL_HRS_SEMESTRE = 'Hrs/Semestre';
const LBL_HRS_PRENOMINA = 'Hrs Pren\u00f3mina';
const LBL_SALDO = 'Saldo';
const LBL_FECHA_INICIO = 'F.Inicio';
const LBL_FECHA_FINAL = 'F.Final';
const LBL_BUSCAR = 'Buscar docente, c\u00e9dula o EMPLID...';
const LBL_CAMPUS = 'Campus';
const LBL_TOTAL = 'Total';
const LBL_NO_REGISTROS = 'No se encontraron registros';
const LBL_NO_REGISTROS_DESC = 'Ajuste los filtros o verifique que existan datos de carga acad\u00e9mica para el periodo seleccionado.';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatDate(d: string): string {
  if (!d || d === '-') return '-';
  if (d.includes('/')) return d;
  const parts = d.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function formatCorteHeader(info: CorteInfo): string {
  // "Corte I\n19/01 - 22/02"
  const romanNums = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  return `Corte ${romanNums[info.num - 1] || info.num}`;
}

function formatCorteDates(info: CorteInfo): string {
  const fmtShort = (s: string) => {
    const parts = s.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return s;
  };
  return `${fmtShort(info.fecha_inicio)} - ${fmtShort(info.fecha_fin)}`;
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */
export default function PrenominaPage() {
  /* ---- State ---- */
  const [consolidado, setConsolidado] = useState<ConsolidadoDocente[]>([]);
  const [cortesInfo, setCortesInfo] = useState<CorteInfo[]>([]);
  const [numCortes, setNumCortes] = useState(4);
  const [loading, setLoading] = useState(true);

  const [tipo, setTipo] = useState<'PREGRADO' | 'POSGRADO'>('PREGRADO');
  const [periodo, setPeriodo] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [campus, setCampus] = useState('');
  const [dedicacion, setDedicacion] = useState('');
  const [search, setSearch] = useState('');
  const [expandedDocente, setExpandedDocente] = useState<string | null>(null);

  /* Pagination (client-side) */
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  /* Options from /api/ciclos */
  const [periodoOptions, setPeriodoOptions] = useState<{ value: string; label: string }[]>([]);
  const [campusOptions, setCampusOptions] = useState<{ value: string; label: string }[]>([]);
  const [cicloOptions, setCicloOptions] = useState<{ value: string; label: string }[]>([]);
  const [dedicacionOptions, setDedicacionOptions] = useState<{ value: string; label: string }[]>([]);

  /* Emitir modal */
  const [showEmitirModal, setShowEmitirModal] = useState(false);
  const [emitirCorte, setEmitirCorte] = useState<number | null>(null);
  const [emitting, setEmitting] = useState(false);

  /* Export */
  const [exporting, setExporting] = useState(false);

  /* Toast */
  const { toasts, addToast, removeToast } = useToast();

  /* Tabs */
  const tabs = [
    { id: 'PREGRADO', label: 'Pregrado' },
    { id: 'POSGRADO', label: 'Posgrado' },
  ];

  /* ---- Fetch ciclos on mount ---- */
  useEffect(() => {
    async function loadCiclos() {
      try {
        const res = await fetch('/api/ciclos');
        if (!res.ok) return;
        const json: CiclosResponse = await res.json();
        setPeriodoOptions(json.periodos || []);
        setCampusOptions([
          { value: '', label: 'Todos' },
          ...(json.campus || []),
        ]);
        setCicloOptions(json.ciclos || []);
        setDedicacionOptions([
          { value: '', label: 'Todas' },
          ...(json.dedicaciones || []),
        ]);
        // Auto-select first periodo if none selected
        if (json.periodos && json.periodos.length > 0 && !periodo) {
          setPeriodo(json.periodos[0].value);
        }
        // Auto-select a ciclo whose tier matches the active tab (PREGRADO/POSGRADO).
        if (json.ciclos && json.ciclos.length > 0) {
          const cicloValues = json.ciclos.map((c: { value: string }) => c.value);
          if (!ciclo || !cicloValues.includes(ciclo)) {
            const wanted = tipo === 'PREGRADO' ? 'pregrado' : 'posgrado';
            const match = json.ciclos.find(
              (c: { value: string; tier?: string }) => c.tier === wanted,
            );
            setCiclo((match ?? json.ciclos[0]).value);
          }
        }
      } catch {
        // silent
      }
    }
    loadCiclos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Fetch prenomina calculation ---- */
  const fetchData = useCallback(async () => {
    if (!periodo) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ periodo, tipo });
      if (ciclo) params.set('ciclo_lectivo', ciclo);
      if (campus) params.set('campus', campus);
      if (dedicacion) params.set('dedicacion', dedicacion);
      if (search) params.set('search', search);

      const res = await fetch(`/api/prenomina/calcular?${params}`);
      const json: CalcResponse = await res.json();

      if (!res.ok) {
        addToast('error', json.error || 'Error al calcular pren\u00f3mina');
        setConsolidado([]);
        setCortesInfo([]);
        setNumCortes(tipo === 'PREGRADO' ? 4 : 6);
        return;
      }

      setConsolidado(json.consolidado || []);
      setCortesInfo(json.cortes_info || []);
      setNumCortes(json.num_cortes || (tipo === 'PREGRADO' ? 4 : 6));
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error desconocido');
      setConsolidado([]);
    } finally {
      setLoading(false);
    }
  }, [tipo, periodo, ciclo, campus, dedicacion, search, addToast]);

  useEffect(() => {
    if (periodo) fetchData();
  }, [fetchData, periodo]);

  // Reset pagination when filters change
  useEffect(() => {
    setPage(1);
    setExpandedDocente(null);
  }, [tipo, periodo, ciclo, campus, dedicacion, search]);

  // When switching PREGRADO/POSGRADO tab, re-align the active ciclo to the
  // matching tier so the view always has the right dataset.
  useEffect(() => {
    if (cicloOptions.length === 0) return;
    const wanted = tipo === 'PREGRADO' ? 'pregrado' : 'posgrado';
    const current = cicloOptions.find(
      (c) => c.value === ciclo,
    ) as { value: string; tier?: string } | undefined;
    if (current && current.tier && current.tier !== wanted && current.tier !== 'both') {
      const match = cicloOptions.find(
        (c) => (c as { tier?: string }).tier === wanted,
      );
      if (match) setCiclo(match.value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, cicloOptions]);

  /* ---- Paginated consolidado ---- */
  const totalDocentes = consolidado.length;
  const totalPages = Math.ceil(totalDocentes / limit);
  const paginatedConsolidado = useMemo(() => {
    const start = (page - 1) * limit;
    return consolidado.slice(start, start + limit);
  }, [consolidado, page, limit]);

  /* ---- Grand totals ---- */
  const grandTotals = useMemo(() => {
    const totals = {
      hrs_semana: 0,
      hrs_semestre: 0,
      cortes: Array(numCortes).fill(0) as number[],
      hrs_prenomina: 0,
      saldo: 0,
    };
    for (const d of consolidado) {
      totals.hrs_semana += d.hrs_semana;
      totals.hrs_semestre += d.hrs_semestre;
      totals.hrs_prenomina += d.hrs_prenomina;
      totals.saldo += d.saldo;
      for (let i = 0; i < numCortes; i++) {
        totals.cortes[i] += d.cortes[i] || 0;
      }
    }
    // Round
    totals.hrs_semana = Math.round(totals.hrs_semana * 100) / 100;
    totals.hrs_semestre = Math.round(totals.hrs_semestre * 100) / 100;
    totals.hrs_prenomina = Math.round(totals.hrs_prenomina * 100) / 100;
    totals.saldo = Math.round(totals.saldo * 100) / 100;
    totals.cortes = totals.cortes.map(c => Math.round(c * 100) / 100);
    return totals;
  }, [consolidado, numCortes]);

  /* ---- Emitir corte ---- */
  async function handleEmitir() {
    if (emitirCorte === null) return;
    setEmitting(true);
    try {
      const res = await fetch('/api/prenomina/emitir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodo,
          tipo,
          num_corte: emitirCorte,
          ciclo_lectivo: ciclo,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        addToast('error', json.error || 'Error al emitir corte');
        return;
      }
      addToast('success', json.message || `Corte ${emitirCorte} emitido correctamente`);
      setShowEmitirModal(false);
      setEmitirCorte(null);
      fetchData(); // Refresh to show frozen status
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error al emitir');
    } finally {
      setEmitting(false);
    }
  }

  /* ---- Export to Excel ---- */
  async function handleExport() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ tipo: tipo.toLowerCase() });
      if (periodo) params.set('periodo', periodo);
      if (campus) params.set('campus', campus);
      if (dedicacion) params.set('dedicacion', dedicacion);
      if (search) params.set('search', search);
      params.set('format', 'xlsx');

      const res = await fetch(`/api/prenomina?${params}`);
      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prenomina_${tipo}_${periodo || 'todos'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('success', 'Archivo exportado correctamente');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error al exportar');
    } finally {
      setExporting(false);
    }
  }

  /* ---- Export to PDF (via /api/prenomina/pdf) ---- */
  async function handleExportPdf() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ tipo: tipo.toLowerCase() });
      if (periodo) params.set('periodo', periodo);
      if (campus) params.set('campus', campus);
      if (dedicacion) params.set('dedicacion', dedicacion);
      if (search) params.set('search', search);
      const res = await fetch(`/api/prenomina/pdf?${params}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Error al exportar PDF');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prenomina_${tipo}_${periodo || 'todos'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('success', 'PDF generado correctamente');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error al exportar PDF');
    } finally {
      setExporting(false);
    }
  }

  /* ---- Toggle docente expansion ---- */
  function toggleDocente(key: string) {
    setExpandedDocente(prev => (prev === key ? null : key));
  }

  /* ---- Available cortes to emit ---- */
  const cortesDisponibles = cortesInfo.map(ci => ({
    ...ci,
    label: `${formatCorteHeader(ci)} ${ci.emitido ? '\u2713' : ''}`,
    disabled: ci.emitido,
  }));

  /* ---- Skeleton ---- */
  function TableSkeleton() {
    return (
      <div className="animate-pulse">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex gap-2 py-3 px-4 border-b border-zinc-100">
            {Array.from({ length: 10 }).map((_, j) => (
              <div key={j} className="h-4 bg-zinc-200 rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */
  return (
    <div className="min-h-screen bg-zinc-50 p-6 lg:p-8">
      <div className="max-w-[1900px] mx-auto space-y-6">

        {/* ============================================================ */}
        {/* HEADER SECTION                                               */}
        {/* ============================================================ */}
        <div className="space-y-4">
          {/* Title + Ciclo Selector */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-950">
                {LBL_PRENOMINA}
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Gestiona y revisa la información de pago de docentes
              </p>
            </div>

            {/* Ciclo Selector */}
            <div className="w-full lg:w-64">
              <label className="block text-xs font-semibold text-zinc-600 mb-2 uppercase tracking-wide">
                Ciclo Lectivo
              </label>
              <Select
                value={ciclo}
                onChange={(e) => setCiclo(e.target.value)}
                options={cicloOptions}
                placeholder="Selecciona un ciclo"
              />
            </div>
          </div>

          {/* Tipo Tabs (Pregrado / Posgrado) */}
          <div className="flex items-center gap-2 border-b border-zinc-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTipo(tab.id as 'PREGRADO' | 'POSGRADO')}
                className={`px-4 py-3 text-sm font-semibold transition-all ${
                  tipo === tab.id
                    ? 'text-unisinu-700 border-b-2 border-indigo-600 -mb-px'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ACTION BUTTONS                                               */}
        {/* ============================================================ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {/* Emitir Corte Dropdown */}
          <div className="relative group">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              {/* White lock — action button context */}
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Emitir Corte
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg ring-1 ring-zinc-200 py-1 z-50 hidden group-hover:block border border-zinc-200">
              {cortesDisponibles.length === 0 ? (
                <div className="px-4 py-3 text-xs text-zinc-500">No hay cortes configurados</div>
              ) : (
                cortesDisponibles.map((cd) => (
                  <button
                    key={cd.num}
                    disabled={cd.disabled}
                    onClick={() => {
                      if (!cd.disabled) {
                        setEmitirCorte(cd.num);
                        setShowEmitirModal(true);
                      }
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors ${
                      cd.disabled
                        ? 'text-zinc-400 cursor-not-allowed bg-zinc-50'
                        : 'text-zinc-700 hover:bg-unisinu-50 hover:text-unisinu-800 cursor-pointer'
                    }`}
                  >
                    <span className="font-medium">{formatCorteHeader(cd)}</span>
                    <span className="text-xs text-zinc-500">
                      {cd.emitido ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Emitido
                        </span>
                      ) : (
                        <span>{formatCorteDates(cd)}</span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Export Excel */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-lg ring-1 ring-zinc-200 transition-colors disabled:opacity-50"
          >
            <DownloadIcon />
            Excel
          </button>
          {/* Export PDF */}
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 text-sm font-semibold rounded-lg ring-1 ring-zinc-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            PDF
          </button>
        </div>

        {/* ============================================================ */}
        {/* SEARCH & FILTERS CARD                                        */}
        {/* ============================================================ */}
        <div className="rounded-xl ring-1 ring-zinc-200 bg-white p-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-zinc-600 mb-2 uppercase tracking-wide">
                Buscar
              </label>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={LBL_BUSCAR}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                  <SearchIcon />
                </div>
              </div>
            </div>

            {/* Campus */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-zinc-600 mb-2 uppercase tracking-wide">
                {LBL_CAMPUS}
              </label>
              <Select
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                options={campusOptions.length > 0 ? campusOptions : [{ value: '', label: 'Todos' }]}
                placeholder={LBL_CAMPUS}
              />
            </div>

            {/* Dedicación */}
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-zinc-600 mb-2 uppercase tracking-wide">
                {LBL_DEDICACION}
              </label>
              <Select
                value={dedicacion}
                onChange={(e) => setDedicacion(e.target.value)}
                options={dedicacionOptions.length > 0 ? dedicacionOptions : [{ value: '', label: 'Todas' }]}
                placeholder={LBL_DEDICACION}
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* DATA TABLE                                                   */}
        {/* ============================================================ */}
        <div className="rounded-xl ring-1 ring-zinc-200 bg-white overflow-hidden">
          {loading ? (
            <TableSkeleton />
          ) : consolidado.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
              <EmptyStateIcon />
              <p className="text-base font-semibold text-zinc-900 mb-2">{LBL_NO_REGISTROS}</p>
              <p className="text-sm text-zinc-500 max-w-md">{LBL_NO_REGISTROS_DESC}</p>
            </div>
          ) : (
            <>
              {/* Table Header Label */}
              <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-200">
                <h2 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">
                  {LBL_CONSOLIDADO} — {tipo === 'PREGRADO' ? 'Pregrado' : 'Posgrado'}
                  <span className="ml-3 font-normal text-zinc-500">({totalDocentes} docentes)</span>
                </h2>
              </div>

              {/* Table Scroll Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  {/* ---- THEAD ---- */}
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{'\u2116'}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_DEDICACION}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_CAMPUS}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_PROGRAMA}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">EMPLID</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_TIPO_DOC}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_DOCUMENTO}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_DOCENTE}</th>
                      <th className="px-3 py-3 text-right font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_HRS_SEMANA}</th>
                      <th className="px-3 py-3 text-right font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_HRS_SEMESTRE}</th>
                      {cortesInfo.map((ci) => (
                        <th
                          key={ci.num}
                          className={`px-3 py-3 text-right font-semibold whitespace-nowrap uppercase tracking-wider ${
                            ci.emitido ? 'text-amber-700 bg-amber-50/50' : 'text-zinc-600'
                          }`}
                        >
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="flex items-center gap-0.5">
                              {formatCorteHeader(ci)}
                              {ci.emitido && <LockIcon />}
                            </span>
                            <span className="text-[9px] font-normal text-zinc-400">{formatCorteDates(ci)}</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-3 text-right font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_HRS_PRENOMINA}</th>
                      <th className="px-3 py-3 text-right font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_SALDO}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_FECHA_INICIO}</th>
                      <th className="px-3 py-3 text-left font-semibold text-zinc-600 whitespace-nowrap uppercase tracking-wider">{LBL_FECHA_FINAL}</th>
                    </tr>
                  </thead>

                  {/* ---- TBODY ---- */}
                  <tbody className="divide-y divide-zinc-100">
                    {paginatedConsolidado.map((docente, idx) => {
                      const rowNum = (page - 1) * limit + idx + 1;
                      const isExpanded = expandedDocente === docente.instructor_id;

                      return (
                        <Fragment key={docente.instructor_id || `doc-${idx}`}>
                          {/* ---- Consolidado row (clickable) ---- */}
                          <tr
                            className={`cursor-pointer transition-colors ${
                              isExpanded ? 'bg-unisinu-50' : 'hover:bg-zinc-50'
                            }`}
                            onClick={() => toggleDocente(docente.instructor_id)}
                          >
                            <td className="px-3 py-2.5 text-zinc-500 font-mono">{rowNum}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <Badge
                                variant={
                                  docente.dedicacion.includes('Completo') ? 'info'
                                    : docente.dedicacion.includes('Medio') ? 'primary'
                                    : 'neutral'
                                }
                                size="sm"
                              >
                                {docente.dedicacion || '-'}
                              </Badge>
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700">{docente.campus || '-'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-700 max-w-[180px] truncate" title={docente.programa}>
                              {docente.programa || '-'}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-zinc-600">{formatInstructorId(docente.instructor_id) || '-'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600">{docente.tipo_doc || '-'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-zinc-600">{formatInstructorId(docente.cedula) || '-'}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap font-medium text-zinc-950 max-w-[200px] truncate" title={docente.nombre}>
                              <span className="inline-flex items-center gap-2">
                                <ChevronDownIcon isExpanded={isExpanded} />
                                {docente.nombre || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-zinc-900">{docente.hrs_semana}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-zinc-900">{docente.hrs_semestre}</td>
                            {docente.cortes.map((c, i) => (
                              <td
                                key={i}
                                className={`px-3 py-2.5 text-right text-zinc-700 ${
                                  docente.cortes_congelados[i] ? 'bg-amber-50 font-semibold' : ''
                                }`}
                              >
                                {c}
                                {docente.cortes_congelados[i] && <LockIcon />}
                              </td>
                            ))}
                            <td className="px-3 py-2.5 text-right font-semibold text-unisinu-700">{docente.hrs_prenomina}</td>
                            <td
                              className={`px-3 py-2.5 text-right font-semibold ${
                                docente.saldo < 0 ? 'text-red-600' : docente.saldo > 0 ? 'text-amber-600' : 'text-green-600'
                              }`}
                            >
                              {docente.saldo}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600">{formatDate(docente.fecha_inicio)}</td>
                            <td className="px-3 py-2.5 whitespace-nowrap text-zinc-600">{formatDate(docente.fecha_final)}</td>
                          </tr>

                          {/* ---- Detallado rows (expanded) ---- */}
                          {isExpanded && (
                            <>
                              {/* Detallado sub-header */}
                              <tr className="bg-unisinu-50 border-y border-unisinu-200">
                                <td className="px-3 py-2" />
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide">{LBL_PROGRAMA}</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide">{LBL_CAMPUS}</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide">{'\u2116'} Clase</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide">Catálogo</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide" colSpan={2}>
                                  Asignatura
                                </td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide">Componente</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide text-right">{LBL_HRS_SEMANA}</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide text-right">{LBL_HRS_SEMESTRE}</td>
                                {cortesInfo.map((ci) => (
                                  <td key={ci.num} className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide text-right">
                                    {formatCorteHeader(ci)}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide text-right">{LBL_HRS_PRENOMINA}</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide">{LBL_FECHA_INICIO}</td>
                                <td className="px-3 py-2 text-[10px] font-bold text-unisinu-800 uppercase tracking-wide">{LBL_FECHA_FINAL}</td>
                              </tr>

                              {/* Each class row */}
                              {docente.clases.map((clase) => {
                                const claseTotal = clase.cortes.reduce((s, v) => s + v, 0);
                                return (
                                  <tr key={clase.num_clase} className="bg-unisinu-50/50 hover:bg-unisinu-50/80 transition-colors">
                                    <td className="px-3 py-1.5" />
                                    <td className="px-3 py-1.5 text-zinc-600 max-w-[160px] truncate" title={clase.programa}>
                                      {clase.programa || '-'}
                                    </td>
                                    <td className="px-3 py-1.5 text-zinc-600">{clase.campus || '-'}</td>
                                    <td className="px-3 py-1.5 font-mono text-zinc-600">{clase.num_clase || '-'}</td>
                                    <td className="px-3 py-1.5 font-mono text-zinc-600">{clase.catalogo || '-'}</td>
                                    <td className="px-3 py-1.5 text-zinc-800 max-w-[200px] truncate" colSpan={2} title={clase.asignatura}>
                                      {clase.asignatura || '-'}
                                    </td>
                                    <td className="px-3 py-1.5 text-zinc-600">{clase.componente || '-'}</td>
                                    <td className="px-3 py-1.5 text-right text-zinc-700">{clase.hrs_semana}</td>
                                    <td className="px-3 py-1.5 text-right text-zinc-700">{clase.hrs_semestre}</td>
                                    {clase.cortes.map((c, i) => (
                                      <td
                                        key={i}
                                        className={`px-3 py-1.5 text-right text-zinc-700 ${
                                          docente.cortes_congelados[i] ? 'bg-amber-50/40' : ''
                                      }`}
                                    >
                                      {c}
                                    </td>
                                  ))}
                                    <td className="px-3 py-1.5 text-right font-medium text-unisinu-700">
                                      {Math.round(claseTotal * 100) / 100}
                                    </td>
                                    <td className="px-3 py-1.5 text-zinc-600 whitespace-nowrap">{formatDate(clase.fecha_inicial)}</td>
                                    <td className="px-3 py-1.5 text-zinc-600 whitespace-nowrap">{formatDate(clase.fecha_final)}</td>
                                  </tr>
                                );
                              })}

                              {/* Total row for this docente */}
                              <tr className="bg-unisinu-100 border-y-2 border-indigo-300">
                                <td className="px-3 py-2.5" />
                                <td colSpan={7} className="px-3 py-2.5 font-bold text-unisinu-900 text-right">
                                  Total {docente.nombre} ({docente.clases.length} clases)
                                </td>
                                <td className="px-3 py-2.5 text-right font-bold text-unisinu-900">{docente.hrs_semana}</td>
                                <td className="px-3 py-2.5 text-right font-bold text-unisinu-900">{docente.hrs_semestre}</td>
                                {docente.cortes.map((c, i) => (
                                  <td key={i} className="px-3 py-2.5 text-right font-bold text-unisinu-900">
                                    {c}
                                  </td>
                                ))}
                                <td className="px-3 py-2.5 text-right font-bold text-unisinu-900">{docente.hrs_prenomina}</td>
                                <td colSpan={2} className="px-3 py-2.5" />
                              </tr>
                          </>
                        )}
                      </Fragment>
                    );
                  })}

                    {/* ---- GRAND TOTAL ROW ---- */}
                    {consolidado.length > 0 && (
                      <tr className="bg-zinc-900 text-white font-bold">
                        <td className="px-3 py-3" />
                        <td colSpan={7} className="px-3 py-3 text-right uppercase tracking-wide text-xs">
                          {LBL_TOTAL} ({totalDocentes} docentes)
                        </td>
                        <td className="px-3 py-3 text-right">{grandTotals.hrs_semana}</td>
                        <td className="px-3 py-3 text-right">{grandTotals.hrs_semestre}</td>
                        {grandTotals.cortes.map((c, i) => (
                          <td key={i} className="px-3 py-3 text-right">
                            {c}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right">{grandTotals.hrs_prenomina}</td>
                        <td className="px-3 py-3 text-right">{grandTotals.saldo}</td>
                        <td colSpan={2} className="px-3 py-3" />
                      </tr>
                    )}
                </tbody>
                </table>
              </div>

              {/* ---- PAGINATION ---- */}
              {totalPages > 0 && (
                <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    total={totalDocentes}
                    limit={limit}
                    onPageChange={(p) => setPage(p)}
                    onLimitChange={(newLimit) => {
                      setLimit(newLimit);
                      setPage(1);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================ */}
        {/* MODALS                                                       */}
        {/* ============================================================ */}

        {/* ---- EMITIR CORTE CONFIRMATION MODAL ---- */}
        <Modal
          open={showEmitirModal}
          onClose={() => {
            setShowEmitirModal(false);
            setEmitirCorte(null);
          }}
          title="Confirmar Emisión de Corte"
          size="md"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowEmitirModal(false);
                  setEmitirCorte(null);
                }}
              >
                Cancelar
              </Button>
              <Button variant="primary" size="sm" loading={emitting} onClick={handleEmitir}>
                Emitir Corte {emitirCorte}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <WarningIcon />
              </div>
              <div>
                <p className="text-sm text-zinc-900 font-semibold mb-2">
                  ¿Está seguro que desea emitir el Corte {emitirCorte} para {tipo === 'PREGRADO' ? 'Pregrado' : 'Posgrado'}?
                </p>
                <p className="text-xs text-zinc-600 mb-3">
                  Esta acción congelará los valores calculados del corte. Una vez emitido, los valores no cambiarán aunque se modifique la carga académica.
                </p>
                {emitirCorte !== null && cortesInfo[emitirCorte - 1] && (
                  <div className="bg-zinc-100 rounded-lg px-3 py-2 text-xs text-zinc-700 border border-zinc-200">
                    <strong>Periodo:</strong> {periodo} &nbsp;|&nbsp;
                    <strong>Tipo:</strong> {tipo} &nbsp;|&nbsp;
                    <strong>Fechas:</strong> {formatDate(cortesInfo[emitirCorte - 1].fecha_inicio)} {' - '}
                    {formatDate(cortesInfo[emitirCorte - 1].fecha_fin)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </div>
  );
}
