import { NextRequest } from 'next/server';
import db from '@/lib/db';
import * as XLSX from 'xlsx';
import {
  detectFileType,
  extractMetadata,
  findHeaderRow,
  parseRows,
  bulkUpsert,
  autoCreateDocentes,
  autoCreateProgramas,
  autoCreatePlanEstudios,
  detectNovedades,
  createCorteCarga,
  asignarConsecutivoNovedad,
  KNOWN_HEADERS,
  type FileType,
  type ElysaMetadata,
  type UpsertResult,
} from '@/lib/import-helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────
// Column mappings: Excel header → DB column
// ─────────────────────────────────────────────────────────────

const CARGA_COLUMN_MAP: Record<string, string> = {
  'Nº Clase': 'num_clase',
  'ID Curso': 'id_curso',
  'Crd': 'creditos',
  'Creditos': 'creditos',
  'Sección': 'seccion',
  'Estado Clase': 'estado_clase',
  'Catálogo': 'catalogo',
  'CATALOGOS EXCLUIDOS': 'catalogos_excluidos',
  // Descripción/Asignaturas: primera columna "Descripción" va a `descripcion`
  // (el parser maneja duplicados). Post-macro la primera fue renombrada
  // a "Asignaturas".
  'Asignaturas': 'descripcion',
  'ID Instal': 'id_instal',
  'Factor Carga': 'factor_carga',
  'F Inicial': 'fecha_inicial',
  'Fecha Final': 'fecha_final',
  'Fecha Ini Santa': 'fecha_ini_santa',
  'Fecha Final Santa': 'fecha_final_santa',
  'Semanas': 'semanas',
  'Hr Ini Final': 'hr_ini_final',
  'Hora Inicio': 'hora_inicio',
  'Hora Fin': 'hora_fin',
  'Jornada': 'jornada',
  'Lunes': 'lunes',
  'Dias Lunes': 'dias_lunes',
  'Martes': 'martes',
  'Dias Martes': 'dias_martes',
  'Miércoles': 'miercoles',
  'Dias Miercoles': 'dias_miercoles',
  'Jueves': 'jueves',
  'Dias Jueves': 'dias_jueves',
  'Viernes': 'viernes',
  'Dias Viernes': 'dias_viernes',
  'Sábado': 'sabado',
  'Dias Sabados': 'dias_sabados',
  'Domingo': 'domingo',
  'Dias Domingos': 'dias_domingos',
  'Capcidad Inscripción': 'capacidad_inscripcion',
  // Post-macro "Capcidad Inscripción" se renombra a "Cupos"
  'Cupos': 'capacidad_inscripcion',
  'Capcidad Aula': 'capacidad_aula',
  'Total Inscripciones': 'total_inscripciones',
  'Total Horas Curso': 'total_horas_curso',
  'Grupo Académico': 'grupo_academico',
  'Organización Académica': 'org_academica',
  // Post-macro la 2ª "Descripción" se renombra a "Org. Academica"
  'Org. Academica': 'desc_org_academica',
  'Campus': 'campus',
  'Nombre Instructor': 'nombre_instructor',
  'Acceso': 'acceso',
  'Institución': 'institucion',
  'Instructor': 'instructor_id',
  'Grado': 'grado',
  'Ccl Lvo': 'ciclo_lectivo',
  'No. Días': 'num_dias',
  'Horas Clase': 'horas_clase',
  'Hrs Diurna': 'hrs_diurna',
  'Hrs Noc': 'hrs_nocturna',
  'Hrs Noct Final': 'hrs_noct_final',
  'Cpte': 'componente',
  'Horas c/Profesor': 'horas_profesor',
  'Hrs Semanal': 'hrs_semanal',
  'Hrs Semestre': 'hrs_semestre',
  'Horas Carga Trabj': 'horas_carga_trabajo',
  'Atrib Cso': 'atrib_curso',
  'Atributo Curso 2': 'atrib_curso_2',
  'TIPO CURSO': 'tipo_curso',
};

const CARGA_DB_COLUMNS = [
  'num_clase', 'id_curso', 'creditos', 'seccion', 'estado_clase', 'catalogo',
  'catalogos_excluidos', 'descripcion', 'id_instal', 'factor_carga',
  'fecha_inicial', 'fecha_final', 'fecha_ini_santa', 'fecha_final_santa',
  'semanas', 'hr_ini_final', 'hora_inicio', 'hora_fin', 'jornada',
  'lunes', 'dias_lunes', 'martes', 'dias_martes', 'miercoles', 'dias_miercoles',
  'jueves', 'dias_jueves', 'viernes', 'dias_viernes', 'sabado', 'dias_sabados',
  'domingo', 'dias_domingos',
  'capacidad_inscripcion', 'capacidad_aula', 'total_inscripciones',
  'total_horas_curso', 'grupo_academico', 'org_academica', 'desc_org_academica',
  'campus', 'nombre_instructor', 'acceso', 'institucion', 'instructor_id',
  'grado', 'ciclo_lectivo', 'num_dias', 'horas_clase', 'hrs_diurna',
  'hrs_nocturna', 'hrs_noct_final', 'componente', 'horas_profesor',
  'hrs_semanal', 'hrs_semestre', 'horas_carga_trabajo', 'atrib_curso',
  'atrib_curso_2', 'tipo_curso', 'archivo_origen', 'fecha_importacion', 'import_id',
];

const CARGA_CONFLICT_COLS = ['num_clase', 'ciclo_lectivo', 'hora_inicio', 'hora_fin'];

const DOCENTES_COLUMN_MAP: Record<string, string> = {
  'Ccl Lvo': 'ciclo_lectivo',
  'Ciclo Lectivo': 'ciclo_lectivo',
  'Campus': 'campus',
  'ID': 'instructor_id',
  'Instructor': 'instructor_id',
  'Primer Nombre': 'primer_nombre',
  'Segundo Nombre': 'segundo_nombre',
  'Primer Apellido': 'primer_apellido',
  'Segundo Apellido': 'segundo_apellido',
  'Tp Doc ID': 'tipo_doc',
  'Tipo Doc': 'tipo_doc',
  'Tipo Documento': 'tipo_doc',
  'Doc ID': 'doc_id',
  'Documento': 'doc_id',
  'Cedula': 'doc_id',
  'Ciudad': 'ciudad',
  'Direc 1': 'direccion',
  'Dirección': 'direccion',
  'Direccion': 'direccion',
  'Teléfono': 'telefono',
  'Telefono': 'telefono',
  'Correo-E': 'correo',
  'Correo': 'correo',
  'Email': 'correo',
  'Fecha Inicio': 'fecha_inicio',
  'Fecha Final': 'fecha_final',
};

const DOCENTES_DB_COLUMNS = [
  'ciclo_lectivo', 'campus', 'instructor_id', 'primer_nombre', 'segundo_nombre',
  'primer_apellido', 'segundo_apellido', 'tipo_doc', 'doc_id', 'ciudad',
  'direccion', 'telefono', 'correo', 'fecha_inicio', 'fecha_final', 'import_id',
];

const DOCENTES_CONFLICT_COLS = ['doc_id', 'ciclo_lectivo'];

