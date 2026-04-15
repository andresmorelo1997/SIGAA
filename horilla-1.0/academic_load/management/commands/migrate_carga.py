"""
academic_load.management.commands.migrate_carga
================================================
Lee /tmp/sigaa.db (SQLite SIGAA Next.js) y bulk-imports las 6.932 filas
de carga_academica → CargaAcademica con FK al docente migrado.
"""
import sqlite3
from django.core.management.base import BaseCommand

from academic_load.models import CargaAcademica
from base.models import Department
from employee.models import Employee


class Command(BaseCommand):
    help = "Migra carga_academica desde /tmp/sigaa.db a CargaAcademica de Horilla."

    def add_arguments(self, parser):
        parser.add_argument("--exclude-cartg", action="store_true",
                            help="Omitir filas con campus = CARTG")
        parser.add_argument("--reset", action="store_true",
                            help="Borrar tabla CargaAcademica antes de importar")

    def handle(self, *args, **opts):
        if opts["reset"]:
            n = CargaAcademica.objects.count()
            CargaAcademica.objects.all().delete()
            self.stdout.write(f"  → eliminadas {n} filas previas")

        src = sqlite3.connect("/tmp/sigaa.db")
        src.row_factory = sqlite3.Row

        emp_by_badge = {
            e.badge_id: e
            for e in Employee.objects.exclude(badge_id__isnull=True).exclude(badge_id="")
        }
        self.stdout.write(f"  → docentes en lookup: {len(emp_by_badge)}")

        cur = src.execute("""
            SELECT num_clase, id_curso, creditos, seccion, estado_clase, catalogo,
                   descripcion, componente, campus, ciclo_lectivo, grado,
                   grupo_academico, org_academica, desc_org_academica,
                   fecha_inicial, fecha_final, semanas, hora_inicio, hora_fin,
                   jornada, lunes, martes, miercoles, jueves, viernes, sabado,
                   domingo, capacidad_inscripcion, total_inscripciones,
                   nombre_instructor, instructor_id, hrs_semanal, hrs_semestre
              FROM carga_academica
        """)

        objs = []
        skipped_cartg = 0
        no_docente = 0

        for r in cur:
            campus = (r["campus"] or "").strip().upper()
            if opts["exclude_cartg"] and campus == "CARTG":
                skipped_cartg += 1
                continue

            ins_id = (r["instructor_id"] or "").strip()
            docente = emp_by_badge.get(ins_id) if ins_id else None
            if not docente and ins_id:
                no_docente += 1

            obj = CargaAcademica(
                num_clase=r["num_clase"], id_curso=r["id_curso"],
                creditos=r["creditos"], seccion=r["seccion"],
                estado_clase=r["estado_clase"] or "Activo",
                catalogo=r["catalogo"], descripcion=r["descripcion"],
                componente=r["componente"], campus=campus or None,
                ciclo_lectivo=r["ciclo_lectivo"], grado=r["grado"],
                grupo_academico=r["grupo_academico"],
                org_academica=r["org_academica"],
                desc_org_academica=r["desc_org_academica"],
                fecha_inicial=r["fecha_inicial"], fecha_final=r["fecha_final"],
                semanas=r["semanas"], hora_inicio=r["hora_inicio"],
                hora_fin=r["hora_fin"], jornada=r["jornada"],
                lunes=r["lunes"], martes=r["martes"], miercoles=r["miercoles"],
                jueves=r["jueves"], viernes=r["viernes"], sabado=r["sabado"],
                domingo=r["domingo"],
                capacidad_inscripcion=r["capacidad_inscripcion"],
                total_inscripciones=r["total_inscripciones"],
                nombre_instructor=r["nombre_instructor"],
                instructor_id_raw=ins_id or None,
                hrs_semanal=r["hrs_semanal"], hrs_semestre=r["hrs_semestre"],
                docente=docente,
            )
            objs.append(obj)

        self.stdout.write(f"  → preparadas {len(objs)} filas")
        CargaAcademica.objects.bulk_create(objs, batch_size=500)

        self.stdout.write(self.style.SUCCESS(
            f"✓ Migrado: {len(objs)} clases | "
            f"docentes vinculados: {len(objs) - no_docente} | "
            f"sin docente: {no_docente}" +
            (f" | omitidas (CARTG): {skipped_cartg}" if opts["exclude_cartg"] else "")
        ))
