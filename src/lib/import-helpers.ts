import * as XLSX from 'xlsx';
import db from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type FileType = 'US_PROG' | 'US_DATOS' | 'LC_PROG' | 'DOCENTES_IES' | 'PLAN_ESTUDIO' | 'MIXED' | 'UNKNOWN';

export interface ElysaMetadata {
  grado: string;
  cicloLectivo: string;
  campus: string;
  institucion: string;
  totalRegistros: number;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
}

// ─────────────────────────────────────────────────────────────
// Known headers per file type (used for header-row detection)
// ─────────────────────────────────────────────────────────────

export const KNOWN_HEADERS: Record<string, string[]> = {
  US_PROG: ['Nº Clase', 'ID Curso', 'Creditos', 'Sección', 'Estado Clase'],
  US_DATOS: ['Ccl Lvo', 'Campus', 'ID', 'Primer Nombre'],
  LC_PROG: ['ID', 'Nombre', 'Doc ID', 'Nº Clase'],
  DOCENTE_IES: ['NUM_DOCUMENTO', 'PRIMER_NOMBRE', 'SEGUNDO_NOMBRE'],
  DOCENTE_CONTRATO: ['NUM_DOCUMENTO', 'TIPO_CONTRATO'],
  DOCENTE_CAPACITACION: ['NUM_DOCUMENTO', 'ANIO', 'SEMESTRE'],
  PLAN_ESTUDIO: ['Institución', 'Campus', 'Grado', 'Prog Acad', 'Nom Largo'],
};

// ─────────────────────────────────────────────────────────────
// detectFileType
// ─────────────────────────────────────────────────────────────

/**
 * Detect the file type from the filename and sheet names.
 * Priority: filename pattern > sheet-name pattern.
 */
export function detectFileType(filename: string, sheetNames: string[]): FileType {
  const upper = filename.toUpperCase();

  // Filename-based detection
  if (upper.includes('US_PROG') || upper.includes('US PROG')) return 'US_PROG';
  if (upper.includes('US_DATOS') || upper.includes('US DATOS')) return 'US_DATOS';
  if (upper.includes('LC_PROG') || upper.includes('LC PROG')) return 'LC_PROG';
  if (upper.includes('DOCENTES_IES') || upper.includes('DOCENTES IES')) return 'DOCENTES_IES';

  // Plan de Estudio detection (case insensitive: filename contains "plan" and "estudio")
  const lower = filename.toLowerCase();
  if (lower.includes('plan') && lower.includes('estudio')) return 'PLAN_ESTUDIO';

  // Sheet-name-based detection (for files renamed or generic-named)
  const sheetSet = new Set(sheetNames.map(s => s.toUpperCase()));
  if (sheetSet.has('DOCENTE_IES') || sheetSet.has('DOCENTE_CONTRATO')) return 'DOCENTES_IES';

  // Content-heuristic: check first sheet headers
  return 'UNKNOWN';
}

// ─────────────────────────────────────────────────────────────
// extractMetadata
// ─────────────────────────────────────────────────────────────

/**
 * Extract metadata from rows 0-4 of an Elysa-format worksheet.
 *
 * Row 0: "Programación de clases | 3490"
 * Row 1: "Institución = USINU"
 * Row 2: "Grado = PREG"            (may be empty)
 * Row 3: "Ccl Lvo = 2461"
 * Row 4: "Campus = MONTR"          (may be empty)
 */
export function extractMetadata(sheet: XLSX.WorkSheet): ElysaMetadata {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });

  const meta: ElysaMetadata = {
    grado: '',
    cicloLectivo: '',
    campus: '',
    institucion: '',
    totalRegistros: 0,
  };

  if (raw.length === 0) return meta;

  // Helper: extract "Key = Value" from a row (may span multiple cells or be one string)
  function extractKV(row: unknown[]): string {
    const text = row.map(c => String(c ?? '').trim()).join(' ').trim();
    const idx = text.indexOf('=');
    if (idx >= 0) return text.substring(idx + 1).trim();
    return '';
  }

  // Row 0: title | count
  if (raw[0]) {
    const row0Text = (raw[0] as unknown[]).map(c => String(c ?? '')).join(' ');
    const pipeIdx = row0Text.lastIndexOf('|');
    if (pipeIdx >= 0) {
      const countStr = row0Text.substring(pipeIdx + 1).trim().replace(/[^\d]/g, '');
      meta.totalRegistros = parseInt(countStr, 10) || 0;
    }
  }

  // Row 1: Institución
  if (raw[1]) meta.institucion = extractKV(raw[1] as unknown[]);
  // Row 2: Grado
  if (raw[2]) meta.grado = extractKV(raw[2] as unknown[]);
  // Row 3: Ccl Lvo
  if (raw[3]) meta.cicloLectivo = extractKV(raw[3] as unknown[]);
  // Row 4: Campus
  if (raw[4]) meta.campus = extractKV(raw[4] as unknown[]);

  return meta;
}