const PROF_ASIG_COLUMN_MAP: Record<string, string> = {
  'ID': 'docente_id',
  'Nombre': 'instructor',
  'Doc ID': 'cedula',
  'Nº Clase': 'clase',
  'Org Acad Clase': 'org_acad_clase',
  'Materia': 'materia',
  'Catálogo': 'catalogo',
  'Catalogo': 'catalogo',
  'Cpte': 'componente',
  'Título Clase': 'asignatura',
  'Titulo Clase': 'asignatura',
  'Hora Inicio': 'hora_inicio',
  'Hora Fin': 'hora_fin',
  'Lun': 'lunes',
  'Mart': 'martes',
  'Miérc': 'miercoles',
  'Mierc': 'miercoles',
  'Jue': 'jueves',
  'Vier': 'viernes',
  'Sáb': 'sabado',
  'Sab': 'sabado',
  'Dom': 'domingo',
  'Tema Libre': 'tema_libre',
  'Ccl Lvo': 'ciclo_lectivo',
  'Campus': 'campus',
  'Grado': 'grado',
  'Dedicación': 'dedicacion',
  'Dedicacion': 'dedicacion',
  'Inscritos': 'inscritos',
  'Total Inscripciones': 'inscritos',
  'F Inicial': 'fecha_inicial',
  'Fecha Inicial': 'fecha_inicial',
  'Fecha Final': 'fecha_final',
  'Total Horas Curso': 'total_hrs_curso',
  'Hrs Semanal': 'hrs_semanal',
  'Hrs Semestre': 'hrs_semestre',
  'Atrib Cso': 'atrib_curso',
  'Atributo Curso': 'atrib_curso',
  'Programa Académico': 'programa_academico',
  'Programa Academico': 'programa_academico',
  'Programa': 'programa_academico',
  'Modalidad': 'modalidad',
  'Cohorte': 'cohorte',
  'Semestre': 'semestre',
};

const PROF_ASIG_DB_COLUMNS = [
  'instructor', 'docente_id', 'clase', 'programa_academico', 'grado',
  'modalidad', 'cohorte', 'semestre', 'cedula', 'dedicacion', 'catalogo',
  'asignatura', 'inscritos', 'componente', 'atrib_curso', 'fecha_inicial',
  'fecha_final', 'total_hrs_curso', 'hrs_semanal', 'hrs_semestre',
  'org_acad_clase', 'materia', 'hora_inicio', 'hora_fin',
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
  'tema_libre', 'ciclo_lectivo', 'campus', 'import_id',
];

const PROF_ASIG_CONFLICT_COLS = ['clase', 'docente_id', 'catalogo'];

// ─────────────────────────────────────────────────────────────
// SNIES / Docentes_IES column maps
// ─────────────────────────────────────────────────────────────

const SNIES_IES_COLUMN_MAP: Record<string, string> = {
  'NUM_DOCUMENTO': 'doc_id',
  'PRIMER_NOMBRE': 'primer_nombre',
  'SEGUNDO_NOMBRE': 'segundo_nombre',
  'PRIMER_APELLIDO': 'primer_apellido',
  'SEGUNDO_APELLIDO': 'segundo_apellido',
  'ID_TIPO_DOCUMENTO': 'tipo_doc',
  'FECHA_NACIMIENTO': 'fecha_nacimiento',
  'ID_PAIS_NACIMIENTO': 'id_pais_nacimiento',
  'ID_MUNICIPIO_NACIMIENTO': 'id_municipio_nacimiento',
  'EMAIL_INSTITUCIONAL': 'email_institucional',
  'ID_NIVEL_ESTUDIO_DOCENTE': 'id_nivel_max_estudio',
  'TITULO_RECIBIDO': 'titulo_recibido',
  'FECHA_GRADO': 'fecha_grado',
  'ID_PAIS_INSTITUCION_ESTUDIO': 'id_pais_institucion_estudio',
  'TITULO_CONVALIDADO': 'titulo_convalidado',
  'ID_IES_ESTUDIO': 'id_ies_estudio',
  'NOMBRE_INSTITUCION_ESTUDIO': 'nombre_institucion_estudio',
  'ID_METODOLOGIA_PROGRAMA': 'id_metodologia_programa',
  'FECHA_INGRESO_IES': 'fecha_ingreso_ies',
};

const SNIES_IES_DB_COLUMNS = [
  'doc_id', 'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido',
  'tipo_doc', 'fecha_nacimiento', 'id_pais_nacimiento', 'id_municipio_nacimiento',
  'email_institucional', 'id_nivel_max_estudio', 'titulo_recibido', 'fecha_grado',
  'id_pais_institucion_estudio', 'titulo_convalidado', 'id_ies_estudio',
  'nombre_institucion_estudio', 'id_metodologia_programa', 'fecha_ingreso_ies',
  'ciclo_lectivo', 'import_id',
];

const SNIES_CONTRATO_COLUMN_MAP: Record<string, string> = {
  'NUM_DOCUMENTO': 'doc_id',
  'TIPO_CONTRATO': 'tipo_contrato',
  'DEDICACION': 'dedicacion',
  'ID_METODOLOGIA_CONTRATO': 'metodologia_contrato',
  'NIVEL_CONTRATO': 'nivel_contrato',
  'HORAS_DEDICACION_SEMESTRE': 'horas_dedicacion_semestre',
  'ASIGNACION_BASICA_MENSUAL': 'asignacion_basica_mensual',
  'PCT_DOCENCIA': 'pct_docencia',
  'PCT_INVESTIGACION': 'pct_investigacion',
  'PCT_ADMINISTRATIVA': 'pct_administrativa',
  'PCT_EXTENSION': 'pct_extension',
  'PCT_OTRAS': 'pct_otras',
};

const SNIES_CONTRATO_DB_COLUMNS = [
  'doc_id', 'tipo_contrato', 'dedicacion', 'metodologia_contrato', 'nivel_contrato',
  'horas_dedicacion_semestre', 'asignacion_basica_mensual',
  'pct_docencia', 'pct_investigacion', 'pct_administrativa', 'pct_extension', 'pct_otras',
  'ciclo_lectivo', 'import_id',
];

const SNIES_CAPACITACION_COLUMN_MAP: Record<string, string> = {
  'NUM_DOCUMENTO': 'doc_id',
  'ANIO': 'anio',
  'SEMESTRE': 'semestre',
  'TIPO_CAPACITACION': 'tipo_capacitacion',
  'NUM_HORAS': 'num_horas',
  'TIPO_CURSO': 'tipo_curso',
  'TEMA_CURSO': 'tema_curso',
  'PAIS': 'pais',
  'NOMBRE_CURSO': 'nombre_curso',
};

const SNIES_CAPACITACION_DB_COLUMNS = [
  'doc_id', 'anio', 'semestre', 'tipo_capacitacion', 'num_horas',
  'tipo_curso', 'tema_curso', 'pais', 'nombre_curso', 'import_id',
];

// ─────────────────────────────────────────────────────────────
// Per-file result type
// ─────────────────────────────────────────────────────────────

