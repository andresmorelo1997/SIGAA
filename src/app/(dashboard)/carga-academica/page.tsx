'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { useToast, ToastContainer } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';

/* ================================================================== */
/*  Types                                                             */
/* ================================================================== */
interface CargaAcademica {
  id: number;
  num_clase: number;
  id_curso: number;
  creditos: number;
  seccion: number;
  estado_clase: string;
  catalogo: string;
  catalogos_excluidos: string;
  descripcion: string;
  id_instal: string;
  factor_carga: string;
  fecha_inicial: string;
  fecha_final: string;
  fecha_ini_santa: string;
  fecha_final_santa: string;
  semanas: number;
  hora_inicio: string;
  hora_fin: string;
  jornada: string;
  lunes: string;
  martes: string;
  miercoles: string;
  jueves: string;
  viernes: string;
  sabado: string;
  domingo: string;
  capacidad_inscripcion: number;
  capacidad_aula: number;
  total_inscripciones: number;
  total_horas_curso: number;
  grupo_academico: string;
  org_academica: string;
  desc_org_academica: string;
  campus: string;
  nombre_instructor: string;
  acceso: string;
  institucion: string;
  instructor_id: string;
  grado: string;
  ciclo_lectivo: string;
  num_dias: number;
  horas_clase: string;
  hrs_diurna: number;
  hrs_nocturna: number;
  hrs_noct_final: number;
  componente: string;
  horas_profesor: number;
  hrs_semanal: number;
  hrs_semestre: number;
  horas_carga_trabajo: number;
  atrib_curso: string;
  atrib_curso_2: string;
  tipo_curso: string;
  archivo_origen: string;
  fecha_importacion: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ApiResponse {
  data: CargaAcademica[];
  pagination: PaginationState;
}

interface ImportResult {
  message: string;
  imported?: number;
  errors?: string[];
}

type SortDir = 'asc' | 'desc';

interface DropdownOption {
  value: string;
  label: string;
}

/* ================================================================== */
/*  Column definitions                                                */
/* ================================================================== */
interface ColumnDef {
  key: keyof CargaAcademica;
  label: string;
  width: string;
  editable?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'num_clase', label: 'N Clase', width: '90px', editable: true },
  { key: 'id_curso', label: 'ID Curso', width: '90px', editable: true },
  { key: 'creditos', label: 'Cred.', width: '65px', editable: true },
  { key: 'seccion', label: 'Secc.', width: '65px', editable: true },
  { key: 'estado_clase', label: 'Estado', width: '100px', editable: true },
  { key: 'catalogo', label: 'Cat\u00e1logo', width: '100px', editable: true },
  { key: 'descripcion', label: 'Descripci\u00f3n', width: '200px', editable: true },
  { key: 'hora_inicio', label: 'H. Inicio', width: '90px', editable: true },
  { key: 'hora_fin', label: 'H. Fin', width: '90px', editable: true },
  { key: 'jornada', label: 'Jornada', width: '90px', editable: true },
  { key: 'lunes', label: 'L', width: '45px', editable: true },
  { key: 'martes', label: 'M', width: '45px', editable: true },
  { key: 'miercoles', label: 'Mi', width: '45px', editable: true },
  { key: 'jueves', label: 'J', width: '45px', editable: true },
  { key: 'viernes', label: 'V', width: '45px', editable: true },
  { key: 'sabado', label: 'S', width: '45px', editable: true },
  { key: 'domingo', label: 'D', width: '45px', editable: true },
  { key: 'nombre_instructor', label: 'Instructor', width: '180px', editable: true },
  { key: 'grupo_academico', label: 'Grupo Acad', width: '110px', editable: true },
  { key: 'org_academica', label: 'Org Acad\u00e9mica', width: '130px', editable: true },
  { key: 'campus', label: 'Campus', width: '100px', editable: true },
  { key: 'grado', label: 'Grado', width: '80px', editable: true },
  { key: 'hrs_semanal', label: 'Hrs Semanal', width: '100px', editable: true },
  { key: 'hrs_semestre', label: 'Hrs Semestre', width: '110px', editable: true },
];

