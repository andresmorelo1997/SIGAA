'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Card,
  Tabs,
  Modal,
  Pagination,
  EmptyState,
  Input,
  Select,
  useToast,
  ToastContainer,
} from '@/components/ui';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/20/solid';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import clsx from 'clsx';

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type MotivoType =
  | 'RENUNCIA'
  | 'COMISION_ESTUDIO'
  | 'LICENCIA'
  | 'REASIGNACION'
  | 'TERMINACION_CONTRATO'
  | 'CAMBIO_HORARIO'
  | 'CIERRE_CURSO'
  | 'APERTURA_CURSO'
  | 'CAMBIO_GRUPO';

type EstadoType = 'pendiente' | 'aprobada' | 'rechazada' | 'aplicada';
type TipoProgramaType = 'PREGRADO' | 'POSGRADO';

interface Docente {
  id: string;
  nombre: string;
  cedula: string;
  dedicacion?: string;
  emplid?: string;
}

interface ClaseAcademica {
  id: string;
  num_clase: string;
  asignatura: string;
  catalogo: string;
  semestre: string;
  grupo: string;
  horas_teoricas: number;
  horas_practicas: number;
  intensidad: number;
  aula: string;
  horario: string;
  instructor_id: string;
}

interface Programa {
  id: string;
  nombre: string;
  tipo: TipoProgramaType;
}

interface Novedad {
  id: number;
  tipo_programa: TipoProgramaType;
  programa: string;
  periodo: string;
  motivo: MotivoType;
  motivo_detalle: string;
  docente_saliente_id: string;
  docente_saliente_nombre: string;
  docente_saliente_cedula: string;
  dedicacion_saliente: string;
  emplid_saliente: string;
  fecha_inicio_saliente: string;
  fecha_salida_saliente: string;
  clase_id: string;
  num_clase: string;
  asignatura: string;
  catalogo: string;
  semestre: string;
  grupo: string;
  horas_teoricas: number;
  horas_practicas: number;
  intensidad: number;
  aula: string;
  horario: string;
  horas_dictadas: number;
  horas_ausencia: number;
  docente_entrante_id?: string;
  docente_entrante_nombre?: string;
  docente_entrante_cedula?: string;
  dedicacion_entrante?: string;
  fecha_inicio_entrante?: string;
  fecha_salida_entrante?: string;
  total_horas_contratar?: number;
  observaciones: string;
  estado: EstadoType;
  created_at: string;
  updated_at: string;
}

interface NovedadAuto {
  id: number;
  tipo: string;
  entidad: string;
  descripcion: string;
  estado: 'pendiente' | 'confirmada' | 'descartada';
  datos_anterior: Record<string, unknown>;
  datos_nuevo: Record<string, unknown>;
  created_at: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/* ================================================================== */
/*  Constants                                                          */
/* ================================================================== */

const MOTIVO_OPTIONS: Array<{ value: MotivoType; label: string }> = [
  { value: 'RENUNCIA', label: 'Renuncia' },
  { value: 'COMISION_ESTUDIO', label: 'Comisión de Estudio' },
  { value: 'LICENCIA', label: 'Licencia' },
  { value: 'REASIGNACION', label: 'Reasignación de Carga' },
  { value: 'TERMINACION_CONTRATO', label: 'Terminación de Contrato' },
  { value: 'CAMBIO_HORARIO', label: 'Cambio de Horario' },
  { value: 'CIERRE_CURSO', label: 'Cierre de Curso' },
  { value: 'APERTURA_CURSO', label: 'Apertura de Curso' },
  { value: 'CAMBIO_GRUPO', label: 'Cambio de Grupo' },
];

const MOTIVO_COLORS: Record<MotivoType, string> = {
  RENUNCIA: 'bg-red-100 text-red-800',
  COMISION_ESTUDIO: 'bg-unisinu-100 text-purple-800',
  LICENCIA: 'bg-amber-100 text-amber-800',
  REASIGNACION: 'bg-blue-100 text-blue-800',
  TERMINACION_CONTRATO: 'bg-red-100 text-red-800',
  CAMBIO_HORARIO: 'bg-cyan-100 text-cyan-800',
  CIERRE_CURSO: 'bg-zinc-200 text-zinc-800',
  APERTURA_CURSO: 'bg-emerald-100 text-emerald-800',
  CAMBIO_GRUPO: 'bg-unisinu-100 text-indigo-800',
};

const ESTADO_COLORS: Record<EstadoType, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  aprobada: 'bg-blue-100 text-blue-800',
  rechazada: 'bg-red-100 text-red-800',
  aplicada: 'bg-emerald-100 text-emerald-800',
};