interface FileImportResult {
  filename: string;
  fileType: FileType;
  status: 'completed' | 'error';
  error?: string;
  metadata?: ElysaMetadata;
  tables: Record<string, UpsertResult>;
  docentesAutoCreated: number;
  novedadesDetected: number;
  importId: number;
  /** ID del corte/snapshot creado automáticamente antes del import (si se creó) */
  snapshotCorteId?: number;
  /** Campus filter applied after parse (if any). */
  campusFilterApplied?: { kept: string[]; removed: number };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function createImportRecord(filename: string, fileSize: number, fileBlob?: Buffer): number {
  const result = db
    .prepare(
      `INSERT INTO import_history (filename, file_type, file_size, status, created_at, file_blob)
       VALUES (?, 'UNKNOWN', ?, 'processing', ?, ?)`,
    )
    .run(filename, fileSize, new Date().toISOString(), fileBlob ?? null);
  return Number(result.lastInsertRowid);
}

function updateImportRecord(
  importId: number,
  updates: {
    fileType: string;
    cicloLectivo?: string;
    grado?: string;
    campus?: string;
    inserted: number;
    updated: number;
    skipped: number;
    tablesAffected: string;
    status: string;
    errorMessage?: string;
  },
): void {
  db.prepare(
    `UPDATE import_history SET
       file_type = ?,
       ciclo_lectivo = ?,
       grado = ?,
       campus = ?,
       records_inserted = ?,
       records_updated = ?,
       records_skipped = ?,
       tables_affected = ?,
       status = ?,
       error_message = ?
     WHERE id = ?`,
  ).run(
    updates.fileType,
    updates.cicloLectivo ?? null,
    updates.grado ?? null,
    updates.campus ?? null,
    updates.inserted,
    updates.updated,
    updates.skipped,
    updates.tablesAffected,
    updates.status,
    updates.errorMessage ?? null,
    importId,
  );
}

/**
 * Get the ciclo_lectivo to use. Priority:
 * 1. Elysa metadata (from the file itself)
 * 2. System parameter "periodo_actual"
 * 3. Fallback empty string
 */
function resolveCicloLectivo(metadata?: ElysaMetadata): string {
  if (metadata?.cicloLectivo) return metadata.cicloLectivo;

  const param = db
    .prepare(`SELECT valor FROM parametros WHERE clave = 'periodo_actual'`)
    .get() as { valor: string } | undefined;

  return param?.valor ?? '';
}

// ─────────────────────────────────────────────────────────────
// Replicación 1:1 del macro VBA "MacroProgramacionAcademicafinal"
// (archivo: "macros programacion 2026_1_1ros periodos mejorada final.xlsm")
//
// Cada vez que se importa carga_academica, se ejecuta esta función sobre
// todas las filas del import para derivar:
//   - catalogos_excluidos ("SI"/"NO" según lista MEDIC)
//   - fecha_ini_santa / fecha_final_santa (por defecto 2026-03-30 / 2026-04-05)
//   - semanas (ROUND((fin-ini)/7) - resta_semana_santa)
//   - hr_ini_final (primeros 2 dígitos de hora_inicio)
//   - jornada ("Nocturna" si hr_ini_final >= 18, sino "Diurna")
//   - dias_lunes..dias_domingos (conteo del día-de-semana en el rango)
//   - hrs_diurna (primeros 2 dígitos de horas_clase)
//   - hrs_nocturna / hrs_noct_final (minutos/45 redondeado; corrige el bug
//     del lookup original que dejaba #N/A cuando horas_clase no estaba en la
//     tabla {00:45→1, 01:30→2, 02:15→3, 03:00→4, 03:45→5, 04:30→6})
//   - hrs_semanal = (hrs_diurna + hrs_noct_final) × num_dias
//   - hrs_semestre = (hrs_diurna + hrs_noct_final) × Σ dias_X
//   - atrib_curso_2 (= atrib_curso o "VACIO" si vacío)
//   - tipo_curso (lookup del macro)
// ─────────────────────────────────────────────────────────────

// Catálogos de Medicina excluidos del cálculo de Semana Santa
const CATALOGOS_EXCLUIDOS_MEDIC = new Set([
  '217MEDIC', '241MEDIC', '242MEDIC', '243MEDIC',
  '244MEDIC', '245MEDIC', '251MEDIC', '223MEDIC',
]);

// Fechas por defecto de Semana Santa (coincide con el macro VBA hardcoded)
const DEFAULT_SEMANA_SANTA_INICIO = '2026-03-30';
const DEFAULT_SEMANA_SANTA_FIN = '2026-04-05';

// Tabla de conversión TIPO CURSO (Atributo Curso 2 → descripción)
const TIPO_CURSO_LOOKUP: Record<string, string> = {
  GRPB: 'CURSOS B (Adicionales)',
  PESP: 'Planillas Especiales',
  FCBE: 'CURSOS A (Pensum)',
  CESP: 'Cursos Especiales',
  FCCU: 'CURSOS A (Pensum)',
  FINV: 'CURSOS A (Pensum)',
  FCBS: 'CURSOS A (Pensum)',
  FING: 'CURSOS A (Pensum)',
  FCAC: 'CURSOS A (Pensum)',
  TUTO: 'Cursos Tutoriales',
  VACIO: 'CURSOS A (Pensum)',
  CJR1: 'CURSOS A (Pensum)',
  CJR2: 'CURSOS A (Pensum)',
  CJR3: 'CURSOS A (Pensum)',
  CJR4: 'CURSOS A (Pensum)',
  MEAP: 'CURSOS A (Pensum)',
};

// ── Utilidades de fecha/hora ─────────────────────────────────

function parseHourInt(timeStr: string | null | undefined): number {
  if (!timeStr) return 0;
  const m = String(timeStr).trim().match(/^(\d{1,2})/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Convierte "HH:MM" (Horas Clase) a minutos totales. */
function parseHoraClaseMin(hc: string | null | undefined): number {
  if (!hc) return 0;
  const s = String(hc).trim();
  const m = s.match(/^(\d{1,2}):(\d{1,2})/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  // Formato sin ":" (ej: "3" → 180 min)
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n * 60);
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  // ISO "YYYY-MM-DD" o "YYYY-MM-DD HH:..."
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.substring(0, 10) + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // US "M/D/YY" o "MM/DD/YYYY"
  const parts = s.split('/');
  if (parts.length === 3) {
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Replica Excel: `INT((WEEKDAY(start - dayN) + (end - start)) / 7)`
 * Cuenta cuántas veces el día-de-semana indicado cae en el rango [start, end].
 * `dayN` usa la convención de Excel DIASEM default: Dom=1, Lun=2, ..., Sáb=7.
 */
function countWeekday(start: Date, end: Date, dayN: number): number {
  const ms = 86_400_000;
  const shifted = new Date(start.getTime() - dayN * ms);
  const excelWeekday = shifted.getDay() + 1; // JS 0-6 (Dom=0) → Excel 1-7 (Dom=1)
  const diffDays = Math.round((end.getTime() - start.getTime()) / ms);
  return Math.max(0, Math.floor((excelWeekday + diffDays) / 7));
}

function getSemanaSantaRange(): { inicio: Date; fin: Date; inicioStr: string; finStr: string } {
  const ssi = db
    .prepare("SELECT valor FROM parametros WHERE clave = 'semana_santa_inicio'")
    .get() as { valor: string } | undefined;
  const ssf = db
    .prepare("SELECT valor FROM parametros WHERE clave = 'semana_santa_fin'")
    .get() as { valor: string } | undefined;
  const inicioStr = ssi?.valor || DEFAULT_SEMANA_SANTA_INICIO;
  const finStr = ssf?.valor || DEFAULT_SEMANA_SANTA_FIN;
  const inicio = parseDate(inicioStr) || new Date(2026, 2, 30);
  const fin = parseDate(finStr) || new Date(2026, 3, 5);
  return { inicio, fin, inicioStr, finStr };
}

/**
 * Ejecuta la lógica del macro sobre todas las filas del import.
 * Idempotente: sobreescribe siempre los valores derivados.
 */
function computeHoursForImport(importId: number): void {
  try {
    const { inicio: ssInicio, fin: ssFin, inicioStr: ssInicioStr, finStr: ssFinStr } = getSemanaSantaRange();

    // Paso 1 del macro: eliminar espacios en la columna "Catálogo" (F).
    // Esto normaliza valores como "217 MEDIC" → "217MEDIC".
    db.prepare(
      `UPDATE carga_academica
         SET catalogo = REPLACE(catalogo, ' ', '')
       WHERE import_id = ? AND catalogo IS NOT NULL AND catalogo LIKE '% %'`,
    ).run(importId);

    const rows = db
      .prepare(
        `SELECT id, catalogo, horas_clase, hora_inicio,
                lunes, martes, miercoles, jueves, viernes, sabado, domingo,
                fecha_inicial, fecha_final, atrib_curso
         FROM carga_academica
         WHERE import_id = ?`,
      )
      .all(importId) as Array<{
      id: number;
      catalogo: string | null;
      horas_clase: string | null;
      hora_inicio: string | null;
      lunes: string | null;
      martes: string | null;
      miercoles: string | null;
      jueves: string | null;
      viernes: string | null;
      sabado: string | null;
      domingo: string | null;
      fecha_inicial: string | null;
      fecha_final: string | null;
      atrib_curso: string | null;
    }>;

    if (rows.length === 0) return;

    const updateStmt = db.prepare(`
      UPDATE carga_academica
      SET catalogos_excluidos = ?,
          fecha_ini_santa     = ?,
          fecha_final_santa   = ?,
          semanas             = ?,
          hr_ini_final        = ?,
          jornada             = ?,
          num_dias            = ?,
          dias_lunes          = ?,
          dias_martes         = ?,
          dias_miercoles      = ?,
          dias_jueves         = ?,
          dias_viernes        = ?,
          dias_sabados        = ?,
          dias_domingos       = ?,
          hrs_diurna          = ?,
          hrs_nocturna        = ?,
          hrs_noct_final      = ?,
          hrs_semanal         = ?,
          hrs_semestre        = ?,
          atrib_curso_2       = ?,
          tipo_curso          = ?
      WHERE id = ?
    `);

    const tx = db.transaction((items: typeof rows) => {
      for (const row of items) {
        // 1. Catálogo y exclusión MEDIC (columna G del macro)
        const cat = (row.catalogo || '').trim().toUpperCase().replace(/\s+/g, '');
        const excluido = CATALOGOS_EXCLUIDOS_MEDIC.has(cat) ? 'SI' : 'NO';

        // 2. Fechas
        const fIni = parseDate(row.fecha_inicial);
        const fFin = parseDate(row.fecha_final);

        // 3. RESTA DE SEMANAS — columna S del macro.
        //    Si catálogo excluido → 0.
        //    Si Semana Santa (inicio y fin) está íntegra dentro del rango → 1.
        //    En cualquier otro caso → 0.
        let restaSemanas = 0;
        if (excluido === 'NO' && fIni && fFin) {
          const ssiDentro = ssInicio >= fIni && ssInicio <= fFin;
          const ssfDentro = ssFin >= fIni && ssFin <= fFin;
          if (ssiDentro && ssfDentro) restaSemanas = 1;
        }

        // 4. Semanas — columna O del macro
        let semanas = 1;
        if (fIni && fFin) {
          const diffDays = Math.round((fFin.getTime() - fIni.getTime()) / 86_400_000);
          const raw = Math.round(diffDays / 7) - restaSemanas;
          semanas = raw === 0 ? 1 : raw;
        }

        // 5. Hr Ini Final (U) y Jornada (V)
        const hrIniFinal = parseHourInt(row.hora_inicio);
        const jornada = hrIniFinal >= 18 ? 'Nocturna' : 'Diurna';

        // 6. Flags de día (X, Z, AB, AD, AF, AH, AJ)
        const flags = {
          lunes: row.lunes === 'Y',
          martes: row.martes === 'Y',
          miercoles: row.miercoles === 'Y',
          jueves: row.jueves === 'Y',
          viernes: row.viernes === 'Y',
          sabado: row.sabado === 'Y',
          domingo: row.domingo === 'Y',
        };
        const numDias = Object.values(flags).filter(Boolean).length;

        // 7. Dias X (Y..AK) — conteo de apariciones del día en el rango menos restaSemanas
        //    Excel DIASEM: Dom=1, Lun=2, ..., Sáb=7
        const dayN: Record<keyof typeof flags, number> = {
          lunes: 2,
          martes: 3,
          miercoles: 4,
          jueves: 5,
          viernes: 6,
          sabado: 7,
          domingo: 1,
        };
        const dias: Record<keyof typeof flags, number> = {
          lunes: 0, martes: 0, miercoles: 0,
          jueves: 0, viernes: 0, sabado: 0, domingo: 0,
        };
        if (fIni && fFin) {
          for (const k of Object.keys(flags) as (keyof typeof flags)[]) {
            if (flags[k]) {
              dias[k] = Math.max(0, countWeekday(fIni, fFin, dayN[k]) - restaSemanas);
            }
          }
        }

        const totalDias =
          dias.lunes + dias.martes + dias.miercoles +
          dias.jueves + dias.viernes + dias.sabado + dias.domingo;

        // 8-9. Hrs Diurna (BD) / Hrs Noc (BE) / Hrs Noct Final (BF)
        //   Regla: las clases son mutuamente excluyentes según su jornada.
        //   - Si jornada = "Diurna"  → hrs_diurna = horas del bloque, hrs_noc = 0
        //   - Si jornada = "Nocturna" → hrs_diurna = 0, hrs_noc = round(minutos/45)
        //   El macro original sumaba ambas para TODAS las clases, lo cual
        //   duplicaba horas. Esta es la corrección.
        //
        //   La fórmula matemática round(min/45) reproduce el lookup original
        //   del macro para los valores estándar (00:45→1, 01:30→2, ..., 04:30→6)
        //   y además resuelve los casos que quedaban como #N/A (02:00→3, 04:00→5).
        const clasHrInt = parseHourInt(row.horas_clase);
        const clasMin = parseHoraClaseMin(row.horas_clase);

        let hrsDiurna = 0;
        let hrsNoc = 0;
        if (jornada === 'Nocturna') {
          hrsNoc = clasMin > 0 ? Math.round(clasMin / 45) : 0;
        } else {
          hrsDiurna = clasHrInt;
        }

        // 10. Hrs Semanal (BI) = (BD + BF) × BB (num_dias)
        const hrsSemanal = (hrsDiurna + hrsNoc) * numDias;

        // 11. Hrs Semestre (BJ) = (BD + BF) × Σ dias_X
        const hrsSemestre = (hrsDiurna + hrsNoc) * totalDias;

        // 12. Atributo Curso 2 (BM) y TIPO CURSO (BN)
        const atribRaw = (row.atrib_curso || '').trim().toUpperCase();
        const atrib2 = atribRaw || 'VACIO';
        const tipoCurso = TIPO_CURSO_LOOKUP[atrib2] || '';

        updateStmt.run(
          excluido,
          ssInicioStr,
          ssFinStr,
          semanas,
          hrIniFinal,
          jornada,
          numDias,
          dias.lunes, dias.martes, dias.miercoles,
          dias.jueves, dias.viernes, dias.sabado, dias.domingo,
          hrsDiurna,
          hrsNoc,
          hrsNoc,
          hrsSemanal,
          hrsSemestre,
          atrib2,
          tipoCurso,
          row.id,
        );
      }
    });

    tx(rows);
  } catch (e) {
    console.error('computeHoursForImport (macro) failed', e);
  }
}

// ─────────────────────────────────────────────────────────────
// Process a single file
// ─────────────────────────────────────────────────────────────

function processFile(file: { name: string; buffer: Buffer; size: number }): FileImportResult {
  const importId = createImportRecord(file.name, file.size, file.buffer);

  const result: FileImportResult = {
    filename: file.name,
    fileType: 'UNKNOWN',
    status: 'completed',
    tables: {},
    docentesAutoCreated: 0,
    novedadesDetected: 0,
    importId,
  };

  try {
    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const fileType = detectFileType(file.name, workbook.SheetNames);
    result.fileType = fileType;

    const fechaImportacion = new Date().toISOString().split('T')[0];
    let metadata: ElysaMetadata | undefined;
    let cicloLectivo: string = '';
    const tablesAffected: string[] = [];
    let totalInserted = 0;
    let totalUpdated = 0;

    // Auto-snapshot (corte) ANTES de cualquier upsert: sólo para tipos que
    // modifican carga_academica (US_PROG y archivos mixtos con hoja de carga).
    // Los otros tipos (docentes/plan/etc) no cambian carga_academica.
    // El corte se crea aunque la tabla esté vacía (total_filas = 0) para
    // mantener un historial consistente por import.
    const affectsCarga =
      fileType === 'US_PROG' || fileType === 'UNKNOWN';
    if (affectsCarga) {
      try {
        const corteId = createCorteCarga({
          tipo: 'auto_pre_import',
          nombre: `Pre-import: ${file.name}`,
          descripcion: `Snapshot automático antes de importar ${file.name}`,
          importId,
          createdBy: 'sistema',
        });
        result.snapshotCorteId = corteId;
      } catch (e) {
        console.error('createCorteCarga failed (continuing without snapshot)', e);
      }
    }

    // For UNKNOWN files, try to process as MIXED (multi-sheet workbook)
    // by scanning sheet names for known patterns
    if (fileType === 'UNKNOWN') {
      result.fileType = 'MIXED';
      cicloLectivo = resolveCicloLectivo();

      // Elegir la mejor hoja de carga_academica (post-macro preferido, luego Hoja1,
      // luego Hoja2/Hoja22/Hoja2222). Esto evita procesar múltiples hojas del mismo
      // libro .xlsm que contienen los datos en distintas etapas del macro.
      let cargaSheetName: string | null = null;
      for (const sn of workbook.SheetNames) {
        if (/CARGA\s*ACAD/i.test(sn)) { cargaSheetName = sn; break; }
      }
      if (!cargaSheetName) {
        for (const sn of workbook.SheetNames) {
          if (/^Hoja1$/i.test(sn) || /^Hoja2222?$/i.test(sn) || /^Hoja22$/i.test(sn) || /^Hoja2$/i.test(sn)) {
            const probe = workbook.Sheets[sn];
            const hr = findHeaderRow(probe, KNOWN_HEADERS.US_PROG);
            if (hr >= 0) {
              // Confirmar que realmente tiene cabeceras de US_PROG
              const raw = XLSX.utils.sheet_to_json<unknown[]>(probe, { header: 1, defval: '' });
              const headerCells = (raw[hr] as unknown[] | undefined) || [];
              const hasHeaders = headerCells.some(c => /^N[º°]\s*Clase$/i.test(String(c || '').trim()));
              if (hasHeaders) { cargaSheetName = sn; break; }
            }
          }
        }
      }

      // Process each sheet based on its name/content
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const upperName = sheetName.toUpperCase();

        // Carga Academica sheet: elegida arriba. Procesa sólo esa hoja.
        if (sheetName === cargaSheetName) {
          const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.US_PROG);
          if (headerRow >= 0) {
            const rows = parseRows(sheet, headerRow, CARGA_COLUMN_MAP, CARGA_DB_COLUMNS, {
              archivo_origen: file.name, fecha_importacion: fechaImportacion, import_id: importId,
            });
            for (const row of rows) { if (!row.ciclo_lectivo && cicloLectivo) row.ciclo_lectivo = cicloLectivo; }
            if (rows.length > 0) {
              const r = bulkUpsert('carga_academica', rows, CARGA_DB_COLUMNS, CARGA_CONFLICT_COLS);
              result.tables.carga_academica = r;
              totalInserted += r.inserted; totalUpdated += r.updated;
              tablesAffected.push('carga_academica');
              // Ejecuta la lógica del macro (catalogos_excluidos, semanas,
              // dias_X, hrs_diurna/nocturna, hrs_semanal/semestre, tipo_curso)
              computeHoursForImport(importId);
              autoCreateDocentes(importId, cicloLectivo);
              try {
                const pr = autoCreateProgramas(importId);
                if (pr.created + pr.updated > 0) tablesAffected.push('programas');
              } catch (e) { console.error('autoCreateProgramas failed', e); }
              try {
                const pe = autoCreatePlanEstudios(importId);
                if (pe.created + pe.updated > 0) tablesAffected.push('plan_estudios');
              } catch (e) { console.error('autoCreatePlanEstudios failed', e); }
            }
          }
        }
        // US_DATOS sheet
        else if (upperName === 'US_DATOS' || upperName.includes('DATOS')) {
          const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.US_DATOS);
          if (headerRow >= 0) {
            const rows = parseRows(sheet, headerRow, DOCENTES_COLUMN_MAP, DOCENTES_DB_COLUMNS, { import_id: importId });
            for (const row of rows) { if (!row.ciclo_lectivo && cicloLectivo) row.ciclo_lectivo = cicloLectivo; }
            if (rows.length > 0) {
              const r = bulkUpsert('docentes', rows, DOCENTES_DB_COLUMNS, DOCENTES_CONFLICT_COLS);
              result.tables.docentes = r;
              totalInserted += r.inserted; totalUpdated += r.updated;
              tablesAffected.push('docentes');
            }
          }
        }
        // LC_PROG or Profesores x Asignatura
        else if (/LC_PROG|PROFESORES?\s*X?\s*ASIGNAT/i.test(sheetName)) {
          const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.LC_PROG);
          if (headerRow >= 0) {
            const rows = parseRows(sheet, headerRow, PROF_ASIG_COLUMN_MAP, PROF_ASIG_DB_COLUMNS, { import_id: importId });
            for (const row of rows) { if (!row.ciclo_lectivo && cicloLectivo) row.ciclo_lectivo = cicloLectivo; }
            if (rows.length > 0) {
              const r = bulkUpsert('profesores_asignatura', rows, PROF_ASIG_DB_COLUMNS, PROF_ASIG_CONFLICT_COLS);
              result.tables.profesores_asignatura = r;
              totalInserted += r.inserted; totalUpdated += r.updated;
              tablesAffected.push('profesores_asignatura');
            }
          }
        }
        // Revisión Planes Estudios
        else if (/REVISI[OÓ]N\s*PLANES|PLAN.*EST/i.test(sheetName)) {
          const planColMap: Record<string, string> = {
            'Programa Académico': 'programa_academico', 'Programa Academico': 'programa_academico',
            'Grado': 'grado', 'Modalidad': 'modalidad', 'Cohorte': 'cohorte', 'Semestre': 'semestre',
            'Clase': 'clase', 'Nº Clase': 'clase', 'Catálogo': 'catalogo', 'Catalogo': 'catalogo',
            'Asignatura': 'asignatura', 'Descripción': 'asignatura', 'Componente': 'componente',
            'Cpte': 'componente', 'Atrib Cso': 'atrib_curso', 'Atributo Curso': 'atrib_curso',
            'F Inicial': 'fecha_inicial', 'Fecha Inicial': 'fecha_inicial',
            'Fecha Final': 'fecha_final', 'Total Horas Curso': 'total_hrs_curso',
            'Total Hrs Curso': 'total_hrs_curso', 'Hrs Semanal': 'hrs_semanal',
            'Hrs Semestre': 'hrs_semestre', 'Inscritos': 'inscritos', 'Total Inscripciones': 'inscritos',
          };
          const planCols = ['programa_academico','grado','modalidad','cohorte','semestre','clase','catalogo','asignatura','componente','atrib_curso','fecha_inicial','fecha_final','total_hrs_curso','hrs_semanal','hrs_semestre','inscritos','import_id'];
          const headerRow = findHeaderRow(sheet, ['Programa', 'Clase', 'Catálogo', 'Asignatura']);
          if (headerRow >= 0) {
            const rows = parseRows(sheet, headerRow, planColMap, planCols, { import_id: importId });
            if (rows.length > 0) {
              const planConflict = ['clase', 'programa_academico', 'catalogo'];
              const r = bulkUpsert('plan_estudios', rows, planCols, planConflict);
              result.tables.plan_estudios = r;
              totalInserted += r.inserted; totalUpdated += r.updated;
              tablesAffected.push('plan_estudios');
            }
          }
        }
      }

      if (tablesAffected.length === 0) {
        throw new Error(`No se encontraron hojas reconocibles en "${file.name}". Hojas: ${workbook.SheetNames.join(', ')}`);
      }

      // Derive campus for MIXED imports
      const mixedCampusSet = new Set<string>();
      for (const tbl of ['carga_academica', 'docentes', 'plan_estudios']) {
        try {
          const rows = db
            .prepare(
              `SELECT DISTINCT campus FROM ${tbl}
               WHERE import_id = ? AND campus IS NOT NULL AND campus != ''`,
            )
            .all(importId) as { campus: string }[];
          for (const r of rows) if (r.campus) mixedCampusSet.add(r.campus);
        } catch {
          /* skip */
        }
      }
      const mixedCampus = Array.from(mixedCampusSet).sort().join(',');

      // Skip the rest of the if/else chain
      updateImportRecord(importId, {
        fileType: 'MIXED', cicloLectivo, grado: '', campus: mixedCampus,
        inserted: totalInserted, updated: totalUpdated, skipped: 0,
        tablesAffected: tablesAffected.join(', '), status: 'completed',
      });
      return result;
    }

    // ── US_PROG_CLASES → carga_academica ──────────────────
    if (fileType === 'US_PROG') {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      metadata = extractMetadata(sheet);
      result.metadata = metadata;
      cicloLectivo = resolveCicloLectivo(metadata);

      const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.US_PROG);
      const rows = parseRows(sheet, headerRow, CARGA_COLUMN_MAP, CARGA_DB_COLUMNS, {
        archivo_origen: file.name,
        fecha_importacion: fechaImportacion,
        import_id: importId,
      });

      // Inject ciclo_lectivo from metadata if not present in each row
      for (const row of rows) {
        if (!row.ciclo_lectivo && cicloLectivo) {
          row.ciclo_lectivo = cicloLectivo;
        }
      }

      if (rows.length > 0) {
        const upsertResult = bulkUpsert('carga_academica', rows, CARGA_DB_COLUMNS, CARGA_CONFLICT_COLS);
        result.tables.carga_academica = upsertResult;
        totalInserted += upsertResult.inserted;
        totalUpdated += upsertResult.updated;
        tablesAffected.push('carga_academica');

        // Calculate hrs_semanal and hrs_semestre from available data
        computeHoursForImport(importId);

        // Auto-create docentes from instructor data
        result.docentesAutoCreated = autoCreateDocentes(importId, cicloLectivo);
        if (result.docentesAutoCreated > 0) {
          tablesAffected.push('docentes');
        }

        // Auto-create programas y plan_estudios derivados de carga_academica
        try {
          const pr = autoCreateProgramas(importId);
          if (pr.created + pr.updated > 0) tablesAffected.push('programas');
        } catch (e) { console.error('autoCreateProgramas failed', e); }
        try {
          const pe = autoCreatePlanEstudios(importId);
          if (pe.created + pe.updated > 0) tablesAffected.push('plan_estudios');
        } catch (e) { console.error('autoCreatePlanEstudios failed', e); }

        // Detect novedades
        result.novedadesDetected = detectNovedades(importId, fileType, cicloLectivo);
        if (result.novedadesDetected > 0) {
          tablesAffected.push('novedades_auto');
        }
      }
    }

    // ── US_DATOS_DOCENTES → docentes ──────────────────────
    else if (fileType === 'US_DATOS') {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      metadata = extractMetadata(sheet);
      result.metadata = metadata;
      cicloLectivo = resolveCicloLectivo(metadata);

      const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.US_DATOS);
      const rows = parseRows(sheet, headerRow, DOCENTES_COLUMN_MAP, DOCENTES_DB_COLUMNS, {
        import_id: importId,
      });

      // Inject ciclo_lectivo from metadata
      for (const row of rows) {
        if (!row.ciclo_lectivo && cicloLectivo) {
          row.ciclo_lectivo = cicloLectivo;
        }
      }

      if (rows.length > 0) {
        const upsertResult = bulkUpsert('docentes', rows, DOCENTES_DB_COLUMNS, DOCENTES_CONFLICT_COLS);
        result.tables.docentes = upsertResult;
        totalInserted += upsertResult.inserted;
        totalUpdated += upsertResult.updated;
        tablesAffected.push('docentes');
      }
    }

