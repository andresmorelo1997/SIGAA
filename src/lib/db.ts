import Database from 'better-sqlite3';
import path from 'path';
import { hashSync } from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'sigaa.db');

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  initializeTables(_db);
  runMigrations(_db);
  seedDefaults(_db);

  return _db;
}

function initializeTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT,
      rol TEXT DEFAULT 'admin',
      created_at TEXT
    );

    -- =============================================
    -- IMPORT HISTORY - tracks every file imported
    -- =============================================
    CREATE TABLE IF NOT EXISTS import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL DEFAULT 'UNKNOWN',
      file_size INTEGER,
      ciclo_lectivo TEXT,
      grado TEXT,
      campus TEXT,
      records_inserted INTEGER DEFAULT 0,
      records_updated INTEGER DEFAULT 0,
      records_skipped INTEGER DEFAULT 0,
      tables_affected TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      user_id INTEGER,
      created_at TEXT NOT NULL
    );

    -- =============================================
    -- CARGA ACADEMICA - class scheduling from US_PROG_CLASES
    -- =============================================
    CREATE TABLE IF NOT EXISTS carga_academica (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      num_clase INT,
      id_curso INT,
      creditos INT,
      seccion INT,
      estado_clase TEXT,
      catalogo TEXT,
      catalogos_excluidos TEXT,
      descripcion TEXT,
      id_instal TEXT,
      factor_carga TEXT,
      fecha_inicial TEXT,
      fecha_final TEXT,
      fecha_ini_santa TEXT,
      fecha_final_santa TEXT,
      semanas INT,
      hr_ini_final INT,
      hora_inicio TEXT,
      hora_fin TEXT,
      jornada TEXT,
      lunes TEXT,
      dias_lunes INT,
      martes TEXT,
      dias_martes INT,
      miercoles TEXT,
      dias_miercoles INT,
      jueves TEXT,
      dias_jueves INT,
      viernes TEXT,
      dias_viernes INT,
      sabado TEXT,
      dias_sabados INT,
      domingo TEXT,
      dias_domingos INT,
      capacidad_inscripcion INT,
      capacidad_aula INT,
      total_inscripciones INT,
      total_horas_curso REAL,
      grupo_academico TEXT,
      org_academica TEXT,
      desc_org_academica TEXT,
      campus TEXT,
      nombre_instructor TEXT,
      acceso TEXT,
      institucion TEXT,
      instructor_id TEXT,
      grado TEXT,
      ciclo_lectivo TEXT,
      num_dias INT,
      horas_clase TEXT,
      hrs_diurna REAL,
      hrs_nocturna REAL,
      hrs_noct_final REAL,
      componente TEXT,
      horas_profesor REAL,
      hrs_semanal REAL,
      hrs_semestre REAL,
      horas_carga_trabajo REAL,
      atrib_curso TEXT,
      atrib_curso_2 TEXT,
      tipo_curso TEXT,
      archivo_origen TEXT,
      fecha_importacion TEXT,
      import_id INTEGER REFERENCES import_history(id)
    );

    -- =============================================
    -- DOCENTES - teacher master data (basic + SNIES)
    -- =============================================
    CREATE TABLE IF NOT EXISTS docentes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ciclo_lectivo TEXT,
      campus TEXT,
      instructor_id TEXT,
      primer_nombre TEXT,
      segundo_nombre TEXT,
      primer_apellido TEXT,
      segundo_apellido TEXT,
      tipo_doc TEXT,
      doc_id TEXT,
      ciudad TEXT,
      direccion TEXT,
      telefono TEXT,
      correo TEXT,
      fecha_inicio TEXT,
      fecha_final TEXT,
      -- SNIES: DOCENTE_IES fields
      fecha_nacimiento TEXT,
      id_pais_nacimiento TEXT,
      id_municipio_nacimiento TEXT,
      email_institucional TEXT,
      id_nivel_max_estudio TEXT,
      titulo_recibido TEXT,
      fecha_grado TEXT,
      id_pais_institucion_estudio TEXT,
      titulo_convalidado TEXT,
      id_ies_estudio TEXT,
      nombre_institucion_estudio TEXT,
      id_metodologia_programa TEXT,
      fecha_ingreso_ies TEXT,
      -- SNIES: DOCENTE_CONTRATO fields
      tipo_contrato TEXT,
      dedicacion TEXT,
      metodologia_contrato TEXT,
      nivel_contrato TEXT,
      horas_dedicacion_semestre REAL,
      asignacion_basica_mensual REAL,
      pct_docencia REAL,
      pct_investigacion REAL,
      pct_administrativa REAL,
      pct_extension REAL,
      pct_otras REAL,
      -- Additional fields from 580
      actividad_academica TEXT,
      actividad_academica_abreviada TEXT,
      facultad TEXT,
      programa_adscripcion TEXT,
      tipo_escala TEXT,
      calificacion TEXT,
      categoria_escalafon TEXT,
      tipo_contrato_texto TEXT,
      antiguedad TEXT,
      nivel_formacion_texto TEXT,
      -- Tracking
      import_id INTEGER REFERENCES import_history(id)
    );

    -- =============================================
    -- DOCENTE CAPACITACIONES - SNIES training data
    -- =============================================
    CREATE TABLE IF NOT EXISTS docente_capacitaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doc_id TEXT,
      anio INT,
      semestre INT,
      tipo_capacitacion TEXT,
      num_horas REAL,
      tipo_curso TEXT,
      tema_curso TEXT,
      pais TEXT,
      nombre_curso TEXT,
      import_id INTEGER REFERENCES import_history(id)
    );

    -- =============================================
    -- PLAN DE ESTUDIOS - curriculum structure
    -- =============================================
    CREATE TABLE IF NOT EXISTS plan_estudios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      programa_academico TEXT,
      grado TEXT,
      modalidad TEXT,
      cohorte TEXT,
      semestre TEXT,
      clase TEXT,
      catalogo TEXT,
      asignatura TEXT,
      componente TEXT,
      atrib_curso TEXT,
      fecha_inicial TEXT,
      fecha_final TEXT,
      total_hrs_curso REAL,
      hrs_semanal REAL,
      hrs_semestre REAL,
      inscritos INT,
      import_id INTEGER REFERENCES import_history(id)
    );

    -- =============================================
    -- PROFESORES x ASIGNATURA - professor-subject mapping
    -- =============================================
    CREATE TABLE IF NOT EXISTS profesores_asignatura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instructor TEXT,
      docente_id TEXT,
      clase TEXT,
      programa_academico TEXT,
      grado TEXT,
      modalidad TEXT,
      cohorte TEXT,
      semestre TEXT,
      cedula TEXT,
      dedicacion TEXT,
      catalogo TEXT,
      asignatura TEXT,
      inscritos INT,
      componente TEXT,
      atrib_curso TEXT,
      fecha_inicial TEXT,
      fecha_final TEXT,
      total_hrs_curso REAL,
      hrs_semanal REAL,
      hrs_semestre REAL,
      -- Extended from LC_PROG
      org_acad_clase TEXT,
      materia TEXT,
      hora_inicio TEXT,
      hora_fin TEXT,
      lunes TEXT, martes TEXT, miercoles TEXT, jueves TEXT, viernes TEXT, sabado TEXT, domingo TEXT,
      tema_libre TEXT,
      ciclo_lectivo TEXT,
      campus TEXT,
      import_id INTEGER REFERENCES import_history(id)
    );

    -- =============================================
    -- PRENOMINA - real payroll structure with cortes
    -- =============================================
    CREATE TABLE IF NOT EXISTS prenomina (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dedicacion TEXT,
      nombre_instructor TEXT,
      documento TEXT,
      instructor_id TEXT,
      campus TEXT,
      programa_academico TEXT,
      grado TEXT,
      ccl_lvo TEXT,
      cohorte TEXT,
      modalidad TEXT,
      semestre_cohorte TEXT,
      num_clase INT,
      catalogo TEXT,
      asignatura TEXT,
      componente TEXT,
      inscritos INT,
      observacion TEXT,
      hrs_semana REAL,
      hrs_semestre REAL,
      fecha_inicial TEXT,
      fecha_final TEXT,
      corte_1 REAL DEFAULT 0,
      corte_2 REAL DEFAULT 0,
      corte_3 REAL DEFAULT 0,
      corte_4 REAL DEFAULT 0,
      corte_5 REAL DEFAULT 0,
      corte_6 REAL DEFAULT 0,
      periodo TEXT,
      tipo TEXT DEFAULT 'PREGRADO',
      estado TEXT DEFAULT 'pendiente',
      import_id INTEGER REFERENCES import_history(id),
      created_at TEXT
    );

    -- =============================================
    -- NOVEDADES - real structure from prenomina file
    -- =============================================
    CREATE TABLE IF NOT EXISTS novedades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      num_clase INT,
      catalogo TEXT,
      asignatura TEXT,
      instructor_sale TEXT,
      instructor_sale_id TEXT,
      instructor_entra TEXT,
      instructor_entra_id TEXT,
      horas_afectadas REAL,
      tipo TEXT,
      motivo TEXT,
      periodo TEXT,
      grado TEXT,
      campus TEXT,
      estado TEXT DEFAULT 'pendiente',
      detectada_auto INTEGER DEFAULT 0,
      import_id INTEGER REFERENCES import_history(id),
      created_at TEXT
    );

    -- =============================================
    -- NOVEDADES AUTO - auto-detected changes between imports
    -- =============================================
    CREATE TABLE IF NOT EXISTS novedades_auto (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT,
      entidad TEXT,
      entidad_id TEXT,
      descripcion TEXT,
      datos_anterior TEXT,
      datos_nuevo TEXT,
      import_anterior_id INTEGER,
      import_nuevo_id INTEGER,
      estado TEXT DEFAULT 'pendiente',
      created_at TEXT
    );

    -- =============================================
    -- ESCALAFON - faculty ranking
    -- =============================================
    CREATE TABLE IF NOT EXISTS escalafon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      docente_id TEXT,
      nombre TEXT,
      cedula TEXT,
      categoria TEXT,
      titulo TEXT,
      nivel_formacion TEXT,
      fecha_ingreso TEXT,
      antiguedad TEXT,
      puntos INT,
      observaciones TEXT
    );

    -- =============================================
    -- CORTES_PRENOMINA - configurable cut dates per grade
    -- =============================================
    CREATE TABLE IF NOT EXISTS cortes_prenomina (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodo TEXT NOT NULL,
      grado TEXT NOT NULL,
      num_corte INTEGER NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      descripcion TEXT,
      UNIQUE(periodo, grado, num_corte)
    );

    -- =============================================
    -- SEMANA_SANTA_CONFIG - configurable per period + exceptions
    -- =============================================
    CREATE TABLE IF NOT EXISTS semana_santa_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodo TEXT NOT NULL,
      fecha_inicio TEXT NOT NULL,
      fecha_fin TEXT NOT NULL,
      UNIQUE(periodo)
    );

    -- Programs that work during Semana Santa (don't discount hours)
    CREATE TABLE IF NOT EXISTS semana_santa_excepciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodo TEXT NOT NULL,
      programa TEXT NOT NULL,
      catalogo_pattern TEXT,
      motivo TEXT,
      UNIQUE(periodo, programa)
    );

    -- =============================================
    -- DOCUMENTOS - document management
    -- =============================================
    CREATE TABLE IF NOT EXISTS documentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT,
      tipo TEXT,
      descripcion TEXT,
      archivo TEXT,
      fecha TEXT,
      estado TEXT DEFAULT 'activo',
      created_at TEXT
    );

    -- =============================================
    -- PROGRAMAS - academic programs
    -- =============================================
    CREATE TABLE IF NOT EXISTS programas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      nombre TEXT,
      grado TEXT,
      modalidad TEXT,
      facultad TEXT,
      creditos INT,
      duracion TEXT,
      snies TEXT,
      estado TEXT DEFAULT 'activo'
    );

    -- =============================================
    -- CALENDARIO - academic calendar
    -- =============================================
    CREATE TABLE IF NOT EXISTS calendario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodo TEXT,
      evento TEXT,
      fecha_inicio TEXT,
      fecha_fin TEXT,
      tipo TEXT,
      descripcion TEXT
    );

    -- =============================================
    -- PARAMETROS - system parameters
    -- =============================================
    CREATE TABLE IF NOT EXISTS parametros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clave TEXT UNIQUE NOT NULL,
      valor TEXT,
      descripcion TEXT,
      categoria TEXT
    );

    -- =============================================
    -- CORTES_EMITIDOS - tracks which cortes have been frozen/emitted
    -- =============================================
    CREATE TABLE IF NOT EXISTS cortes_emitidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periodo TEXT NOT NULL,
      grado TEXT NOT NULL,
      num_corte INTEGER NOT NULL,
      emitido_at TEXT NOT NULL,
      UNIQUE(periodo, grado, num_corte)
    );

    -- =============================================
    -- CORTES_CARGA - fotos (snapshots) del estado de carga_academica
    -- en un momento dado. Permite consultar "¿cómo estaba la carga
    -- a fecha X?" y rastrear cambios por import o manualmente.
    -- =============================================
    CREATE TABLE IF NOT EXISTS cortes_carga (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha_corte TEXT NOT NULL,        -- ISO: 'YYYY-MM-DD HH:MM:SS'
      tipo TEXT NOT NULL,               -- 'auto_pre_import' | 'manual' | 'auto_post_import'
      nombre TEXT,                      -- Etiqueta legible (ej: 'Cierre marzo')
      descripcion TEXT,
      import_id INTEGER REFERENCES import_history(id),
      ciclo_lectivo TEXT,
      total_filas INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    -- Detalle por fila: copia de cada registro de carga_academica al momento del corte
    CREATE TABLE IF NOT EXISTS cortes_carga_detalle (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corte_id INTEGER NOT NULL REFERENCES cortes_carga(id) ON DELETE CASCADE,
      carga_id INTEGER,                 -- id original en carga_academica (puede desaparecer)
      num_clase INT,
      id_curso INT,
      creditos INT,
      seccion INT,
      estado_clase TEXT,
      catalogo TEXT,
      catalogos_excluidos TEXT,
      descripcion TEXT,
      fecha_inicial TEXT,
      fecha_final TEXT,
      semanas INT,
      hora_inicio TEXT,
      hora_fin TEXT,
      jornada TEXT,
      lunes TEXT, martes TEXT, miercoles TEXT, jueves TEXT,
      viernes TEXT, sabado TEXT, domingo TEXT,
      capacidad_inscripcion INT,
      total_inscripciones INT,
      total_horas_curso REAL,
      grupo_academico TEXT,
      org_academica TEXT,
      desc_org_academica TEXT,
      campus TEXT,
      nombre_instructor TEXT,
      instructor_id TEXT,
      grado TEXT,
      ciclo_lectivo TEXT,
      num_dias INT,
      horas_clase TEXT,
      hrs_diurna REAL,
      hrs_nocturna REAL,
      hrs_semanal REAL,
      hrs_semestre REAL,
      atrib_curso TEXT,
      tipo_curso TEXT
    );

    -- =============================================
    -- NOVEDADES_SEGUIMIENTO - historial de cambios de estado de novedades
    -- =============================================
    CREATE TABLE IF NOT EXISTS novedades_seguimiento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novedad_id INTEGER NOT NULL REFERENCES novedades(id) ON DELETE CASCADE,
      estado_anterior TEXT,
      estado_nuevo TEXT NOT NULL,
      observacion TEXT,
      usuario TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

/** Run migrations for existing databases that need schema updates */
function runMigrations(db: Database.Database): void {
  // Helper to safely add a column
  function addColumn(table: string, column: string, type: string) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch {
      // Column already exists - ignore
    }
  }

  // Add import_id to tables that may have been created without it
  addColumn('carga_academica', 'import_id', 'INTEGER REFERENCES import_history(id)');
  addColumn('docentes', 'import_id', 'INTEGER REFERENCES import_history(id)');
  addColumn('profesores_asignatura', 'import_id', 'INTEGER REFERENCES import_history(id)');
  addColumn('plan_estudios', 'import_id', 'INTEGER REFERENCES import_history(id)');

  // Columnas derivadas del macro VBA "MacroProgramacionAcademicafinal"
  // Se agregan aquí para DBs existentes; las nuevas incluyen estos campos
  // desde el CREATE TABLE actualizado.
  addColumn('carga_academica', 'hr_ini_final', 'INTEGER');
  addColumn('carga_academica', 'dias_lunes', 'INTEGER');
  addColumn('carga_academica', 'dias_martes', 'INTEGER');
  addColumn('carga_academica', 'dias_miercoles', 'INTEGER');
  addColumn('carga_academica', 'dias_jueves', 'INTEGER');
  addColumn('carga_academica', 'dias_viernes', 'INTEGER');
  addColumn('carga_academica', 'dias_sabados', 'INTEGER');
  addColumn('carga_academica', 'dias_domingos', 'INTEGER');

  // Novedades: consecutivo por ciclo lectivo + estado de seguimiento
  addColumn('novedades', 'consecutivo', 'TEXT');
  addColumn('novedades', 'ciclo_lectivo', 'TEXT');
  addColumn('novedades', 'estado_seguimiento', "TEXT DEFAULT 'Aprobada'");
  addColumn('novedades', 'fecha_aplicacion', 'TEXT');
  addColumn('novedades', 'observaciones_seguimiento', 'TEXT');

  // Add SNIES fields to docentes (for existing DBs)
  const sniesColumns = [
    'fecha_nacimiento TEXT', 'id_pais_nacimiento TEXT', 'id_municipio_nacimiento TEXT',
    'email_institucional TEXT', 'id_nivel_max_estudio TEXT', 'titulo_recibido TEXT',
    'fecha_grado TEXT', 'id_pais_institucion_estudio TEXT', 'titulo_convalidado TEXT',
    'id_ies_estudio TEXT', 'nombre_institucion_estudio TEXT', 'id_metodologia_programa TEXT',
    'fecha_ingreso_ies TEXT', 'tipo_contrato TEXT', 'dedicacion TEXT',
    'metodologia_contrato TEXT', 'nivel_contrato TEXT', 'horas_dedicacion_semestre REAL',
    'asignacion_basica_mensual REAL', 'pct_docencia REAL', 'pct_investigacion REAL',
    'pct_administrativa REAL', 'pct_extension REAL', 'pct_otras REAL',
    'actividad_academica TEXT', 'actividad_academica_abreviada TEXT',
    'facultad TEXT', 'programa_adscripcion TEXT',
    'tipo_escala TEXT', 'calificacion TEXT', 'categoria_escalafon TEXT',
    'tipo_contrato_texto TEXT', 'antiguedad TEXT', 'nivel_formacion_texto TEXT',
  ];
  for (const col of sniesColumns) {
    const [name, ...typeParts] = col.split(' ');
    addColumn('docentes', name, typeParts.join(' '));
  }

  // Add extended columns to profesores_asignatura
  const profExtCols = [
    'org_acad_clase TEXT', 'materia TEXT', 'hora_inicio TEXT', 'hora_fin TEXT',
    'lunes TEXT', 'martes TEXT', 'miercoles TEXT', 'jueves TEXT',
    'viernes TEXT', 'sabado TEXT', 'domingo TEXT', 'tema_libre TEXT',
    'ciclo_lectivo TEXT', 'campus TEXT',
  ];
  for (const col of profExtCols) {
    const [name, ...typeParts] = col.split(' ');
    addColumn('profesores_asignatura', name, typeParts.join(' '));
  }

  // Add num_corte_emitido to prenomina for tagging frozen corte rows
  addColumn('prenomina', 'num_corte_emitido', 'INTEGER');

  // Migrate novedades to match F-GC-002 university format
  migrateNovedadesSchema(db);

  // Migrate docentes: remove UNIQUE on doc_id if exists, create composite index
  migrateDocentesUnique(db);

  // Create UPSERT indexes
  const indexes = [
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_carga_upsert ON carga_academica(num_clase, ciclo_lectivo, hora_inicio, hora_fin)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_docentes_upsert ON docentes(doc_id, ciclo_lectivo)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_prof_asig_upsert ON profesores_asignatura(clase, docente_id, catalogo)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_upsert ON plan_estudios(clase, programa_academico, catalogo)',
    // Unicidad del consecutivo dentro de un ciclo lectivo
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_novedades_consecutivo ON novedades(ciclo_lectivo, consecutivo) WHERE consecutivo IS NOT NULL',
    // Búsquedas por corte / fecha
    'CREATE INDEX IF NOT EXISTS idx_cortes_carga_fecha ON cortes_carga(fecha_corte)',
    'CREATE INDEX IF NOT EXISTS idx_cortes_carga_detalle_corte ON cortes_carga_detalle(corte_id)',
    'CREATE INDEX IF NOT EXISTS idx_novedades_seg_novedad ON novedades_seguimiento(novedad_id)',
  ];
  for (const idx of indexes) {
    try { db.exec(idx); } catch { /* index may conflict with data */ }
  }
}