// ─────────────────────────────────────────────────────────────
// findHeaderRow
// ─────────────────────────────────────────────────────────────

/**
 * Scan rows 0-15 to find the header row.
 * Returns the 0-based index of the row where at least 3 of the known headers appear.
 * Falls back to 0 if nothing is found.
 */
export function findHeaderRow(sheet: XLSX.WorkSheet, knownHeaders: string[]): number {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  const maxScan = Math.min(raw.length, 16);
  const headerSet = new Set(knownHeaders.map(h => h.trim().toLowerCase()));
  const threshold = Math.min(3, knownHeaders.length);

  for (let r = 0; r < maxScan; r++) {
    const row = raw[r] as unknown[];
    if (!row) continue;
    let matches = 0;
    for (const cell of row) {
      const val = String(cell ?? '').trim().toLowerCase();
      if (headerSet.has(val)) matches++;
      if (matches >= threshold) return r;
    }
  }

  return 0; // fallback
}

// ─────────────────────────────────────────────────────────────
// parseRows
// ─────────────────────────────────────────────────────────────

function cellToString(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return String(val).trim();
}

/**
 * Parse rows from a worksheet starting at headerRow.
 *
 * @param sheet        - The XLSX worksheet
 * @param headerRow    - 0-based index of the header row
 * @param columnMap    - Maps Excel header strings to DB column names
 * @param validColumns - Whitelist of valid DB column names
 * @param extraFields  - Additional key/value pairs to inject into every row
 */
