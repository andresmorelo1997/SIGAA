"""
academic_load.import_helpers
============================
Lógica de importación de archivos Excel del SIGAA — equivalente Python al
`src/lib/import-helpers.ts` del SIGAA Next.js.

Maneja tres tipos de archivos:
  - US_PROG_CLASES_*.xlsx  → carga académica (clases)
  - LC_PROGRAMACION_*.xlsx → programación con docente
  - US_DATOS_DOCENTES_*.xlsx → datos docentes

Cada archivo Elysa trae un encabezado con metadata (ciclo_lectivo, grado,
campus). El parser detecta el tipo, encuentra la fila de headers, parsea
las filas y permite filtrar por campus seleccionados.
"""
from __future__ import annotations

import io
from typing import Iterable, Optional

from openpyxl import load_workbook


def detect_file_type(filename: str) -> str:
    name = (filename or "").upper()
    if "US_PROG_CLASES" in name:
        return "US_PROG"
    if "LC_PROG" in name:
        return "LC_PROG"
    if "US_DATOS_DOCENTES" in name or "US_DATOS" in name:
        return "US_DATOS"
    if "DOCENTES_IES" in name:
        return "DOCENTES_IES"
    return "UNKNOWN"


def find_header_row(sheet, max_search: int = 12) -> int:
    """Localiza la fila de headers (la que contiene 'Nº Clase' o 'Catálogo')."""
    for i, row in enumerate(sheet.iter_rows(max_row=max_search, values_only=True)):
        cells = [str(c).strip().lower() if c is not None else "" for c in row]
        joined = " | ".join(cells)
        if any(k in joined for k in ("nº clase", "no clase", "catálogo", "catalogo", "instructor")):
            return i
    return 0


def normalize_campus(value) -> str:
    if not value:
        return ""
    s = str(value).strip().upper()
    # Map common variants
    if s in ("MONTERIA", "MONTERÍA"):
        return "MONTR"
    if s in ("CARTAGENA",):
        return "CARTG"
    if s in ("BOGOTA", "BOGOTÁ"):
        return "BOGT"
    return s[:10]


def preview(file_bytes: bytes, filename: str) -> dict:
    """Lee el archivo y devuelve metadata sin insertar nada."""
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    sheet = wb.active

    file_type = detect_file_type(filename)
    header_row = find_header_row(sheet)
    headers = []
    for row in sheet.iter_rows(min_row=header_row + 1, max_row=header_row + 1, values_only=True):
        headers = [str(c).strip() if c is not None else "" for c in row]
        break

    def find_col(*candidates) -> int:
        for i, h in enumerate(headers):
            for cand in candidates:
                if h.strip().lower() == cand.lower():
                    return i
        return -1

    campus_col = find_col("Campus", "Sede")
    grado_col = find_col("Grado", "Nivel")
    ciclo_col = find_col("Ciclo Lectivo", "Ciclo", "Periodo")

    campus_set = set()
    grado_set = set()
    ciclo = ""
    total = 0

    for row in sheet.iter_rows(min_row=header_row + 2, values_only=True):
        if not any(c not in (None, "") for c in row):
            continue
        total += 1
        if campus_col >= 0:
            v = row[campus_col]
            if v not in (None, ""):
                campus_set.add(normalize_campus(v))
        if grado_col >= 0:
            v = row[grado_col]
            if v not in (None, ""):
                grado_set.add(str(v).strip()[:10])
        if not ciclo and ciclo_col >= 0:
            v = row[ciclo_col]
            if v not in (None, ""):
                ciclo = str(v).strip()[:10]

    wb.close()

    return {
        "file_type": file_type,
        "total_rows": total,
        "campus": sorted(campus_set),
        "grados": sorted(grado_set),
        "ciclo_lectivo": ciclo,
        "filename": filename,
    }


# Mapeo Excel → modelo (US_PROG_CLASES) — solo los campos clave
COLMAP_US_PROG = {
    "Nº Clase": "num_clase",
    "No Clase": "num_clase",
    "ID Curso": "id_curso",
    "Crd": "creditos",
    "Creditos": "creditos",
    "Sección": "seccion",
    "Estado Clase": "estado_clase",
    "Catálogo": "catalogo",
    "Asignaturas": "descripcion",
    "Descripción": "descripcion",
    "Componente": "componente",
    "Campus": "campus",
    "Grado": "grado",
    "Ciclo Lectivo": "ciclo_lectivo",
    "Grupo Académico": "grupo_academico",
    "Organización Académica": "org_academica",
    "Org. Academica": "desc_org_academica",
    "F Inicial": "fecha_inicial",
    "Fecha Final": "fecha_final",
    "Semanas": "semanas",
    "Hora Inicio": "hora_inicio",
    "Hora Fin": "hora_fin",
    "Jornada": "jornada",
    "Lunes": "lunes",
    "Martes": "martes",
    "Miércoles": "miercoles",
    "Jueves": "jueves",
    "Viernes": "viernes",
    "Sábado": "sabado",
    "Domingo": "domingo",
    "Cupos": "capacidad_inscripcion",
    "Capcidad Inscripción": "capacidad_inscripcion",
    "Total Inscripciones": "total_inscripciones",
    "Nombre Instructor": "nombre_instructor",
    "Instructor ID": "instructor_id_raw",
    "ID Instructor": "instructor_id_raw",
    "Hrs Semanal": "hrs_semanal",
    "Hrs Semestre": "hrs_semestre",
}


def parse_rows(file_bytes: bytes, allowed_campus: Optional[Iterable[str]] = None) -> list[dict]:
    """Parsea US_PROG_CLASES y retorna lista de dicts con kwargs para el modelo.

    Si `allowed_campus` se pasa, solo retorna filas cuyo campus esté en el set.
    """
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    sheet = wb.active
    header_row = find_header_row(sheet)
    headers = []
    for row in sheet.iter_rows(min_row=header_row + 1, max_row=header_row + 1, values_only=True):
        headers = [str(c).strip() if c is not None else "" for c in row]
        break

    allowed = set(allowed_campus) if allowed_campus is not None else None
    rows_out: list[dict] = []
    for row in sheet.iter_rows(min_row=header_row + 2, values_only=True):
        if not any(c not in (None, "") for c in row):
            continue
        kwargs: dict = {}
        for i, header in enumerate(headers):
            field = COLMAP_US_PROG.get(header.strip())
            if not field or i >= len(row):
                continue
            v = row[i]
            if v in (None, ""):
                continue
            if field == "campus":
                v = normalize_campus(v)
            kwargs[field] = v

        if allowed and kwargs.get("campus") not in allowed:
            continue

        # Padding instructor_id a 10 dígitos
        ins = kwargs.get("instructor_id_raw")
        if ins is not None:
            s = str(ins).strip()
            if s.isdigit() and len(s) < 10:
                kwargs["instructor_id_raw"] = s.zfill(10)
            else:
                kwargs["instructor_id_raw"] = s

        rows_out.append(kwargs)
    wb.close()
    return rows_out