/** Migrate novedades table to match F-GC-002 university format */
function migrateNovedadesSchema(db: Database.Database): void {
  // Helper to safely add a column
  function addColumn(table: string, column: string, type: string) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    } catch {
      // Column already exists - ignore
    }
  }

  // New columns for F-GC-002 format
  // Header
  addColumn('novedades', 'tipo_programa', "TEXT DEFAULT 'PREGRADO'");
  addColumn('novedades', 'programa', 'TEXT');

  // Docente Saliente (outgoing teacher) - expand existing fields and add new ones
  addColumn('novedades', 'docente_sale', 'TEXT');
  addColumn('novedades', 'docente_sale_id', 'TEXT');
  addColumn('novedades', 'docente_sale_dedicacion', 'TEXT');
  addColumn('novedades', 'fecha_inicio_sale', 'TEXT');
  addColumn('novedades', 'fecha_salida', 'TEXT');

  // Asignatura (subject/class details)
  addColumn('novedades', 'semestre', 'INTEGER');
  addColumn('novedades', 'grupo', 'TEXT');
  addColumn('novedades', 'horas_teoricas', 'REAL DEFAULT 0');
  addColumn('novedades', 'horas_practicas', 'REAL DEFAULT 0');
  addColumn('novedades', 'intensidad_semestral', 'REAL DEFAULT 0');
  addColumn('novedades', 'horas_dictadas', 'REAL DEFAULT 0');
  addColumn('novedades', 'horas_ausencia', 'REAL DEFAULT 0');
  addColumn('novedades', 'horas_restantes', 'REAL DEFAULT 0');
  addColumn('novedades', 'aula', 'TEXT');
  addColumn('novedades', 'horario', 'TEXT');

  // Motivo (type of change)
  addColumn('novedades', 'motivo_detalle', 'TEXT');

  // Docente Entrante (incoming teacher)
  addColumn('novedades', 'docente_entra', 'TEXT');
  addColumn('novedades', 'docente_entra_id', 'TEXT');
  addColumn('novedades', 'docente_entra_dedicacion', 'TEXT');
  addColumn('novedades', 'fecha_inicio_entra', 'TEXT');
  addColumn('novedades', 'fecha_salida_entra', 'TEXT');
  addColumn('novedades', 'total_horas_contratar', 'REAL DEFAULT 0');

  // Metadata
  addColumn('novedades', 'observaciones', 'TEXT');
  addColumn('novedades', 'efecto_aplicado', 'INTEGER DEFAULT 0');

  // Approvals
  addColumn('novedades', 'aprobado_jefe_programa', 'TEXT');
  addColumn('novedades', 'aprobado_decano', 'TEXT');
  addColumn('novedades', 'aprobado_director_academico', 'TEXT');
  addColumn('novedades', 'aprobado_rector', 'TEXT');
  addColumn('novedades', 'updated_at', 'TEXT');
}