export function parseRows(
  sheet: XLSX.WorkSheet,
  headerRow: number,
  columnMap: Record<string, string>,
  validColumns: string[],
  extraFields?: Record<string, unknown>,
): Record<string, unknown>[] {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  });

  if (raw.length <= headerRow + 1) return [];

  const headers = raw[headerRow] as unknown[];
  const validSet = new Set(validColumns);

  // Build index → dbCol mapping
  const headerMap = new Map<number, string>();
  let descripcionCount = 0;

  for (let i = 0; i < headers.length; i++) {
    const header = String(headers[i] ?? '').trim();

    // Handle duplicate "Descripción" columns (common in US_PROG)
    if (/^Descripci[oó]n$/i.test(header)) {
      descripcionCount++;
      if (descripcionCount === 1 && validSet.has('descripcion')) {
        headerMap.set(i, 'descripcion');
      } else if (descripcionCount === 2 && validSet.has('desc_org_academica')) {
        headerMap.set(i, 'desc_org_academica');
      }
      continue;
    }

    const dbCol = columnMap[header];
    if (dbCol && validSet.has(dbCol)) {
      headerMap.set(i, dbCol);
    }
  }

  const rows: Record<string, unknown>[] = [];

  for (let r = headerRow + 1; r < raw.length; r++) {
    const rowData = raw[r] as unknown[];
    if (!rowData) continue;

    // Skip empty rows
    const hasData = rowData.some(
      cell => cell !== null && cell !== undefined && String(cell).trim() !== '',
    );
    if (!hasData) continue;

    const record: Record<string, unknown> = { ...(extraFields ?? {}) };

    for (const [colIdx, dbCol] of headerMap.entries()) {
      record[dbCol] = cellToString(rowData[colIdx]);
    }

    rows.push(record);
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────
// bulkUpsert
// ─────────────────────────────────────────────────────────────

/**
 * UPSERT rows into a table using INSERT ... ON CONFLICT DO UPDATE.
 * Uses a transaction for atomicity.
 *
 * @param table           - Target table name
 * @param rows            - Array of row objects
 * @param validColumns    - Whitelist of allowed column names
 * @param conflictColumns - Columns forming the UNIQUE constraint for conflict detection
 */
export function bulkUpsert(
  table: string,
  rows: Record<string, unknown>[],
  validColumns: string[],
  conflictColumns: string[],
): UpsertResult {
  if (rows.length === 0) return { inserted: 0, updated: 0 };

  // Collect all columns present across rows
  const validSet = new Set(validColumns);
  const colSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (validSet.has(key)) {
        colSet.add(key);
      }
    }
  }
  const columns = Array.from(colSet);
  const placeholders = columns.map(() => '?').join(', ');
  const conflictSet = new Set(conflictColumns);

  // Columns to update on conflict (everything except the conflict columns and 'id')
  const updateCols = columns.filter(c => !conflictSet.has(c) && c !== 'id');
  const updateClause = updateCols.map(c => `${c} = excluded.${c}`).join(', ');

  const sql = updateClause
    ? `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
       ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${updateClause}`
    : `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

  const stmt = db.prepare(sql);

  let inserted = 0;
  let updated = 0;

  const upsertAll = db.transaction((items: Record<string, unknown>[]) => {
    for (const item of items) {
      const values = columns.map(col => (item[col] !== undefined && item[col] !== '' ? item[col] : null));
      const result = stmt.run(...values);
      // changes === 1 for both insert and update in SQLite
      // We distinguish by checking lastInsertRowid: if it changed, it's an insert
      if (result.changes > 0) {
        // SQLite doesn't natively distinguish insert vs update in ON CONFLICT.
        // We use a heuristic: if the rowid equals lastInsertRowid from the statement, it's new.
        // A simpler approach: count total changes and estimate.
        inserted++;
      }
    }
  });

  // Get the count before to estimate inserts vs updates
  const countBefore = (
    db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }
  ).c;

  upsertAll(rows);

  const countAfter = (
    db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }
  ).c;

  const actualInserted = countAfter - countBefore;
  const actualUpdated = rows.length - actualInserted;

  return { inserted: Math.max(0, actualInserted), updated: Math.max(0, actualUpdated) };
}

// ─────────────────────────────────────────────────────────────
// autoCreateDocentes
// ─────────────────────────────────────────────────────────────

/**
 * Auto-create docentes records from carga_academica instructor data.
 * Parses "LASTNAME,FIRSTNAME" format for name splitting.
 *
 * @returns Number of new docentes created
 */
export function autoCreateDocentes(importId: number, cicloLectivo: string): number {
  // Get distinct instructors from carga_academica for this import
  const instructors = db
    .prepare(
      `SELECT DISTINCT instructor_id, nombre_instructor
       FROM carga_academica
       WHERE import_id = ? AND instructor_id IS NOT NULL AND instructor_id != ''`,
    )
    .all(importId) as { instructor_id: string; nombre_instructor: string }[];

  if (instructors.length === 0) return 0;

  const insertStmt = db.prepare(
    `INSERT INTO docentes (instructor_id, primer_nombre, primer_apellido, ciclo_lectivo, import_id)
     SELECT ?, ?, ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM docentes WHERE instructor_id = ? AND ciclo_lectivo = ?
     )`,
  );

  let created = 0;

  const createAll = db.transaction(() => {
    for (const { instructor_id, nombre_instructor } of instructors) {
      const { primerNombre, primerApellido } = parseInstructorName(nombre_instructor);

      const result = insertStmt.run(
        instructor_id,
        primerNombre,
        primerApellido,
        cicloLectivo,
        importId,
        instructor_id, // WHERE instructor_id = ?
        cicloLectivo,  // AND ciclo_lectivo = ?
      );

      if (result.changes > 0) created++;
    }
  });

  createAll();
  return created;
}

/**
 * Parse instructor name in "LASTNAME,FIRSTNAME" or "LASTNAME, FIRSTNAME MIDDLE" format.
 */
function parseInstructorName(name: string): { primerNombre: string; primerApellido: string } {
  if (!name || !name.trim()) {
    return { primerNombre: '', primerApellido: '' };
  }

  const trimmed = name.trim();
  const commaIdx = trimmed.indexOf(',');

  if (commaIdx >= 0) {
    const apellido = trimmed.substring(0, commaIdx).trim();
    const nombres = trimmed.substring(commaIdx + 1).trim();
    const primerNombre = nombres.split(/\s+/)[0] || '';
    return { primerNombre, primerApellido: apellido };
  }

  // No comma: try splitting by spaces (first = nombre, rest = apellido)
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return { primerNombre: parts[0], primerApellido: parts.slice(1).join(' ') };
  }

  return { primerNombre: trimmed, primerApellido: '' };
}

// ─────────────────────────────────────────────────────────────
// autoCreateProgramas
// ─────────────────────────────────────────────────────────────

/**
 * Extrae el código del programa y el grado a partir del `catalogo` de ELYSA.
 *
 * El `catalogo` tiene la forma `NNNNNXXXXX` donde:
 *   - `NNNNN`  es el número de clase/periodo (5 dígitos)
 *   - `XXXXX`  es el código del programa (típicamente 4-5 letras)
 *
 * El prefijo de `XXXXX` indica el grado:
 *   - ESP*, EPS*, CEP*, CES*, EDL*, ELE*, ESG*   → Especialización
 *   - MSTR*, MST*, MAES*, MAE*, MG*             → Maestría
 *   - DOC*, DOCT*, PHD*                          → Doctorado
 *   - PREG*, PRE*, PRG*, TEC*                    → Pregrado
 *
 * Devuelve `null` si el catálogo no coincide con el formato esperado.
 */
function parseCatalogo(catalogo: string | null | undefined): {
  codigo: string;
  grado: string;
} | null {
  if (!catalogo) return null;
  const match = /^\d+([A-Z]+)$/.exec(catalogo.trim().toUpperCase());
  if (!match) return null;
  const codigo = match[1];

  // Clasificación por prefijo
  if (/^(MSTR|MST|MAES|MAE|MG)/.test(codigo)) return { codigo, grado: 'Maestría' };
  if (/^(DOCT|DOC|PHD)/.test(codigo)) return { codigo, grado: 'Doctorado' };
  if (/^(PREG|PRE|PRG|TEC)/.test(codigo)) return { codigo, grado: 'Pregrado' };
  if (/^(ESP|EPS|CEP|CES|EDL|ELE|ESG|POS|POST)/.test(codigo))
    return { codigo, grado: 'Especialización' };

  // Fallback: código reconocido pero prefijo no mapeado → Posgrado genérico
  return { codigo, grado: 'Posgrado' };
}

/**
 * Crea filas en `programas` derivando un programa por cada código único de
 * catálogo presente en `carga_academica`. El grado se infiere del prefijo
 * del código (ESP→Especialización, MSTR→Maestría, DOC→Doctorado, etc.).
 *
 * Idempotente: usa `ON CONFLICT(codigo)` para actualizar los registros ya
 * existentes en lugar de duplicarlos.
 *
 * @param importId  Si se especifica, limita el origen a las filas de ese
 *                  import. Si no, usa toda la tabla `carga_academica`.
 * @returns         Cantidad de programas creados y actualizados.
 */
export function autoCreateProgramas(importId?: number): {
  created: number;
  updated: number;
} {
  const whereClause = importId
    ? "WHERE import_id = ? AND catalogo IS NOT NULL AND catalogo != ''"
    : "WHERE catalogo IS NOT NULL AND catalogo != ''";
  const params: unknown[] = importId ? [importId] : [];

  // Selecciona filas crudas; parseamos en TypeScript para extraer el código
  // del catálogo antes de agrupar
  const rows = db
    .prepare(
      `SELECT
         catalogo,
         org_academica,
         desc_org_academica,
         grupo_academico,
         descripcion
       FROM carga_academica
       ${whereClause}`,
    )
    .all(...params) as Array<{
    catalogo: string;
    org_academica: string | null;
    desc_org_academica: string | null;
    grupo_academico: string | null;
    descripcion: string | null;
  }>;

  if (rows.length === 0) return { created: 0, updated: 0 };

  // Agrupar por código de programa derivado del catálogo
  type Agg = {
    codigo: string;
    grado: string;
    facultad: string;
    nombre: string;
  };
  const agrupados = new Map<string, Agg>();

  for (const r of rows) {
    const parsed = parseCatalogo(r.catalogo);
    if (!parsed) continue;
    const { codigo, grado } = parsed;
    if (!agrupados.has(codigo)) {
      const depto = (r.desc_org_academica || r.org_academica || '').trim();
      // Nombre provisional: "<grado> — <departamento>"; el usuario puede editarlo
      const nombre = depto ? `${grado} — ${depto}` : codigo;
      agrupados.set(codigo, {
        codigo,
        grado,
        facultad: (r.grupo_academico || depto || '').trim(),
        nombre,
      });
    }
  }

  if (agrupados.size === 0) return { created: 0, updated: 0 };

  // Asegurar índice único sobre `codigo` para que funcione ON CONFLICT
  try {
    db.prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_programas_codigo ON programas(codigo)',
    ).run();
  } catch {
    /* ignore */
  }

  const insertStmt = db.prepare(
    `INSERT INTO programas (codigo, nombre, grado, modalidad, facultad, estado)
     VALUES (?, ?, ?, '', ?, 'activo')
     ON CONFLICT(codigo) DO UPDATE SET
       nombre   = CASE
                    WHEN programas.nombre IS NULL
                      OR programas.nombre = ''
                      OR programas.nombre LIKE '% — %'
                    THEN excluded.nombre
                    ELSE programas.nombre
                  END,
       grado    = excluded.grado,
       facultad = COALESCE(NULLIF(programas.facultad, ''), excluded.facultad)`,
  );

  let created = 0;
  let updated = 0;

  const tx = db.transaction(() => {
    for (const p of agrupados.values()) {
      const before = (
        db
          .prepare('SELECT COUNT(*) AS c FROM programas WHERE codigo = ?')
          .get(p.codigo) as { c: number }
      ).c;

      insertStmt.run(p.codigo, p.nombre, p.grado, p.facultad);

      if (before === 0) created++;
      else updated++;
    }
  });

  tx();
  return { created, updated };
}

// ─────────────────────────────────────────────────────────────
// autoCreatePlanEstudios
// ─────────────────────────────────────────────────────────────

/**
 * Derive `plan_estudios` rows directly from `carga_academica` so that the
 * Planes de Estudio module is populated even when the user has only imported
 * US_PROG_CLASES (and not the dedicated Revisión Planes Estudios sheet).
 *
 * The mapping is one row per class: each class becomes a study-plan entry
 * keyed on (clase, programa_academico, catalogo).
 *
 * @param importId  When provided, restrict source rows to this import.
 * @returns         Number of plan rows created or updated.
 */
export function autoCreatePlanEstudios(importId?: number): {
  created: number;
  updated: number;
} {
  const where = importId
    ? 'WHERE c.import_id = ? AND c.num_clase IS NOT NULL'
    : 'WHERE c.num_clase IS NOT NULL';
  const params = importId ? [importId] : [];

  const rows = db
    .prepare(
      `SELECT
         c.num_clase                            AS clase,
         c.catalogo                             AS catalogo,
         c.descripcion                          AS asignatura,
         c.componente                           AS componente,
         c.atrib_curso                          AS atrib_curso,
         c.fecha_inicial                        AS fecha_inicial,
         c.fecha_final                          AS fecha_final,
         c.total_horas_curso                    AS total_hrs_curso,
         c.hrs_semanal                          AS hrs_semanal,
         c.hrs_semestre                         AS hrs_semestre,
         c.total_inscripciones                  AS inscritos,
         c.import_id                            AS import_id,
         c.desc_org_academica                   AS departamento,
         c.jornada                              AS modalidad
       FROM carga_academica c
       ${where}`,
    )
    .all(...params) as Array<Record<string, unknown>>;

  if (rows.length === 0) return { created: 0, updated: 0 };

  // Make sure (clase, programa_academico, catalogo) is unique to avoid dups
  try {
    db.prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_estudios_unique
       ON plan_estudios(clase, programa_academico, catalogo)`,
    ).run();
  } catch {
    /* ignore */
  }

  const insertStmt = db.prepare(
    `INSERT INTO plan_estudios
       (programa_academico, grado, modalidad, cohorte, semestre,
        clase, catalogo, asignatura, componente, atrib_curso,
        fecha_inicial, fecha_final, total_hrs_curso, hrs_semanal,
        hrs_semestre, inscritos, import_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(clase, programa_academico, catalogo) DO UPDATE SET
       grado            = COALESCE(NULLIF(plan_estudios.grado, ''), excluded.grado),
       modalidad        = COALESCE(NULLIF(plan_estudios.modalidad, ''), excluded.modalidad),
       asignatura       = COALESCE(NULLIF(plan_estudios.asignatura, ''), excluded.asignatura),
       componente       = COALESCE(NULLIF(plan_estudios.componente, ''), excluded.componente),
       atrib_curso      = COALESCE(NULLIF(plan_estudios.atrib_curso, ''), excluded.atrib_curso),
       fecha_inicial    = COALESCE(NULLIF(plan_estudios.fecha_inicial, ''), excluded.fecha_inicial),
       fecha_final      = COALESCE(NULLIF(plan_estudios.fecha_final, ''), excluded.fecha_final),
       total_hrs_curso  = excluded.total_hrs_curso,
       hrs_semanal      = excluded.hrs_semanal,
       hrs_semestre     = excluded.hrs_semestre,
       inscritos        = excluded.inscritos,
       import_id        = excluded.import_id`,
  );

  let created = 0;
  let updated = 0;

  const tx = db.transaction(() => {
    for (const r of rows) {
      const catalogo = String(r.catalogo || '').trim();
      const parsed = parseCatalogo(catalogo);
      // Si el catálogo no es parseable caemos al departamento como fallback
      const programa = parsed?.codigo || String(r.departamento || '').trim();
      const grado = parsed?.grado || '';
      const clase = r.clase != null ? String(r.clase) : '';
      if (!clase || !programa) continue;

      const before = (
        db
          .prepare(
            'SELECT COUNT(*) AS c FROM plan_estudios WHERE clase = ? AND programa_academico = ? AND catalogo = ?',
          )
          .get(clase, programa, catalogo) as { c: number }
      ).c;

      insertStmt.run(
        programa,
        grado,
        String(r.modalidad || ''),
        '', // cohorte (no existe en carga_academica)
        '', // semestre (no existe en carga_academica)
        clase,
        catalogo,
        String(r.asignatura || ''),
        String(r.componente || ''),
        String(r.atrib_curso || ''),
        String(r.fecha_inicial || ''),
        String(r.fecha_final || ''),
        Number(r.total_hrs_curso || 0),
        Number(r.hrs_semanal || 0),
        Number(r.hrs_semestre || 0),
        Number(r.inscritos || 0),
        r.import_id ?? null,
      );

      if (before === 0) created++;
      else updated++;
    }
  });

  tx();
  return { created, updated };
}

