"""
Management command · SIGAA
===========================
Reconcilia la FK `docente` en CargaAcademica basándose en `instructor_id_raw`
(cédula del docente). Se ejecuta después de importar Excel cuando los Employees
se crean posteriormente.

Uso:
    python manage.py reconciliar_docentes
"""
from django.core.management.base import BaseCommand

from academic_load.models import CargaAcademica
from employee.models import Employee


class Command(BaseCommand):
    help = "Reconcilia FK docente en CargaAcademica desde instructor_id_raw"

    def handle(self, *args, **options):
        huerfanas = CargaAcademica.objects.filter(
            docente__isnull=True
        ).exclude(instructor_id_raw__isnull=True).exclude(instructor_id_raw="")

        total_huerfanas = huerfanas.count()
        self.stdout.write(f"Huérfanas detectadas: {total_huerfanas}")

        # Indexar empleados por cédula (con variantes padded/sin zeros)
        emp_by_id = {}
        for e in Employee.objects.all():
            b = (e.badge_id or "").strip()
            if not b:
                continue
            emp_by_id[b] = e
            if b.isdigit():
                emp_by_id[b.lstrip("0")] = e
                emp_by_id[b.zfill(10)] = e

        resolvidas = 0
        sin_match = set()
        for c in huerfanas.iterator():
            raw = (c.instructor_id_raw or "").strip()
            emp = (emp_by_id.get(raw)
                   or emp_by_id.get(raw.lstrip("0"))
                   or emp_by_id.get(raw.zfill(10)))
            if emp:
                c.docente = emp
                c.save(update_fields=["docente"])
                resolvidas += 1
            else:
                sin_match.add(raw)

        self.stdout.write(self.style.SUCCESS(
            f"Resueltas: {resolvidas}/{total_huerfanas}"
        ))
        if sin_match:
            self.stdout.write(self.style.WARNING(
                f"Sin match: {len(sin_match)} cédulas no encontradas como Employee"
            ))
        total_con_fk = CargaAcademica.objects.filter(docente__isnull=False).count()
        self.stdout.write(f"Total clases con FK tras reconciliación: {total_con_fk}")