/* ================================================================== */
/*  Utility helpers                                                   */
/* ================================================================== */
function rowBg(estado: string): string {
  const s = (estado ?? '').toLowerCase();
  if (s === 'inactivo') return 'bg-yellow-50';
  if (s === 'cancelado') return 'bg-red-50';
  return 'bg-white';
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/* ================================================================== */
/*  Inline SVG icons (compact)                                        */
/* ================================================================== */
function IconChevronUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/* ================================================================== */
/*  Editable Cell                                                     */
/* ================================================================== */
function EditableCell({
  value,
  row,
  column,
  onSave,
}: {
  value: string | number;
  row: CargaAcademica;
  column: keyof CargaAcademica;
  onSave: (id: number, field: keyof CargaAcademica, value: string | number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      setDraft(String(value ?? ''));
    }
  }, [value, editing]);

  function commit() {
    setEditing(false);
    const original = String(value ?? '');
    if (draft !== original) {
      const numericFields = new Set<keyof CargaAcademica>([
        'num_clase', 'id_curso', 'creditos', 'seccion', 'semanas',
        'capacidad_inscripcion', 'capacidad_aula', 'total_inscripciones',
        'total_horas_curso', 'num_dias', 'hrs_diurna', 'hrs_nocturna',
        'hrs_noct_final', 'horas_profesor', 'hrs_semanal', 'hrs_semestre',
        'horas_carga_trabajo',
      ]);
      const finalValue = numericFields.has(column)
        ? Number(draft) || 0
        : draft;
      onSave(row.id, column, finalValue);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commit();
    } else if (e.key === 'Escape') {
      setDraft(String(value ?? ''));
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full rounded border border-blue-400 bg-white px-1.5 py-0.5 text-sm outline-none ring-1 ring-blue-300"
      />
    );
  }

  return (
    <div
      className="cursor-pointer truncate rounded px-1.5 py-0.5 hover:bg-blue-50"
      onClick={() => setEditing(true)}
      title={String(value ?? '')}
    >
      {String(value ?? '') || '\u00A0'}
    </div>
  );
}

/* ================================================================== */
/*  Detail Modal                                                      */
/* ================================================================== */
interface ModalSection {
  title: string;
  fields: { key: keyof CargaAcademica; label: string }[];
}