// ─────────────────────────────────────────────────────────────
// createCorteCarga — snapshot del estado actual de carga_academica
// ─────────────────────────────────────────────────────────────

const CORTE_DETALLE_COLUMNS = [
  'num_clase', 'id_curso', 'creditos', 'seccion', 'estado_clase',
  'catalogo', 'catalogos_excluidos', 'descripcion',
  'fecha_inicial', 'fecha_final', 'semanas',
  'hora_inicio', 'hora_fin', 'jornada',
  'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
  'capacidad_inscripcion', 'total_inscripciones', 'total_horas_curso',
  'grupo_academico', 'org_academica', 'desc_org_academica', 'campus',
  'nombre_instructor', 'instructor_id', 'grado', 'ciclo_lectivo',
  'num_dias', 'horas_clase', 'hrs_diurna', 'hrs_nocturna',
  'hrs_semanal', 'hrs_semestre', 'atrib_curso', 'tipo_curso',
] as const;

export interface CorteCargaOptions {
  tipo: 'auto_pre_import' | 'auto_post_import' | 'manual';
  nombre?: string;
  descripcion?: string;
  importId?: number;
  cicloLectivo?: string;
  createdBy?: string;
  /** Filtro SQL adicional sobre carga_academica (ej: 'WHERE ciclo_lectivo = ?') */
  whereClause?: string;
  whereParams?: unknown[];
}