/** Remove UNIQUE constraint on docentes.doc_id by recreating table */
function migrateDocentesUnique(db: Database.Database): void {
  try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='docentes'").get() as { sql: string } | undefined;
    if (!schema || !schema.sql.includes('doc_id TEXT UNIQUE')) return;

    // Table has UNIQUE constraint, need to recreate
    const count = (db.prepare('SELECT COUNT(*) as c FROM docentes').get() as { c: number }).c;

    db.exec('ALTER TABLE docentes RENAME TO docentes_old');
    // Re-run the CREATE TABLE (which now has doc_id TEXT without UNIQUE)
    db.exec(`
      CREATE TABLE docentes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ciclo_lectivo TEXT, campus TEXT, instructor_id TEXT,
        primer_nombre TEXT, segundo_nombre TEXT, primer_apellido TEXT, segundo_apellido TEXT,
        tipo_doc TEXT, doc_id TEXT, ciudad TEXT, direccion TEXT, telefono TEXT, correo TEXT,
        fecha_inicio TEXT, fecha_final TEXT,
        fecha_nacimiento TEXT, id_pais_nacimiento TEXT, id_municipio_nacimiento TEXT,
        email_institucional TEXT, id_nivel_max_estudio TEXT, titulo_recibido TEXT,
        fecha_grado TEXT, id_pais_institucion_estudio TEXT, titulo_convalidado TEXT,
        id_ies_estudio TEXT, nombre_institucion_estudio TEXT, id_metodologia_programa TEXT,
        fecha_ingreso_ies TEXT, tipo_contrato TEXT, dedicacion TEXT,
        metodologia_contrato TEXT, nivel_contrato TEXT, horas_dedicacion_semestre REAL,
        asignacion_basica_mensual REAL, pct_docencia REAL, pct_investigacion REAL,
        pct_administrativa REAL, pct_extension REAL, pct_otras REAL,
        actividad_academica TEXT, actividad_academica_abreviada TEXT,
        facultad TEXT, programa_adscripcion TEXT,
        tipo_escala TEXT, calificacion TEXT, categoria_escalafon TEXT,
        tipo_contrato_texto TEXT, antiguedad TEXT, nivel_formacion_texto TEXT,
        import_id INTEGER REFERENCES import_history(id)
      )
    `);

    // Copy data from old table (only columns that existed)
    const oldCols = db.prepare("PRAGMA table_info(docentes_old)").all() as { name: string }[];
    const oldColNames = oldCols.map(c => c.name).filter(n => n !== 'id');
    if (oldColNames.length > 0) {
      db.exec(`INSERT INTO docentes (${oldColNames.join(', ')}) SELECT ${oldColNames.join(', ')} FROM docentes_old`);
    }
    db.exec('DROP TABLE docentes_old');

    const newCount = (db.prepare('SELECT COUNT(*) as c FROM docentes').get() as { c: number }).c;
    if (newCount !== count) {
      console.warn(`Docentes migration: expected ${count} rows, got ${newCount}`);
    }
  } catch {
    // Migration already done or table doesn't need it
  }
}