const MODAL_SECTIONS: ModalSection[] = [
  {
    title: 'Informaci\u00f3n General',
    fields: [
      { key: 'num_clase', label: 'N Clase' },
      { key: 'id_curso', label: 'ID Curso' },
      { key: 'creditos', label: 'Cr\u00e9ditos' },
      { key: 'seccion', label: 'Secci\u00f3n' },
      { key: 'estado_clase', label: 'Estado' },
      { key: 'catalogo', label: 'Cat\u00e1logo' },
      { key: 'catalogos_excluidos', label: 'Cat\u00e1logos Excluidos' },
      { key: 'descripcion', label: 'Descripci\u00f3n' },
      { key: 'id_instal', label: 'ID Instalaci\u00f3n' },
      { key: 'factor_carga', label: 'Factor de Carga' },
      { key: 'grado', label: 'Grado' },
      { key: 'ciclo_lectivo', label: 'Ciclo Lectivo' },
      { key: 'componente', label: 'Componente' },
      { key: 'tipo_curso', label: 'Tipo Curso' },
      { key: 'atrib_curso', label: 'Atributo Curso' },
      { key: 'atrib_curso_2', label: 'Atributo Curso 2' },
    ],
  },
  {
    title: 'Horarios',
    fields: [
      { key: 'hora_inicio', label: 'Hora Inicio' },
      { key: 'hora_fin', label: 'Hora Fin' },
      { key: 'jornada', label: 'Jornada' },
      { key: 'lunes', label: 'Lunes' },
      { key: 'martes', label: 'Martes' },
      { key: 'miercoles', label: 'Mi\u00e9rcoles' },
      { key: 'jueves', label: 'Jueves' },
      { key: 'viernes', label: 'Viernes' },
      { key: 'sabado', label: 'S\u00e1bado' },
      { key: 'domingo', label: 'Domingo' },
      { key: 'fecha_inicial', label: 'Fecha Inicial' },
      { key: 'fecha_final', label: 'Fecha Final' },
      { key: 'fecha_ini_santa', label: 'Fecha Ini Santa' },
      { key: 'fecha_final_santa', label: 'Fecha Final Santa' },
      { key: 'semanas', label: 'Semanas' },
      { key: 'num_dias', label: 'Num D\u00edas' },
    ],
  },
  {
    title: 'Capacidades',
    fields: [
      { key: 'capacidad_inscripcion', label: 'Capacidad Inscripci\u00f3n' },
      { key: 'capacidad_aula', label: 'Capacidad Aula' },
      { key: 'total_inscripciones', label: 'Total Inscripciones' },
    ],
  },
  {
    title: 'Instructor',
    fields: [
      { key: 'nombre_instructor', label: 'Nombre Instructor' },
      { key: 'instructor_id', label: 'ID Instructor' },
      { key: 'acceso', label: 'Acceso' },
      { key: 'institucion', label: 'Instituci\u00f3n' },
      { key: 'grupo_academico', label: 'Grupo Acad\u00e9mico' },
      { key: 'org_academica', label: 'Org Acad\u00e9mica' },
      { key: 'desc_org_academica', label: 'Desc Org Acad\u00e9mica' },
      { key: 'campus', label: 'Campus' },
    ],
  },
  {
    title: 'Horas',
    fields: [
      { key: 'total_horas_curso', label: 'Total Horas Curso' },
      { key: 'horas_clase', label: 'Horas Clase' },
      { key: 'hrs_diurna', label: 'Hrs Diurna' },
      { key: 'hrs_nocturna', label: 'Hrs Nocturna' },
      { key: 'hrs_noct_final', label: 'Hrs Noct Final' },
      { key: 'horas_profesor', label: 'Horas Profesor' },
      { key: 'hrs_semanal', label: 'Hrs Semanal' },
      { key: 'hrs_semestre', label: 'Hrs Semestre' },
      { key: 'horas_carga_trabajo', label: 'Horas Carga Trabajo' },
    ],
  },
];