/**
 * Crea un corte (snapshot) del estado actual de carga_academica y devuelve
 * el id del corte. Cada import debería llamar a esta función ANTES de hacer
 * cualquier upsert, para poder reconstruir el estado previo.
 *
 * El snapshot copia un subconjunto representativo de columnas (las que
 * interesan para reporting: clase, docente, horas, jornada, etc.).
 */
export function createCorteCarga(opts: CorteCargaOptions): number {
  const now = new Date().toISOString();
  const fechaCorte = now.replace('T', ' ').substring(0, 19);

  // Crear el encabezado del corte
  const headerResult = db
    .prepare(
      `INSERT INTO cortes_carga
         (fecha_corte, tipo, nombre, descripcion, import_id,
          ciclo_lectivo, total_filas, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(
      fechaCorte,
      opts.tipo,
      opts.nombre || null,
      opts.descripcion || null,
      opts.importId ?? null,
      opts.cicloLectivo || null,
      opts.createdBy || 'sistema',
      now,
    );

  const corteId = Number(headerResult.lastInsertRowid);

  // Copiar detalle (INSERT ... SELECT)
  const detCols = CORTE_DETALLE_COLUMNS.join(', ');
  const whereSql = opts.whereClause ? ` ${opts.whereClause}` : '';
  const sql = `
    INSERT INTO cortes_carga_detalle
      (corte_id, carga_id, ${detCols})
    SELECT ?, id, ${detCols}
      FROM carga_academica${whereSql}
  `;
  const copyStmt = db.prepare(sql);
  const info = copyStmt.run(corteId, ...(opts.whereParams || []));
  const total = Number(info.changes);

  // Actualizar total_filas
  db.prepare('UPDATE cortes_carga SET total_filas = ? WHERE id = ?').run(total, corteId);

  return corteId;
}

/**
 * Clasifica un valor de `grado` en uno de los dos grupos usados para el
 * consecutivo de novedades: `PREG` (pregrado) o `POSG` (todo lo demás:
 * especialización, maestría, doctorado, posgrado genérico).
 *
 * Acepta tanto los valores normalizados que usa el parser (`Pregrado`,
 * `Especialización`, `Maestría`, `Doctorado`, `Posgrado`) como códigos
 * directos de ELYSA (`PREG`, `MG`, `ESP`, `DOC`, etc.).
 */
export function clasificarGradoGrupo(
  grado: string | null | undefined,
): 'PREG' | 'POSG' {
  if (!grado) return 'POSG';
  const g = String(grado).trim().toUpperCase();
  // Pregrado directo o por prefijo
  if (
    g === 'PREGRADO' ||
    g === 'PREG' ||
    g === 'PRE' ||
    /^(PREG|PRE|PRG|TEC)/.test(g)
  ) {
    return 'PREG';
  }
  return 'POSG';
}

/**
 * Asigna un consecutivo a una novedad con formato `NN-PREG` o `NN-POSG`
 * (por ejemplo `01-PREG`, `02-POSG`). El número se reinicia por ciclo
 * lectivo y por grupo de grado, así que el mismo número puede aparecer
 * en PREG y en POSG del mismo ciclo, pero nunca dos veces en el mismo
 * grupo+ciclo. Si la novedad ya tiene consecutivo lo devuelve sin cambios.
 */
export function asignarConsecutivoNovedad(novedadId: number): string | null {
  const row = db
    .prepare(
      'SELECT ciclo_lectivo, consecutivo, grado FROM novedades WHERE id = ?',
    )
    .get(novedadId) as
    | { ciclo_lectivo: string | null; consecutivo: string | null; grado: string | null }
    | undefined;

  if (!row) return null;
  if (row.consecutivo) return row.consecutivo;

  const ciclo = row.ciclo_lectivo || 'SIN_CICLO';
  const grupo = clasificarGradoGrupo(row.grado);
  const sufijo = `-${grupo}`;

  // Buscar el máximo consecutivo actual del ciclo+grupo (sufijo -PREG/-POSG).
  // Usamos LIKE sobre el sufijo y extraemos la parte numérica inicial.
  const maxRow = db
    .prepare(
      `SELECT MAX(CAST(substr(consecutivo, 1, instr(consecutivo, '-') - 1) AS INTEGER)) AS max_n
         FROM novedades
        WHERE ciclo_lectivo = ?
          AND consecutivo IS NOT NULL
          AND consecutivo LIKE ?`,
    )
    .get(ciclo, `%${sufijo}`) as { max_n: number | null };

  const next = (maxRow?.max_n || 0) + 1;
  const consecutivo = `${String(next).padStart(2, '0')}${sufijo}`;

  db.prepare('UPDATE novedades SET consecutivo = ? WHERE id = ?').run(
    consecutivo,
    novedadId,
  );
  return consecutivo;
}

/**
 * Registra un cambio de estado en la tabla `novedades_seguimiento` y actualiza
 * el estado actual de la novedad.
 */
export function registrarSeguimientoNovedad(
  novedadId: number,
  nuevoEstado: string,
  observacion?: string,
  usuario?: string,
): void {
  const current = db
    .prepare('SELECT estado_seguimiento FROM novedades WHERE id = ?')
    .get(novedadId) as { estado_seguimiento: string | null } | undefined;

  if (!current) throw new Error(`Novedad ${novedadId} no existe`);

  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO novedades_seguimiento
         (novedad_id, estado_anterior, estado_nuevo, observacion, usuario, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      novedadId,
      current.estado_seguimiento || null,
      nuevoEstado,
      observacion || null,
      usuario || 'sistema',
      now,
    );
    db.prepare('UPDATE novedades SET estado_seguimiento = ? WHERE id = ?').run(
      nuevoEstado,
      novedadId,
    );
    if (nuevoEstado === 'Aplicada') {
      db.prepare('UPDATE novedades SET fecha_aplicacion = ? WHERE id = ?').run(
        now.substring(0, 10),
        novedadId,
      );
    }
  });
  tx();
}

// ─────────────────────────────────────────────────────────────
// detectNovedades
// ─────────────────────────────────────────────────────────────

/**
 * Detect changes between the current import and the previous import of the same type/cycle.
 * Inserts records into novedades_auto.
 *
 * Detected changes:
 * - RENUNCIA: instructor present in prev but missing in current
 * - NUEVO_DOCENTE: instructor present in current but missing in prev
 * - CIERRE_CURSO: class present in prev but missing in current
 * - CAMBIO_DOCENTE: same class, different instructor
 *
 * @returns Number of novedades detected
 */
export function detectNovedades(importId: number, fileType: string, cicloLectivo: string): number {
  // Find previous import of the same file type and ciclo lectivo
  const prevImport = db
    .prepare(
      `SELECT id FROM import_history
       WHERE file_type = ? AND ciclo_lectivo = ? AND id < ? AND status = 'completed'
       ORDER BY id DESC LIMIT 1`,
    )
    .get(fileType, cicloLectivo, importId) as { id: number } | undefined;

  if (!prevImport) return 0;

  const prevId = prevImport.id;
  const now = new Date().toISOString();
  let count = 0;

  const insertNovedad = db.prepare(
    `INSERT INTO novedades_auto (tipo, entidad, entidad_id, descripcion, datos_anterior, datos_nuevo, import_anterior_id, import_nuevo_id, estado, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`,
  );

  const detectAll = db.transaction(() => {
    if (fileType === 'US_PROG') {
      // Compare instructor sets
      const prevInstructors = db
        .prepare(
          `SELECT DISTINCT instructor_id, nombre_instructor FROM carga_academica WHERE import_id = ? AND instructor_id IS NOT NULL AND instructor_id != ''`,
        )
        .all(prevId) as { instructor_id: string; nombre_instructor: string }[];

      const currInstructors = db
        .prepare(
          `SELECT DISTINCT instructor_id, nombre_instructor FROM carga_academica WHERE import_id = ? AND instructor_id IS NOT NULL AND instructor_id != ''`,
        )
        .all(importId) as { instructor_id: string; nombre_instructor: string }[];

      const prevSet = new Map(prevInstructors.map(i => [i.instructor_id, i.nombre_instructor]));
      const currSet = new Map(currInstructors.map(i => [i.instructor_id, i.nombre_instructor]));

      // Gone instructors → RENUNCIA
      for (const [id, nombre] of prevSet) {
        if (!currSet.has(id)) {
          insertNovedad.run('RENUNCIA', 'docente', id, `Instructor ${nombre} (${id}) ya no aparece en la carga`, nombre, null, prevId, importId, now);
          count++;
        }
      }

      // New instructors → NUEVO_DOCENTE
      for (const [id, nombre] of currSet) {
        if (!prevSet.has(id)) {
          insertNovedad.run('NUEVO_DOCENTE', 'docente', id, `Nuevo instructor ${nombre} (${id}) detectado`, null, nombre, prevId, importId, now);
          count++;
        }
      }

      // Compare classes
      const prevClasses = db
        .prepare(
          `SELECT num_clase, instructor_id, nombre_instructor, catalogo, hora_inicio, hora_fin
           FROM carga_academica WHERE import_id = ?`,
        )
        .all(prevId) as { num_clase: number; instructor_id: string; nombre_instructor: string; catalogo: string; hora_inicio: string; hora_fin: string }[];

      const currClasses = db
        .prepare(
          `SELECT num_clase, instructor_id, nombre_instructor, catalogo, hora_inicio, hora_fin
           FROM carga_academica WHERE import_id = ?`,
        )
        .all(importId) as { num_clase: number; instructor_id: string; nombre_instructor: string; catalogo: string; hora_inicio: string; hora_fin: string }[];

      // Key by num_clase + hora_inicio + hora_fin
      const prevClassMap = new Map<string, typeof prevClasses[0]>();
      for (const c of prevClasses) {
        prevClassMap.set(`${c.num_clase}|${c.hora_inicio}|${c.hora_fin}`, c);
      }

      const currClassMap = new Map<string, typeof currClasses[0]>();
      for (const c of currClasses) {
        currClassMap.set(`${c.num_clase}|${c.hora_inicio}|${c.hora_fin}`, c);
      }

      // Classes gone → CIERRE_CURSO
      for (const [key, prev] of prevClassMap) {
        if (!currClassMap.has(key)) {
          insertNovedad.run(
            'CIERRE_CURSO', 'clase', String(prev.num_clase),
            `Clase ${prev.num_clase} (${prev.catalogo}) ya no aparece`,
            JSON.stringify(prev), null, prevId, importId, now,
          );
          count++;
        }
      }

      // Instructor changes on existing classes → CAMBIO_DOCENTE
      for (const [key, curr] of currClassMap) {
        const prev = prevClassMap.get(key);
        if (prev && prev.instructor_id !== curr.instructor_id) {
          insertNovedad.run(
            'CAMBIO_DOCENTE', 'clase', String(curr.num_clase),
            `Clase ${curr.num_clase}: instructor cambió de ${prev.nombre_instructor} a ${curr.nombre_instructor}`,
            JSON.stringify(prev), JSON.stringify(curr), prevId, importId, now,
          );
          count++;
        }
      }
    }
  });

  detectAll();
  return count;
}