function seedDefaults(db: Database.Database): void {
  const existingAdmin = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get('admin');

  if (!existingAdmin) {
    const hashedPassword = hashSync('admin123', 10);
    db.prepare(
      `INSERT OR IGNORE INTO users (username, password, nombre, rol, created_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run('admin', hashedPassword, 'Administrador', 'admin', new Date().toISOString());
  }

  const defaultParams: { clave: string; valor: string; descripcion: string; categoria: string }[] = [
    { clave: 'periodo_actual', valor: '2026-1', descripcion: 'Periodo academico actual', categoria: 'general' },
    { clave: 'institucion', valor: 'USINU', descripcion: 'Codigo de la institucion', categoria: 'general' },
    { clave: 'campus', valor: 'MONTR', descripcion: 'Campus principal', categoria: 'general' },
    { clave: 'semana_santa_inicio', valor: '2026-03-30', descripcion: 'Inicio Semana Santa (no se trabaja)', categoria: 'academico' },
    { clave: 'semana_santa_fin', valor: '2026-04-05', descripcion: 'Fin Semana Santa', categoria: 'academico' },
    { clave: 'tipos_novedades', valor: 'RENUNCIA,COMISION_ESTUDIO,LICENCIA,REASIGNACION,TERMINACION_CONTRATO,CAMBIO_HORARIO,CIERRE_CURSO,APERTURA_CURSO,CAMBIO_GRUPO', descripcion: 'Tipos de novedades disponibles (separados por coma)', categoria: 'academico' },
  ];

  const insertParam = db.prepare(
    `INSERT OR IGNORE INTO parametros (clave, valor, descripcion, categoria) VALUES (?, ?, ?, ?)`
  );
  for (const p of defaultParams) {
    insertParam.run(p.clave, p.valor, p.descripcion, p.categoria);
  }

  // Seed cortes_prenomina by grado (configurable by user later)
  // Ciclos: 2661=2026-1, 2663=2026-2, 2691=2026-1 MedQuir
  const insertCorte = db.prepare(
    `INSERT OR IGNORE INTO cortes_prenomina (periodo, grado, num_corte, fecha_inicio, fecha_fin, descripcion) VALUES (?, ?, ?, ?, ?, ?)`
  );

  // PREGRADO: 4 cortes (ene-may, ~16 semanas)
  const cortesPreg = [
    { n: 1, ini: '2026-01-19', fin: '2026-02-22', desc: 'Corte I Pregrado' },
    { n: 2, ini: '2026-02-23', fin: '2026-03-29', desc: 'Corte II Pregrado' },
    { n: 3, ini: '2026-04-06', fin: '2026-05-02', desc: 'Corte III Pregrado' },
    { n: 4, ini: '2026-05-03', fin: '2026-05-16', desc: 'Corte IV Pregrado' },
  ];
  for (const c of cortesPreg) {
    insertCorte.run('2026-1', 'PREG', c.n, c.ini, c.fin, c.desc);
    insertCorte.run('2026-1', 'PRE2', c.n, c.ini, c.fin, c.desc);
  }

  // POSGRADO/MSTR/DOCT: 6 cortes (ene-jun, ~24 semanas)
  const cortesPosg = [
    { n: 1, ini: '2026-01-19', fin: '2026-02-14', desc: 'Corte I Posgrado' },
    { n: 2, ini: '2026-02-15', fin: '2026-03-14', desc: 'Corte II Posgrado' },
    { n: 3, ini: '2026-03-15', fin: '2026-04-11', desc: 'Corte III Posgrado' },
    { n: 4, ini: '2026-04-12', fin: '2026-05-09', desc: 'Corte IV Posgrado' },
    { n: 5, ini: '2026-05-10', fin: '2026-06-06', desc: 'Corte V Posgrado' },
    { n: 6, ini: '2026-06-07', fin: '2026-06-30', desc: 'Corte VI Posgrado' },
  ];
  for (const c of cortesPosg) {
    insertCorte.run('2026-1', 'POSG', c.n, c.ini, c.fin, c.desc);
    insertCorte.run('2026-1', 'MSTR', c.n, c.ini, c.fin, c.desc);
    insertCorte.run('2026-1', 'DOCT', c.n, c.ini, c.fin, c.desc);
    insertCorte.run('2026-1', 'ESP', c.n, c.ini, c.fin, c.desc);
  }

  // Seed Semana Santa config (configurable by period from UI)
  db.prepare(
    `INSERT OR IGNORE INTO semana_santa_config (periodo, fecha_inicio, fecha_fin) VALUES (?, ?, ?)`
  ).run('2026-1', '2026-03-30', '2026-04-05');

  // Seed exceptions: Ginecologia y Pediatria trabajan en Semana Santa
  const insertExcepcion = db.prepare(
    `INSERT OR IGNORE INTO semana_santa_excepciones (periodo, programa, motivo) VALUES (?, ?, ?)`
  );
  insertExcepcion.run('2026-1', 'ESPGC', 'Ginecolog\u00eda y Obstetricia - trabajan en Semana Santa');
  insertExcepcion.run('2026-1', 'ESPED', 'Pediatr\u00eda - trabajan en Semana Santa');
}

const db = getDb();

export default db;