function DetailModal({
  record,
  onClose,
  onSave,
}: {
  record: CargaAcademica;
  onClose: () => void;
  onSave: (updated: CargaAcademica) => void;
}) {
  const [form, setForm] = useState<CargaAcademica>({ ...record });
  const [saving, setSaving] = useState(false);

  function handleChange(key: keyof CargaAcademica, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { id, ...fields } = form;
      const res = await fetch('/api/carga-academica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      onSave(form);
      onClose();
    } catch {
      // error handled by parent via toast
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-gray-800">
            Detalle Clase #{record.num_clase}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <IconX />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-6">
          {MODAL_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#1e3a5f]">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map((f) => (
                  <div key={f.key}>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      {f.label}
                    </label>
                    <input
                      value={String(form[f.key] ?? '')}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#1e3a5f]">
              {"Importaci\u00f3n"}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Archivo Origen
                </label>
                <input
                  value={String(form.archivo_origen ?? '')}
                  disabled
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  {"Fecha Importaci\u00f3n"}
                </label>
                <input
                  value={String(form.fecha_importacion ?? '')}
                  disabled
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page Component                                               */
/* ================================================================== */
export default function CargaAcademicaPage() {
  /* ---------- state ---------- */
  const [data, setData] = useState<CargaAcademica[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [grado, setGrado] = useState('');
  const [ciclo, setCiclo] = useState('');
  const [campus, setCampus] = useState('');
  const [sortBy, setSortBy] = useState<keyof CargaAcademica | ''>('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [detailRecord, setDetailRecord] = useState<CargaAcademica | null>(null);

  // Import
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Dropdown options from /api/ciclos
  const [cicloOptions, setCicloOptions] = useState<DropdownOption[]>([]);
  const [gradoOptions, setGradoOptions] = useState<DropdownOption[]>([]);
  const [campusOptions, setCampusOptions] = useState<DropdownOption[]>([]);

  const { toasts, addToast, removeToast } = useToast();

  /* ---------- fetch dropdown options from /api/ciclos ---------- */
  useEffect(() => {
    async function fetchCiclos() {
      try {
        const res = await fetch('/api/ciclos');
        if (!res.ok) return;
        const json = await res.json();
        if (json.ciclos) setCicloOptions(json.ciclos);
        if (json.grados) setGradoOptions(json.grados);
        if (json.campus) setCampusOptions(json.campus);
      } catch {
        /* silent */
      }
    }
    fetchCiclos();
  }, []);

  /* ---------- fetch data ---------- */
  const fetchData = useCallback(
    async (pageOverride?: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(pageOverride ?? pagination.page));
        params.set('limit', String(pagination.limit));
        if (search) params.set('search', search);
        if (estado) params.set('estado', estado);
        if (grado) params.set('grado', grado);
        if (ciclo) params.set('ciclo_lectivo', ciclo);
        if (campus) params.set('campus', campus);

        const res = await fetch(`/api/carga-academica?${params.toString()}`);
        if (!res.ok) throw new Error('Error al cargar datos');
        const json: ApiResponse = await res.json();
        setData(json.data);
        setPagination(json.pagination);
      } catch {
        addToast('error', 'Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, search, estado, grado, ciclo, campus, addToast]
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, estado, grado, ciclo, campus]);

  /* Debounced search */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(
    debounce(() => {
      fetchData(1);
    }, 400),
    [fetchData]
  );

  useEffect(() => {
    debouncedFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  /* ---------- sort (client-side on current page) ---------- */
  const sortedData = (() => {
    if (!sortBy) return data;
    return [...data].sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  })();

  function toggleSort(col: keyof CargaAcademica) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  }

  /* ---------- inline cell save ---------- */
  async function handleCellSave(
    id: number,
    field: keyof CargaAcademica,
    value: string | number
  ) {
    setData((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    try {
      const res = await fetch('/api/carga-academica', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!res.ok) throw new Error('Error al guardar');
    } catch {
      addToast('error', 'Error al guardar el campo');
      fetchData();
    }
  }

  /* ---------- selection ---------- */
  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectAll) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((r) => r.id)));
    }
    setSelectAll(!selectAll);
  }

  /* ---------- bulk actions ---------- */
  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Eliminar ${selected.size} registro(s)?`)) return;

    try {
      const promises = Array.from(selected).map((id) =>
        fetch(`/api/carga-academica?id=${id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      setSelected(new Set());
      setSelectAll(false);
      addToast('success', `${selected.size} registro(s) eliminado(s)`);
      fetchData();
    } catch {
      addToast('error', 'Error al eliminar registros');
    }
  }

  async function handleBulkEstado(newEstado: string) {
    if (selected.size === 0) return;
    try {
      const promises = Array.from(selected).map((id) =>
        fetch('/api/carga-academica', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, estado_clase: newEstado }),
        })
      );
      await Promise.all(promises);
      setSelected(new Set());
      setSelectAll(false);
      addToast('success', `${selected.size} registro(s) actualizado(s) a "${newEstado}"`);
      fetchData();
    } catch {
      addToast('error', 'Error al actualizar registros');
    }
  }

  /* ---------- import (immediate on file select) ---------- */
  async function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      addToast('error', 'Solo se permiten archivos Excel (.xlsx, .xls)');
      return;
    }
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/carga-academica/import', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en importaci\u00f3n');
      addToast('success', json.message || `Importados: ${json.imported || 0} registros`);
      fetchData(1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error en importaci\u00f3n';
      addToast('error', msg);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /* ---------- export ---------- */
  async function handleExportExcel() {
    setShowExportMenu(false);
    try {
      const res = await fetch('/api/carga-academica/export');
      if (!res.ok) throw new Error('Error al exportar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carga_academica_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Archivo Excel exportado');
    } catch {
      addToast('error', 'Error al exportar datos');
    }
  }

  async function handleExportPDF() {
    setShowExportMenu(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (estado) params.set('estado', estado);
      if (grado) params.set('grado', grado);
      if (ciclo) params.set('ciclo_lectivo', ciclo);
      if (campus) params.set('campus', campus);
      params.set('format', 'pdf');
      const res = await fetch(`/api/carga-academica/export?${params.toString()}`);
      if (!res.ok) throw new Error('Error al exportar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carga_academica_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('success', 'Archivo PDF exportado');
    } catch {
      addToast('error', 'Error al exportar PDF');
    }
  }

  /* ---------- detail modal save ---------- */
  function handleDetailSave(updated: CargaAcademica) {
    setData((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    );
    addToast('success', 'Registro actualizado exitosamente');
  }

  /* ---------- reset filters ---------- */
  function resetFilters() {
    setSearch('');
    setEstado('');
    setGrado('');
    setCiclo('');
    setCampus('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  }

  /* ---------- pagination helpers ---------- */
  function goToPage(p: number) {
    setPagination((prev) => ({ ...prev, page: p }));
    setSelected(new Set());
    setSelectAll(false);
  }

  function changeLimit(newLimit: number) {
    setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }));
    setSelected(new Set());
    setSelectAll(false);
  }

  const hasActiveFilters = search || estado || grado || ciclo || campus;

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */
  return (
    <div className="flex flex-col gap-3 h-full min-w-0">
      {/* Detail modal */}
      {detailRecord && (
        <DetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onSave={handleDetailSave}
        />
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Header bar: title + import/export buttons                  */}
      {/* ---------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-zinc-950 dark:text-white">
          {"Carga Acad\u00e9mica"}
        </h1>
        <div className="flex items-center gap-2">
          {/* Import button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            loading={importing}
            onClick={() => fileInputRef.current?.click()}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            }
          >
            Importar
          </Button>

          {/* Export dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowExportMenu(!showExportMenu)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              {"Exportar \u25BE"}
            </Button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-zinc-200 bg-white shadow-lg dark:bg-zinc-900 dark:border-zinc-700">
                  <button
                    onClick={handleExportExcel}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-t-lg"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-b-lg"
                  >
                    PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  Filter bar                                                 */}
      {/* ---------------------------------------------------------- */}
      <div className="flex flex-wrap items-end gap-2 flex-shrink-0">
        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder={"Buscar descripci\u00f3n, instructor, cat\u00e1logo..."}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            icon={
              <MagnifyingGlassIcon className="size-4 text-zinc-400" />
            }
          />
        </div>

        {/* Ciclo */}
        <div className="w-40">
          <Select
            value={ciclo}
            onChange={(e) => {
              setCiclo(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Ciclo"
            options={cicloOptions}
          />
        </div>

        {/* Grado */}
        <div className="w-32">
          <Select
            value={grado}
            onChange={(e) => {
              setGrado(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Grado"
            options={gradoOptions}
          />
        </div>

        {/* Campus */}
        <div className="w-36">
          <Select
            value={campus}
            onChange={(e) => {
              setCampus(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Campus"
            options={campusOptions}
          />
        </div>

        {/* Estado */}
        <div className="w-32">
          <Select
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Estado"
            options={[
              { value: 'Activo', label: 'Activo' },
              { value: 'Inactivo', label: 'Inactivo' },
              { value: 'Cancelado', label: 'Cancelado' },
            ]}
          />
        </div>

        {/* Clear filters + result count */}
        <div className="flex items-center gap-2 ml-auto">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <IconX />
              Limpiar
            </button>
          )}
          <Badge color="zinc">
            {pagination.total.toLocaleString('es-CO')} resultados
          </Badge>
        </div>
      </div>

      {/* ---------------------------------------------------------- */}
      {/*  Bulk actions bar                                           */}
      {/* ---------------------------------------------------------- */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-200 dark:ring-blue-500/20 px-4 py-2 flex-shrink-0">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {selected.size} seleccionado(s)
          </span>
          <div className="h-4 w-px bg-blue-200 dark:bg-blue-500/30" />
          <Button variant="red" size="sm" onClick={handleBulkDelete} icon={<IconTrash />}>
            Eliminar
          </Button>
          <Button variant="green" size="sm" onClick={() => handleBulkEstado('Activo')}>
            Activar
          </Button>
          <Button variant="amber" size="sm" onClick={() => handleBulkEstado('Inactivo')}>
            Inactivar
          </Button>
          <Button variant="red" size="sm" onClick={() => handleBulkEstado('Cancelado')}>
            Cancelar
          </Button>
          <button
            onClick={() => { setSelected(new Set()); setSelectAll(false); }}
            className="ml-auto text-xs text-blue-600 hover:underline"
          >
            Deseleccionar todo
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------- */}
      {/*  Data table (fills remaining space)                         */}
      {/* ---------------------------------------------------------- */}
      <div className="flex-1 min-h-0 min-w-0 rounded-lg bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'auto' }}>
          <table className="w-full" style={{ minWidth: '1600px' }}>
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="sticky left-0 z-20 w-10 bg-zinc-50 dark:bg-zinc-800 px-3 border-b border-zinc-200 dark:border-zinc-700" style={{ minWidth: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th
                  className="sticky left-10 z-20 bg-zinc-50 dark:bg-zinc-800 cursor-pointer select-none border-b border-zinc-200 dark:border-zinc-700 px-2 py-2 text-xs font-medium text-zinc-500"
                  style={{ minWidth: '70px' }}
                  onClick={() => toggleSort('num_clase')}
                >
                  <div className="flex items-center gap-1">
                    #
                    {sortBy === 'num_clase' && (sortDir === 'asc' ? <IconChevronUp /> : <IconChevronDown />)}
                  </div>
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="cursor-pointer select-none whitespace-nowrap bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 px-2 py-2 text-xs font-medium text-zinc-500"
                    style={{ minWidth: col.width }}
                    onClick={() => toggleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (sortDir === 'asc' ? <IconChevronUp /> : <IconChevronDown />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="sticky left-0 z-10 bg-white px-3 py-2">
                      <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="sticky left-10 z-10 bg-white px-2 py-2">
                      <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="px-2 py-2">
                        <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 2} className="py-12 text-center text-sm text-gray-400">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr key={row.id} className={`${rowBg(row.estado_clase)} transition-colors`}>
                    <td className={`sticky left-0 z-10 px-3 py-1 ${rowBg(row.estado_clase)}`}>
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className={`sticky left-10 z-10 px-2 py-1 ${rowBg(row.estado_clase)}`}>
                      <button
                        onClick={() => setDetailRecord(row)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-sm"
                        title="Ver detalle"
                      >
                        {row.num_clase}
                      </button>
                    </td>
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="!p-1 text-sm">
                        {col.editable ? (
                          <EditableCell
                            value={row[col.key]}
                            row={row}
                            column={col.key}
                            onSave={handleCellSave}
                          />
                        ) : (
                          <span className="truncate px-1.5">
                            {String(row[col.key] ?? '')}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="border-t border-zinc-200 dark:border-zinc-700 px-4 py-2 flex-shrink-0">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={goToPage}
            onLimitChange={changeLimit}
            limitOptions={[25, 50, 100]}
          />
        </div>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
