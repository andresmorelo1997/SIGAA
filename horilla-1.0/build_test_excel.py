"""
Genera un Excel realista (US_PROG_CLASES.xlsx) tomando datos del SQLite
del SIGAA Next.js viejo, para probar el importador de SIGAA-Horilla.
"""
import sqlite3
from openpyxl import Workbook
import sys

src = sqlite3.connect(sys.argv[1] if len(sys.argv) > 1 else "/tmp/sigaa.db")
src.row_factory = sqlite3.Row

# Una muestra acotada (200 filas) para prueba veloz, mezcla varios campus
rows = src.execute("""
  SELECT num_clase, id_curso, creditos, seccion, estado_clase, catalogo,
         descripcion, componente, campus, ciclo_lectivo, grado,
         grupo_academico, org_academica, desc_org_academica,
         fecha_inicial, fecha_final, semanas, hora_inicio, hora_fin, jornada,
         lunes, martes, miercoles, jueves, viernes, sabado, domingo,
         capacidad_inscripcion, total_inscripciones,
         nombre_instructor, instructor_id, hrs_semanal, hrs_semestre
    FROM carga_academica
   WHERE instructor_id IS NOT NULL AND instructor_id != ''
   ORDER BY id
   LIMIT 200
""").fetchall()

wb = Workbook()
ws = wb.active
ws.title = "Programación"

# Agregar 4 filas de "metadata" Elysa antes del header
ws.append(["Universidad del Sinú — SIGAA"])
ws.append(["Reporte: US_PROG_CLASES (Programación de Clases)"])
ws.append(["Periodo: 2026-1"])
ws.append([])

# Headers (los nombres reales de Elysa)
HEADERS = [
  "Nº Clase", "ID Curso", "Crd", "Sección", "Estado Clase", "Catálogo",
  "Asignaturas", "Componente", "Campus", "Ciclo Lectivo", "Grado",
  "Grupo Académico", "Organización Académica", "Org. Academica",
  "F Inicial", "Fecha Final", "Semanas", "Hora Inicio", "Hora Fin", "Jornada",
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
  "Cupos", "Total Inscripciones",
  "Nombre Instructor", "Instructor ID", "Hrs Semanal", "Hrs Semestre",
]
ws.append(HEADERS)

for r in rows:
    ws.append([
      r["num_clase"], r["id_curso"], r["creditos"], r["seccion"], r["estado_clase"],
      r["catalogo"], r["descripcion"], r["componente"], r["campus"], r["ciclo_lectivo"],
      r["grado"], r["grupo_academico"], r["org_academica"], r["desc_org_academica"],
      r["fecha_inicial"], r["fecha_final"], r["semanas"], r["hora_inicio"],
      r["hora_fin"], r["jornada"], r["lunes"], r["martes"], r["miercoles"],
      r["jueves"], r["viernes"], r["sabado"], r["domingo"],
      r["capacidad_inscripcion"], r["total_inscripciones"],
      r["nombre_instructor"], r["instructor_id"], r["hrs_semanal"], r["hrs_semestre"],
    ])

out = sys.argv[2] if len(sys.argv) > 2 else "/tmp/test_us_prog.xlsx"
wb.save(out)
print(f"OK escritas {len(rows)} filas en {out}")