const TIPO_PROGRAMA_OPTIONS: Array<{ value: TipoProgramaType; label: string }> = [
  { value: 'PREGRADO', label: 'Pregrado' },
  { value: 'POSGRADO', label: 'Posgrado' },
];

/* ================================================================== */
/*  Field name mapping (form friendly names ↔ DB column names)       */
/* ================================================================== */

const FORM_TO_DB: Record<string, string> = {
  docente_saliente_id: 'docente_sale_id',
  docente_saliente_nombre: 'docente_sale',
  dedicacion_saliente: 'docente_sale_dedicacion',
  fecha_inicio_saliente: 'fecha_inicio_sale',
  fecha_salida_saliente: 'fecha_salida',
  intensidad: 'intensidad_semestral',
  docente_entrante_id: 'docente_entra_id',
  docente_entrante_nombre: 'docente_entra',
  dedicacion_entrante: 'docente_entra_dedicacion',
  fecha_inicio_entrante: 'fecha_inicio_entra',
  fecha_salida_entrante: 'fecha_salida_entra',
};

const DB_TO_FORM: Record<string, string> = Object.fromEntries(
  Object.entries(FORM_TO_DB).map(([k, v]) => [v, k]),
);

// Fields that exist in form but not in DB (will be dropped on save)
const FORM_ONLY_FIELDS = new Set([
  'docente_saliente_cedula',
  'emplid_saliente',
  'docente_entrante_cedula',
  'clase_id',
]);

function mapFormToDb(form: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form)) {
    if (FORM_ONLY_FIELDS.has(key)) continue;
    const dbKey = FORM_TO_DB[key] || key;
    out[dbKey] = value;
  }
  return out;
}

function mapDbToForm(dbRow: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dbRow)) {
    const formKey = DB_TO_FORM[key] || key;
    out[formKey] = value;
  }
  return out;
}

const EMPTY_FORM: Omit<Novedad, 'id' | 'created_at' | 'updated_at'> = {
  tipo_programa: 'PREGRADO',
  programa: '',
  periodo: '',
  motivo: 'RENUNCIA',
  motivo_detalle: '',
  docente_saliente_id: '',
  docente_saliente_nombre: '',
  docente_saliente_cedula: '',
  dedicacion_saliente: '',
  emplid_saliente: '',
  fecha_inicio_saliente: '',
  fecha_salida_saliente: '',
  clase_id: '',
  num_clase: '',
  asignatura: '',
  catalogo: '',
  semestre: '',
  grupo: '',
  horas_teoricas: 0,
  horas_practicas: 0,
  intensidad: 0,
  aula: '',
  horario: '',
  horas_dictadas: 0,
  horas_ausencia: 0,
  observaciones: '',
  estado: 'pendiente',
};

/* ================================================================== */
/*  Helper Functions                                                  */
/* ================================================================== */

function shouldShowDocenteEntrante(motivo: MotivoType): boolean {
  return ['REASIGNACION', 'CAMBIO_GRUPO', 'APERTURA_CURSO', 'COMISION_ESTUDIO', 'LICENCIA'].includes(motivo);
}

function getMotivoInfo(motivo: MotivoType): { warning?: string; info?: string } {
  const infoMap: Record<MotivoType, { warning?: string; info?: string }> = {
    RENUNCIA: { warning: 'Al aplicar, el docente será marcado como inactivo' },
    COMISION_ESTUDIO: { info: 'El docente mantiene su contrato activo pero se retira de la carga' },
    LICENCIA: { info: 'El docente se retira temporalmente de su carga académica' },
    REASIGNACION: {},
    TERMINACION_CONTRATO: { warning: 'Al aplicar, el contrato del docente será terminado' },
    CAMBIO_HORARIO: {},
    CIERRE_CURSO: { warning: 'La clase será marcada como Cancelada' },
    APERTURA_CURSO: {},
    CAMBIO_GRUPO: {},
  };
  return infoMap[motivo];
}