    // ── LC_PROGRAMACION_CLASES → profesores_asignatura ────
    else if (fileType === 'LC_PROG') {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      metadata = extractMetadata(sheet);
      result.metadata = metadata;
      cicloLectivo = resolveCicloLectivo(metadata);

      const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.LC_PROG);
      const rows = parseRows(sheet, headerRow, PROF_ASIG_COLUMN_MAP, PROF_ASIG_DB_COLUMNS, {
        import_id: importId,
      });

      // Inject ciclo_lectivo from metadata
      for (const row of rows) {
        if (!row.ciclo_lectivo && cicloLectivo) {
          row.ciclo_lectivo = cicloLectivo;
        }
      }

      if (rows.length > 0) {
        const upsertResult = bulkUpsert('profesores_asignatura', rows, PROF_ASIG_DB_COLUMNS, PROF_ASIG_CONFLICT_COLS);
        result.tables.profesores_asignatura = upsertResult;
        totalInserted += upsertResult.inserted;
        totalUpdated += upsertResult.updated;
        tablesAffected.push('profesores_asignatura');
      }
    }

    // ── DOCENTES_IES (SNIES) → docentes + docente_capacitaciones ──
    else if (fileType === 'DOCENTES_IES') {
      // SNIES files have AÑO + SEMESTRE columns in data rows (e.g., 2025, 2)
      // These are periodos, NOT ciclos lectivos (ciclos are like 2561, 2563, 2661)
      // Ciclo structure: first 2 digits = year (25=2025), rest = semester code
      // 2561=2025-1, 2563=2025-2, 2661=2026-1, 2591/2592=med-quirurgica
      // We store the periodo reference (e.g., "2025-2") and let the user associate ciclos
      const iesSheet = workbook.Sheets[workbook.SheetNames.find(n => n.toUpperCase() === 'DOCENTE_IES') || workbook.SheetNames[0]];
      const iesRaw = XLSX.utils.sheet_to_json<Record<string, unknown>>(iesSheet, { range: 0 });
      let sniesAnio = '';
      let sniesSemestre = '';
      if (iesRaw.length > 0) {
        const firstRow = iesRaw[0];
        sniesAnio = String(firstRow['AÑO'] ?? firstRow['ANIO'] ?? firstRow['AÑO'] ?? '');
        sniesSemestre = String(firstRow['SEMESTRE'] ?? '');
      }
      // Try to find matching ciclo_lectivo from existing data
      // e.g., AÑO=2025, SEM=2 → look for ciclo starting with "25" and semester "2" → 2563
      if (sniesAnio && sniesSemestre) {
        const yearPrefix = sniesAnio.substring(2); // "2025" → "25"
        const matchingCiclo = db.prepare(
          `SELECT DISTINCT ciclo_lectivo FROM carga_academica
           WHERE ciclo_lectivo LIKE ?
           ORDER BY ciclo_lectivo LIMIT 1`
        ).get(`${yearPrefix}6${sniesSemestre === '1' ? '1' : '3'}%`) as { ciclo_lectivo: string } | undefined;

        if (matchingCiclo) {
          cicloLectivo = matchingCiclo.ciclo_lectivo;
        } else {
          // Fallback: use periodo format as reference
          cicloLectivo = `${sniesAnio}-${sniesSemestre}`;
        }
        result.metadata = { grado: '', cicloLectivo, campus: '', institucion: 'SNIES', totalRegistros: iesRaw.length };
      }
      if (!cicloLectivo) cicloLectivo = resolveCicloLectivo();

      // Sheet 1: DOCENTE_IES → merge into docentes
      const iesSheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'DOCENTE_IES');
      if (iesSheetName) {
        const sheet = workbook.Sheets[iesSheetName];
        const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.DOCENTE_IES);
        const rows = parseRows(sheet, headerRow, SNIES_IES_COLUMN_MAP, SNIES_IES_DB_COLUMNS, {
          ciclo_lectivo: cicloLectivo,
          import_id: importId,
        });

        if (rows.length > 0) {
          const upsertResult = bulkUpsert('docentes', rows, SNIES_IES_DB_COLUMNS, DOCENTES_CONFLICT_COLS);
          result.tables.docentes_ies = upsertResult;
          totalInserted += upsertResult.inserted;
          totalUpdated += upsertResult.updated;
          tablesAffected.push('docentes');
        }
      }

      // Sheet 2: DOCENTE_CONTRATO → merge into docentes
      const contratoSheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'DOCENTE_CONTRATO');
      if (contratoSheetName) {
        const sheet = workbook.Sheets[contratoSheetName];
        const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.DOCENTE_CONTRATO);
        const rows = parseRows(sheet, headerRow, SNIES_CONTRATO_COLUMN_MAP, SNIES_CONTRATO_DB_COLUMNS, {
          ciclo_lectivo: cicloLectivo,
          import_id: importId,
        });

        if (rows.length > 0) {
          // Merge contrato data into existing docentes rows via UPSERT on (doc_id, ciclo_lectivo)
          const upsertResult = bulkUpsert('docentes', rows, SNIES_CONTRATO_DB_COLUMNS, DOCENTES_CONFLICT_COLS);
          result.tables.docentes_contrato = upsertResult;
          totalInserted += upsertResult.inserted;
          totalUpdated += upsertResult.updated;
          if (!tablesAffected.includes('docentes')) tablesAffected.push('docentes');
        }
      }

      // Sheet 3: DOCENTE_CAPACITACION → docente_capacitaciones
      const capSheetName = workbook.SheetNames.find(n => n.toUpperCase() === 'DOCENTE_CAPACITACION');
      if (capSheetName) {
        const sheet = workbook.Sheets[capSheetName];
        const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.DOCENTE_CAPACITACION);
        const rows = parseRows(sheet, headerRow, SNIES_CAPACITACION_COLUMN_MAP, SNIES_CAPACITACION_DB_COLUMNS, {
          import_id: importId,
        });

        if (rows.length > 0) {
          // Capacitaciones don't have a natural UPSERT key; use simple insert via bulkUpsert
          // with a synthetic conflict on doc_id + anio + semestre + nombre_curso
          // Since there's no unique index on docente_capacitaciones, we do a plain insert
          const insertResult = bulkInsertCapacitaciones(rows);
          result.tables.docente_capacitaciones = { inserted: insertResult, updated: 0 };
          totalInserted += insertResult;
          tablesAffected.push('docente_capacitaciones');
        }
      }
    }

    // ── PLAN_ESTUDIO → plan_estudios ──────────────────────
    else if (fileType === 'PLAN_ESTUDIO') {
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      cicloLectivo = resolveCicloLectivo();

      const headerRow = findHeaderRow(sheet, KNOWN_HEADERS.PLAN_ESTUDIO);

      const PLAN_ESTUDIO_COLUMN_MAP: Record<string, string> = {
        'Grado': 'grado',
        'Prog Acad': 'programa_academico',
        'Descripción': 'modalidad',
        'Descr': 'semestre',
        'Plan Acad': 'cohorte',
        'ID Curso': 'clase',
        'Nom Largo': 'asignatura',
        'Máx Uni': 'total_hrs_curso',
        'Hrs Cso': 'hrs_semestre',
        'Catálogo': 'catalogo',
        'Estado': 'atrib_curso',
        'Campus': 'campus_temp',
      };

      const PLAN_ESTUDIO_DB_COLUMNS = [
        'programa_academico', 'grado', 'modalidad', 'cohorte', 'semestre',
        'clase', 'catalogo', 'asignatura', 'atrib_curso',
        'total_hrs_curso', 'hrs_semanal', 'hrs_semestre',
        'import_id', 'campus_temp',
      ];

      const rows = parseRows(sheet, headerRow, PLAN_ESTUDIO_COLUMN_MAP, PLAN_ESTUDIO_DB_COLUMNS, {
        import_id: importId,
      });

      // Post-process rows
      for (const row of rows) {
        // Extract semestre from "Descr" field: "ESAUS20251 I Semestre" → "I Semestre"
        if (row.semestre && typeof row.semestre === 'string') {
          const semestreMatch = row.semestre.match(/([IVXLC]+\s+[Ss]emestre)/);
          if (semestreMatch) {
            row.semestre = semestreMatch[1];
          } else {
            // Fallback: take everything after the first space
            const spaceIdx = (row.semestre as string).indexOf(' ');
            if (spaceIdx > 0) {
              row.semestre = (row.semestre as string).substring(spaceIdx + 1).trim();
            }
          }
        }

        // Calculate hrs_semanal = hrs_semestre / 16
        const hrsSemestre = parseFloat(String(row.hrs_semestre ?? '0')) || 0;
        row.hrs_semanal = Math.round((hrsSemestre / 16) * 100) / 100;

        // Swap modalidad → programa name (Descripción has the full program name)
        // The "Prog Acad" field (programa_academico) has the short code like ESAUS
        // The "Descripción" field (mapped to modalidad) has the full name
        // Keep programa_academico as the code, store the full name in modalidad
        // (The page uses modalidad to display the program full name)

        // Clean up campus_temp (not a real column in plan_estudios)
        delete row.campus_temp;
      }

      // Remove campus_temp from valid columns for upsert
      const PLAN_ESTUDIO_UPSERT_COLUMNS = PLAN_ESTUDIO_DB_COLUMNS.filter(c => c !== 'campus_temp');
      const PLAN_ESTUDIO_CONFLICT_COLS = ['clase', 'programa_academico', 'catalogo'];

      if (rows.length > 0) {
        const upsertResult = bulkUpsert('plan_estudios', rows, PLAN_ESTUDIO_UPSERT_COLUMNS, PLAN_ESTUDIO_CONFLICT_COLS);
        result.tables.plan_estudios = upsertResult;
        totalInserted += upsertResult.inserted;
        totalUpdated += upsertResult.updated;
        tablesAffected.push('plan_estudios');
      }

      result.metadata = {
        grado: '',
        cicloLectivo,
        campus: '',
        institucion: '',
        totalRegistros: rows.length,
      };
    }

    // Derive campus from imported rows if metadata doesn't have it.
    // Query DISTINCT campus values across tables actually touched by this import.
    function deriveCampusFromImport(): string {
      if (metadata?.campus) return metadata.campus;
      const tryTables = ['carga_academica', 'docentes', 'plan_estudios'];
      const found = new Set<string>();
      for (const tbl of tryTables) {
        try {
          const rows = db
            .prepare(
              `SELECT DISTINCT campus FROM ${tbl}
               WHERE import_id = ? AND campus IS NOT NULL AND campus != ''`,
            )
            .all(importId) as { campus: string }[];
          for (const r of rows) if (r.campus) found.add(r.campus);
        } catch {
          /* table may not have campus or import_id — skip */
        }
      }
      const arr = Array.from(found);
      if (arr.length === 0) return '';
      if (arr.length === 1) return arr[0];
      return arr.sort().join(',');
    }

    // Update import history with success
    updateImportRecord(importId, {
      fileType,
      cicloLectivo: metadata?.cicloLectivo ?? resolveCicloLectivo(),
      grado: metadata?.grado,
      campus: deriveCampusFromImport(),
      inserted: totalInserted,
      updated: totalUpdated,
      skipped: 0,
      tablesAffected: tablesAffected.join(', '),
      status: 'completed',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    result.status = 'error';
    result.error = message;

    updateImportRecord(importId, {
      fileType: result.fileType,
      inserted: 0,
      updated: 0,
      skipped: 0,
      tablesAffected: '',
      status: 'error',
      errorMessage: message,
    });
  }

  return result;
}