/* ================================================================== */
/*  Nova Form Component                                               */
/* ================================================================== */

type NovaFormState = Omit<Novedad, 'id' | 'created_at' | 'updated_at'>;

interface NovaFormProps {
  form: NovaFormState;
  onChange: (updates: Partial<NovaFormState>) => void;
  programas: Programa[];
  onSave: () => void;
  saving: boolean;
}

function NovaForm({ form, onChange, programas, onSave, saving }: NovaFormProps) {
  const [docentesResults, setDocentesResults] = useState<Docente[]>([]);
  const [docentesSearching, setDocentesSearching] = useState(false);
  const [clasesOptions, setClasesOptions] = useState<ClaseAcademica[]>([]);
  const [clasesLoading, setClasesLoading] = useState(false);
  const [showDocenteSalienteDropdown, setShowDocenteSalienteDropdown] = useState(false);
  const [showDocenteEntranteDropdown, setShowDocenteEntranteDropdown] = useState(false);
  const [searchDocenteSaliente, setSearchDocenteSaliente] = useState('');
  const [searchDocenteEntrante, setSearchDocenteEntrante] = useState('');

  const debouncedSearchSaliente = useDebouncedValue(searchDocenteSaliente, 300);

  // Fetch docentes when search changes
  useEffect(() => {
    if (debouncedSearchSaliente.length < 2) {
      setDocentesResults([]);
      return;
    }

    const fetchDocentes = async () => {
      setDocentesSearching(true);
      try {
        const res = await fetch(`/api/docentes?search=${encodeURIComponent(debouncedSearchSaliente)}`);
        if (res.ok) {
          const data = await res.json();
          setDocentesResults(data.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching docentes:', err);
      } finally {
        setDocentesSearching(false);
      }
    };

    fetchDocentes();
  }, [debouncedSearchSaliente]);

  // Fetch classes when docente saliente is selected
  useEffect(() => {
    if (!form.docente_saliente_id) {
      setClasesOptions([]);
      return;
    }

    const fetchClases = async () => {
      setClasesLoading(true);
      try {
        const res = await fetch(`/api/carga-academica?instructor_id=${form.docente_saliente_id}`);
        if (res.ok) {
          const data = await res.json();
          setClasesOptions(data.data ?? []);
        }
      } catch (err) {
        console.error('Error fetching classes:', err);
      } finally {
        setClasesLoading(false);
      }
    };

    fetchClases();
  }, [form.docente_saliente_id]);

  const handleSelectDocenteSaliente = (docente: Docente) => {
    onChange({
      docente_saliente_id: docente.id,
      docente_saliente_nombre: docente.nombre,
      docente_saliente_cedula: docente.cedula,
      dedicacion_saliente: docente.dedicacion || '',
      emplid_saliente: docente.emplid || '',
    });
    setSearchDocenteSaliente('');
    setShowDocenteSalienteDropdown(false);
  };

  const handleSelectDocenteEntrante = (docente: Docente) => {
    onChange({
      docente_entrante_id: docente.id,
      docente_entrante_nombre: docente.nombre,
      docente_entrante_cedula: docente.cedula,
      dedicacion_entrante: docente.dedicacion || '',
    });
    setSearchDocenteEntrante('');
    setShowDocenteEntranteDropdown(false);
  };

  const handleSelectClase = (clase: ClaseAcademica) => {
    onChange({
      clase_id: clase.id,
      num_clase: clase.num_clase,
      asignatura: clase.asignatura,
      catalogo: clase.catalogo,
      semestre: clase.semestre,
      grupo: clase.grupo,
      horas_teoricas: clase.horas_teoricas,
      horas_practicas: clase.horas_practicas,
      intensidad: clase.intensidad,
      aula: clase.aula,
      horario: clase.horario,
    });
  };

  const horasRestantes = form.intensidad - form.horas_dictadas;
  const motivoInfo = getMotivoInfo(form.motivo);
  const showDocenteEntrante = shouldShowDocenteEntrante(form.motivo);
  const showClase = form.motivo !== 'CIERRE_CURSO' && form.motivo !== 'APERTURA_CURSO';

  const [activeStep, setActiveStep] = useState<'general' | 'saliente' | 'clase' | 'entrante'>('general');

  // If user is on a tab that becomes hidden, reset to general
  useEffect(() => {
    if (activeStep === 'clase' && !showClase) setActiveStep('general');
    if (activeStep === 'entrante' && !showDocenteEntrante) setActiveStep('general');
  }, [activeStep, showClase, showDocenteEntrante]);

  const steps: Array<{ id: 'general' | 'saliente' | 'clase' | 'entrante'; label: string; show: boolean }> = [
    { id: 'general', label: 'General', show: true },
    { id: 'saliente', label: 'Docente Saliente', show: true },
    { id: 'clase', label: 'Clase', show: showClase },
    { id: 'entrante', label: 'Docente Entrante', show: showDocenteEntrante },
  ];
  const visibleSteps = steps.filter((s) => s.show);
  const currentIdx = visibleSteps.findIndex((s) => s.id === activeStep);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < visibleSteps.length - 1;

  const inputClass = 'w-full px-3 py-2 text-sm rounded-md border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-unisinu-600 focus:border-unisinu-500 disabled:bg-zinc-50 disabled:text-zinc-600';
  const labelClass = 'block text-xs font-semibold text-zinc-700 mb-1 uppercase tracking-wide';

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="flex flex-col h-full min-h-[520px]">
      {/* Step Tabs */}
      <div className="flex gap-1 border-b border-zinc-200 -mx-2 px-2 mb-5 overflow-x-auto">
        {visibleSteps.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            onClick={() => setActiveStep(step.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
              activeStep === step.id
                ? 'border-indigo-600 text-unisinu-700'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300',
            )}
          >
            <span className={clsx(
              'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
              activeStep === step.id ? 'bg-unisinu-600 text-white' : 'bg-zinc-200 text-zinc-600',
            )}>
              {idx + 1}
            </span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="flex-1">
        {/* STEP 1: General */}
        {activeStep === 'general' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Tipo de Programa *</label>
                <select
                  value={form.tipo_programa}
                  onChange={(e) => onChange({ tipo_programa: e.target.value as TipoProgramaType })}
                  className={inputClass}
                  required
                >
                  <option value="">Seleccionar tipo</option>
                  {TIPO_PROGRAMA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Programa/Departamento *</label>
                <select
                  value={form.programa}
                  onChange={(e) => onChange({ programa: e.target.value })}
                  className={inputClass}
                  required
                >
                  <option value="">Seleccionar programa</option>
                  {programas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Periodo *</label>
                <input
                  type="text"
                  placeholder="e.g., 2026-1"
                  value={form.periodo}
                  onChange={(e) => onChange({ periodo: e.target.value })}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Motivo de la Novedad *</label>
                <select
                  value={form.motivo}
                  onChange={(e) => onChange({ motivo: e.target.value as MotivoType })}
                  className={inputClass}
                  required
                >
                  <option value="">Seleccionar motivo</option>
                  {MOTIVO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Motivo Detalle (opcional)</label>
                <input
                  type="text"
                  value={form.motivo_detalle}
                  onChange={(e) => onChange({ motivo_detalle: e.target.value })}
                  placeholder="Detalles adicionales..."
                  className={inputClass}
                />
              </div>
            </div>

            {motivoInfo.warning && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-amber-800">{motivoInfo.warning}</p>
              </div>
            )}

            {motivoInfo.info && (
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-md px-4 py-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800">{motivoInfo.info}</p>
              </div>
            )}

            <div>
              <label className={labelClass}>Observaciones (opcional)</label>
              <textarea
                value={form.observaciones}
                onChange={(e) => onChange({ observaciones: e.target.value })}
                placeholder="Notas adicionales sobre esta novedad..."
                className={inputClass}
                rows={2}
              />
            </div>
          </div>
        )}

        {/* STEP 2: Docente Saliente */}
        {activeStep === 'saliente' && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Buscar Docente *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escribe nombre o cédula..."
                  value={searchDocenteSaliente}
                  onChange={(e) => {
                    setSearchDocenteSaliente(e.target.value);
                    setShowDocenteSalienteDropdown(true);
                  }}
                  onFocus={() => setShowDocenteSalienteDropdown(true)}
                  className={inputClass}
                />
                {showDocenteSalienteDropdown && searchDocenteSaliente.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg z-20 max-h-52 overflow-y-auto">
                    {docentesSearching ? (
                      <div className="p-3 text-sm text-zinc-600">Buscando...</div>
                    ) : docentesResults.length === 0 ? (
                      <div className="p-3 text-sm text-zinc-600">No hay resultados</div>
                    ) : (
                      docentesResults.map((docente) => (
                        <button
                          key={docente.id}
                          type="button"
                          onClick={() => handleSelectDocenteSaliente(docente)}
                          className="w-full text-left px-3 py-2 hover:bg-unisinu-50 border-b border-zinc-100 last:border-b-0"
                        >
                          <p className="font-medium text-sm text-zinc-900">{docente.nombre}</p>
                          <p className="text-xs text-zinc-500">Cédula: {docente.cedula}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {form.docente_saliente_id && (
                <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-emerald-900">{form.docente_saliente_nombre}</p>
                    <p className="text-xs text-emerald-700">Cédula: {form.docente_saliente_cedula}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        docente_saliente_id: '',
                        docente_saliente_nombre: '',
                        docente_saliente_cedula: '',
                        dedicacion_saliente: '',
                        emplid_saliente: '',
                      });
                      setSearchDocenteSaliente('');
                    }}
                    className="text-emerald-700 hover:text-red-600 text-sm font-medium"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Dedicación</label>
                <input type="text" value={form.dedicacion_saliente} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>EMPLID</label>
                <input type="text" value={form.emplid_saliente} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Fecha Inicio</label>
                <input
                  type="date"
                  value={form.fecha_inicio_saliente}
                  onChange={(e) => onChange({ fecha_inicio_saliente: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha Salida</label>
                <input
                  type="date"
                  value={form.fecha_salida_saliente}
                  onChange={(e) => onChange({ fecha_salida_saliente: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Clase */}
        {activeStep === 'clase' && showClase && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Clase *</label>
              <select
                value={form.clase_id}
                onChange={(e) => {
                  const clase = clasesOptions.find((c) => c.id === e.target.value);
                  if (clase) handleSelectClase(clase);
                }}
                disabled={clasesLoading || !form.docente_saliente_id}
                className={inputClass}
              >
                <option value="">
                  {!form.docente_saliente_id ? 'Selecciona un docente primero' : 'Seleccionar clase'}
                </option>
                {clasesOptions.map((clase) => (
                  <option key={clase.id} value={clase.id}>
                    {clase.num_clase} — {clase.asignatura}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Catálogo</label>
                <input type="text" value={form.catalogo} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Semestre</label>
                <input type="text" value={form.semestre} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Grupo</label>
                <input type="text" value={form.grupo} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Intensidad</label>
                <input type="number" value={form.intensidad} disabled className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Horas Teóricas</label>
                <input type="number" value={form.horas_teoricas} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Horas Prácticas</label>
                <input type="number" value={form.horas_practicas} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Aula</label>
                <input type="text" value={form.aula} disabled className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Horario</label>
                <input type="text" value={form.horario} disabled className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Horas Dictadas</label>
                <input
                  type="number"
                  value={form.horas_dictadas}
                  onChange={(e) => onChange({ horas_dictadas: parseInt(e.target.value) || 0 })}
                  min={0}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Horas Ausencia</label>
                <input
                  type="number"
                  value={form.horas_ausencia}
                  onChange={(e) => onChange({ horas_ausencia: parseInt(e.target.value) || 0 })}
                  min={0}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Horas Restantes</label>
                <input
                  type="number"
                  value={horasRestantes}
                  disabled
                  className={clsx(inputClass, 'font-semibold text-unisinu-800')}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Docente Entrante */}
        {activeStep === 'entrante' && showDocenteEntrante && (
          <div className="space-y-5">
            <div>
              <label className={labelClass}>Buscar Docente Entrante *</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Escribe nombre o cédula..."
                  value={searchDocenteEntrante}
                  onChange={(e) => {
                    setSearchDocenteEntrante(e.target.value);
                    setShowDocenteEntranteDropdown(true);
                  }}
                  onFocus={() => setShowDocenteEntranteDropdown(true)}
                  className={inputClass}
                />
                {showDocenteEntranteDropdown && searchDocenteEntrante.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-md shadow-lg z-20 max-h-52 overflow-y-auto">
                    {docentesSearching ? (
                      <div className="p-3 text-sm text-zinc-600">Buscando...</div>
                    ) : docentesResults.length === 0 ? (
                      <div className="p-3 text-sm text-zinc-600">No hay resultados</div>
                    ) : (
                      docentesResults.map((docente) => (
                        <button
                          key={docente.id}
                          type="button"
                          onClick={() => handleSelectDocenteEntrante(docente)}
                          className="w-full text-left px-3 py-2 hover:bg-unisinu-50 border-b border-zinc-100 last:border-b-0"
                        >
                          <p className="font-medium text-sm text-zinc-900">{docente.nombre}</p>
                          <p className="text-xs text-zinc-500">Cédula: {docente.cedula}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {form.docente_entrante_id && (
                <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-emerald-900">{form.docente_entrante_nombre}</p>
                    <p className="text-xs text-emerald-700">Cédula: {form.docente_entrante_cedula}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        docente_entrante_id: '',
                        docente_entrante_nombre: '',
                        docente_entrante_cedula: '',
                        dedicacion_entrante: '',
                      });
                      setSearchDocenteEntrante('');
                    }}
                    className="text-emerald-700 hover:text-red-600 text-sm font-medium"
                  >
                    Cambiar
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className={labelClass}>Dedicación</label>
                <input
                  type="text"
                  value={form.dedicacion_entrante || ''}
                  onChange={(e) => onChange({ dedicacion_entrante: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Total Horas a Contratar</label>
                <input
                  type="number"
                  value={form.total_horas_contratar || 0}
                  onChange={(e) => onChange({ total_horas_contratar: parseInt(e.target.value) || 0 })}
                  min={0}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha Inicio</label>
                <input
                  type="date"
                  value={form.fecha_inicio_entrante || ''}
                  onChange={(e) => onChange({ fecha_inicio_entrante: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha Salida</label>
                <input
                  type="date"
                  value={form.fecha_salida_entrante || ''}
                  onChange={(e) => onChange({ fecha_salida_entrante: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-200 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500">
          Paso {currentIdx + 1} de {visibleSteps.length}
        </div>
        <div className="flex items-center gap-2">
          {canPrev && (
            <button
              type="button"
              onClick={() => setActiveStep(visibleSteps[currentIdx - 1].id)}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50"
            >
              ← Anterior
            </button>
          )}
          {canNext ? (
            <button
              type="button"
              onClick={() => setActiveStep(visibleSteps[currentIdx + 1].id)}
              className="px-4 py-2 text-sm font-medium text-white bg-unisinu-600 rounded-md hover:bg-unisinu-600"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white bg-unisinu-600 rounded-md hover:bg-unisinu-600 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Novedad'}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

/* ================================================================== */
/*  Main Page Component                                               */
/* ================================================================== */

export default function NovedadesPage() {
  const [activeTab, setActiveTab] = useState<'manuales' | 'automaticas'>('manuales');
  const [manuales, setManuales] = useState<Novedad[]>([]);
  const [manualPagination, setManualPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [manualLoading, setManualLoading] = useState(true);

  const [automaticas, setAutomaticas] = useState<NovedadAuto[]>([]);
  const [autoPagination, setAutoPagination] = useState<PaginationState>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [autoLoading, setAutoLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Omit<Novedad, 'id' | 'created_at' | 'updated_at'>>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [programas, setProgramas] = useState<Programa[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [filterTipo, setFilterTipo] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [filterSearch, setFilterSearch] = useState('');

  const { toasts, addToast, removeToast } = useToast();

  const tabs = [
    { id: 'manuales', label: 'Novedades Manuales', count: manualPagination.total },
    { id: 'automaticas', label: 'Novedades Automáticas', count: autoPagination.total },
  ];

  // Fetch programas
  useEffect(() => {
    async function loadProgramas() {
      try {
        const res = await fetch('/api/ciclos');
        if (res.ok) {
          const data = await res.json() as { data?: Array<Record<string, unknown>> };
          setProgramas(
            (data.data ?? []).map((p) => ({
              id: (p.id || p.programa_id || '') as string,
              nombre: (p.nombre || p.programa || '') as string,
              tipo: (p.tipo || 'PREGRADO') as TipoProgramaType,
            })),
          );
        }
      } catch (err) {
        console.error('Error loading programas:', err);
      }
    }
    loadProgramas();
  }, []);

  const fetchManuales = useCallback(
    async (page = 1) => {
      setManualLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        if (filterTipo) params.set('tipo', filterTipo);
        if (filterEstado) params.set('estado', filterEstado);
        if (filterPeriodo) params.set('periodo', filterPeriodo);
        if (filterSearch) params.set('search', filterSearch);

        const res = await fetch(`/api/novedades?${params}`);
        if (!res.ok) throw new Error('Error al cargar novedades');
        const json = await res.json();
        // Map DB column names to form-friendly names so the table and
        // edit modal can use a single, consistent field vocabulary.
        const mapped: Novedad[] = (json.data ?? []).map((row: Record<string, unknown>) =>
          mapDbToForm(row) as unknown as Novedad,
        );
        setManuales(mapped);
        setManualPagination(json.pagination ?? { page, limit: 20, total: 0, totalPages: 0 });
      } catch (err) {
        addToast('error', err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setManualLoading(false);
      }
    },
    [filterTipo, filterEstado, filterPeriodo, filterSearch, addToast],
  );

  const fetchAutomaticas = useCallback(
    async (page = 1) => {
      setAutoLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        const res = await fetch(`/api/novedades-auto?${params}`);
        if (!res.ok) throw new Error('Error al cargar novedades automaticas');
        const json = await res.json();
        setAutomaticas(json.data ?? []);
        setAutoPagination(json.pagination ?? { page, limit: 20, total: 0, totalPages: 0 });
      } catch (err) {
        addToast('error', err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setAutoLoading(false);
      }
    },
    [addToast],
  );

  useEffect(() => {
    fetchManuales(1);
  }, [fetchManuales]);

  useEffect(() => {
    if (activeTab === 'automaticas') {
      fetchAutomaticas(1);
    }
  }, [activeTab, fetchAutomaticas]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(item: Novedad) {
    setEditingId(item.id);
    // Map DB column names back to form field names
    const mapped = mapDbToForm(item as unknown as Record<string, unknown>);
    setForm({
      ...EMPTY_FORM,
      ...(mapped as Partial<typeof EMPTY_FORM>),
    });
    setShowModal(true);
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      // Map form fields to DB column names before sending
      const dbFields = mapFormToDb(form as unknown as Record<string, unknown>);
      const body = editingId ? { id: editingId, ...dbFields } : dbFields;
      const res = await fetch('/api/novedades', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al guardar');
      }
      addToast('success', editingId ? 'Novedad actualizada' : 'Novedad creada correctamente');
      setShowModal(false);
      fetchManuales(manualPagination.page);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch('/api/novedades', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Error al eliminar');
      addToast('success', 'Novedad eliminada correctamente');
      setDeleteConfirm(null);
      fetchManuales(manualPagination.page);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  async function handleAplicar(id: number) {
    try {
      const res = await fetch('/api/novedades/aplicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Error al aplicar novedad');
      addToast('success', 'Novedad aplicada correctamente');
      fetchManuales(manualPagination.page);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Error desconocido');
    }
  }

  const motivoLookup = useMemo(
    () => new Map(MOTIVO_OPTIONS.map((o) => [o.value, o.label])),
    [],
  );

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novedades de Carga Académica</h1>
          <p className="mt-1 text-sm text-zinc-600">Gestiona cambios en la carga académica de docentes</p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-unisinu-600 hover:bg-unisinu-700 text-white rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="size-5" />
          Nueva Novedad
        </Button>
      </div>

      {/* Tabs and Filters */}
      <div className="space-y-4">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as 'manuales' | 'automaticas')}
        />

        {activeTab === 'manuales' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Buscar..."
              icon={<MagnifyingGlassIcon className="size-5" />}
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
            <Select
              placeholder="Tipo"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              options={[
                { value: '', label: 'Todos los tipos' },
                ...MOTIVO_OPTIONS.map((m) => ({ value: m.value, label: m.label })),
              ]}
            />
            <Select
              placeholder="Estado"
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              options={[
                { value: '', label: 'Todos los estados' },
                { value: 'pendiente', label: 'Pendiente' },
                { value: 'aprobada', label: 'Aprobada' },
                { value: 'rechazada', label: 'Rechazada' },
                { value: 'aplicada', label: 'Aplicada' },
              ]}
            />
            <Input
              placeholder="Periodo (e.g. 2026-1)"
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? 'Editar Novedad' : 'Nueva Novedad de Carga Académica'}
        size="2xl"
      >
        <NovaForm
          form={form}
          onChange={(updates) => setForm({ ...form, ...updates })}
          programas={programas}
          onSave={handleSubmit}
          saving={saving}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar eliminación"
      >
        <div className="space-y-4">
          <p className="text-zinc-600">¿Estás seguro que deseas eliminar esta novedad?</p>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Eliminar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Manuales Tab */}
      {activeTab === 'manuales' && (
        <Card>
          {manualLoading ? (
            <div className="py-12 text-center text-zinc-600">Cargando...</div>
          ) : manuales.length === 0 ? (
            <EmptyState
              title="Sin novedades"
              description="No hay novedades de carga académica registradas"
              action={
                <Button onClick={openAdd} className="bg-unisinu-600 hover:bg-unisinu-700 text-white">
                  Crear novedad
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Motivo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Docente Sale</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Asignatura</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">No. Clase</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Docente Entra</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Fecha</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {manuales.map((item, idx) => (
                    <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                      <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <span className={clsx('inline-block px-3 py-1 rounded-full text-xs font-semibold', MOTIVO_COLORS[item.motivo])}>
                          {motivoLookup.get(item.motivo) || item.motivo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900">{item.docente_saliente_nombre}</td>
                      <td className="px-6 py-4 text-sm text-zinc-900">{item.asignatura}</td>
                      <td className="px-6 py-4 text-sm text-zinc-900">{item.num_clase}</td>
                      <td className="px-6 py-4 text-sm text-zinc-900">
                        {item.docente_entrante_nombre || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx('inline-block px-3 py-1 rounded-full text-xs font-semibold', ESTADO_COLORS[item.estado])}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {new Date(item.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-unisinu-700 hover:text-unisinu-800 text-sm font-medium"
                            disabled={item.estado !== 'pendiente'}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => window.open(`/print/novedad/${item.id}`, '_blank')}
                            className="text-zinc-700 hover:text-zinc-900 text-sm font-medium inline-flex items-center gap-1"
                            title="Generar PDF para firmas"
                          >
                            PDF
                          </button>
                          {item.estado === 'aprobada' && (
                            <button
                              onClick={() => handleAplicar(item.id)}
                              className="text-green-600 hover:text-green-700 text-sm font-medium"
                            >
                              Aplicar
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                            disabled={item.estado !== 'pendiente'}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!manualLoading && manualPagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                page={manualPagination.page}
                totalPages={manualPagination.totalPages}
                onPageChange={(p) => fetchManuales(p)}
              />
            </div>
          )}
        </Card>
      )}

      {/* Automaticas Tab */}
      {activeTab === 'automaticas' && (
        <Card>
          {autoLoading ? (
            <div className="py-12 text-center text-zinc-600">Cargando...</div>
          ) : automaticas.length === 0 ? (
            <EmptyState
              title="Sin novedades automáticas"
              description="No hay novedades automáticas registradas"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">#</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Entidad</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-900">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {automaticas.map((item, idx) => (
                    <tr key={item.id} className="border-b border-zinc-200 hover:bg-zinc-50">
                      <td className="px-6 py-4 text-sm text-zinc-900 font-medium">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm text-zinc-900">{item.tipo}</td>
                      <td className="px-6 py-4 text-sm text-zinc-900">{item.entidad}</td>
                      <td className="px-6 py-4 text-sm text-zinc-900">{item.descripcion}</td>
                      <td className="px-6 py-4">
                        <span className={clsx('inline-block px-3 py-1 rounded-full text-xs font-semibold', ESTADO_COLORS[item.estado as EstadoType] || 'bg-zinc-100 text-zinc-800')}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {new Date(item.created_at).toLocaleDateString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!autoLoading && autoPagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                page={autoPagination.page}
                totalPages={autoPagination.totalPages}
                onPageChange={(p) => fetchAutomaticas(p)}
              />
            </div>
          )}
        </Card>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