/**
 * Plain bulk insert for capacitaciones (no unique constraint).
 */
function bulkInsertCapacitaciones(rows: Record<string, unknown>[]): number {
  if (rows.length === 0) return 0;

  const columns = SNIES_CAPACITACION_DB_COLUMNS;
  const placeholders = columns.map(() => '?').join(', ');

  const stmt = db.prepare(
    `INSERT INTO docente_capacitaciones (${columns.join(', ')}) VALUES (${placeholders})`,
  );

  let count = 0;
  const insertAll = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) {
      const values = columns.map(col => (item[col] !== undefined && item[col] !== '' ? item[col] : null));
      stmt.run(...values);
      count++;
    }
  });

  insertAll(rows);
  return count;
}

// ─────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Collect files from 'file' (single) and/or 'files' (multiple)
    const files: { name: string; buffer: Buffer; size: number }[] = [];

    const singleFile = formData.get('file') as File | null;
    if (singleFile && singleFile.name) {
      files.push({
        name: singleFile.name,
        buffer: Buffer.from(await singleFile.arrayBuffer()),
        size: singleFile.size,
      });
    }

    const multipleFiles = formData.getAll('files') as File[];
    for (const f of multipleFiles) {
      if (f && f.name && typeof f.arrayBuffer === 'function') {
        files.push({
          name: f.name,
          buffer: Buffer.from(await f.arrayBuffer()),
          size: f.size,
        });
      }
    }

    if (files.length === 0) {
      return Response.json(
        { error: 'No se proporcionaron archivos. Use el campo "file" o "files".' },
        { status: 400 },
      );
    }

    // Validate file extensions (incluye .xlsm: libros con macros)
    for (const f of files) {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith('.xlsx') && !lower.endsWith('.xls') && !lower.endsWith('.xlsm')) {
        return Response.json(
          { error: `El archivo "${f.name}" debe ser un archivo Excel (.xlsx, .xlsm o .xls)` },
          { status: 400 },
        );
      }
    }

    // Optional campus filter (CSV). If supplied, rows whose campus is not
    // in the list are removed post-import (simpler than threading the filter
    // through every parser branch).
    const campusFilterRaw = (formData.get('campus_filter') as string | null) ?? '';
    const campusFilter = campusFilterRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Process each file
    const results: FileImportResult[] = [];
    for (const f of files) {
      const result = processFile(f);

      // Apply campus filter post-import
      if (campusFilter.length > 0 && typeof result.importId === 'number') {
        const placeholders = campusFilter.map(() => '?').join(',');
        const tablesToFilter = ['carga_academica', 'docentes', 'plan_estudios', 'profesores_asignatura'];
        let removed = 0;
        for (const tbl of tablesToFilter) {
          try {
            const del = db
              .prepare(
                `DELETE FROM ${tbl}
                 WHERE import_id = ?
                   AND (campus IS NULL OR campus NOT IN (${placeholders}))`,
              )
              .run(result.importId, ...campusFilter);
            removed += del.changes;
          } catch {
            /* table may not have campus/import_id — skip */
          }
        }
        result.campusFilterApplied = { kept: campusFilter, removed };
      }

      results.push(result);
    }

    // Build summary
    const totalInserted = results.reduce(
      (sum, r) => sum + Object.values(r.tables).reduce((s, t) => s + t.inserted, 0),
      0,
    );
    const totalUpdated = results.reduce(
      (sum, r) => sum + Object.values(r.tables).reduce((s, t) => s + t.updated, 0),
      0,
    );
    const hasErrors = results.some(r => r.status === 'error');

    return Response.json({
      message: `Importación completada: ${totalInserted} registros insertados, ${totalUpdated} actualizados`,
      totalFiles: files.length,
      totalInserted,
      totalUpdated,
      hasErrors,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return Response.json({ error: message }, { status: 500 });
  }
}
