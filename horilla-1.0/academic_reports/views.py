"""
academic_reports.views
======================
Centro de reportes SNIES con 10 tipos.
"""
import io

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Sum
from django.http import HttpResponse
from django.shortcuts import render

from openpyxl import Workbook

from academic_load.models import CargaAcademica
from employee.models import Employee
from base.models import JobPosition


REPORTES = {
    "actividad-academica": "Actividad Académica",
    "dedicacion": "Dedicación",
    "nivel-formacion": "Nivel de Formación",
    "profesores-asignaturas": "Profesores por Asignatura",
    "planta-profesoral": "Planta Profesoral",
    "horas-docentes": "Horas Docente",
    "escala-salarial": "Escala Salarial",
    "nuevas-plazas": "Nuevas Plazas",
    "reemplazos": "Reemplazos",
    "no-continuan": "No Continúan",
}


def _build_rows(tipo: str) -> tuple[list[str], list[list]]:
    """Devuelve (headers, rows) para cada tipo de reporte."""
    if tipo == "actividad-academica":
        headers = ["Cédula", "Docente", "Programa", "Actividad"]
        rows = []
        for e in Employee.objects.all()[:500]:
            rows.append([e.badge_id or "", f"{e.employee_first_name} {e.employee_last_name}",
                         "—", "Docencia"])
        return headers, rows

    if tipo == "dedicacion":
        headers = ["Dedicación", "Cantidad"]
        agg = Employee.objects.values("employee_work_info__job_position_id__job_position") \
            .annotate(n=Count("id")).order_by("-n")
        return headers, [[r["employee_work_info__job_position_id__job_position"] or "Sin asignar",
                          r["n"]] for r in agg]

    if tipo == "horas-docentes":
        headers = ["Cédula", "Docente", "Hrs/sem", "Hrs/sem.re", "N° Clases"]
        rows = []
        for e in Employee.objects.all():
            qs = CargaAcademica.objects.filter(docente=e)
            if not qs.exists():
                continue
            agg = qs.aggregate(hs=Sum("hrs_semanal"), hsr=Sum("hrs_semestre"), n=Count("id"))
            rows.append([e.badge_id or "",
                         f"{e.employee_first_name} {e.employee_last_name}",
                         agg["hs"] or 0, agg["hsr"] or 0, agg["n"]])
        return headers, rows

    if tipo == "planta-profesoral":
        headers = ["Cédula", "Docente", "Email", "Dedicación"]
        rows = []
        for e in Employee.objects.all().select_related("employee_work_info"):
            jp = getattr(e.employee_work_info, "job_position_id", None)
            rows.append([e.badge_id or "",
                         f"{e.employee_first_name} {e.employee_last_name}",
                         e.email, str(jp) if jp else "—"])
        return headers, rows

    if tipo == "profesores-asignaturas":
        headers = ["Catálogo", "Asignatura", "Docente", "Hrs/sem"]
        rows = [[c.catalogo or "", c.descripcion or "",
                 f"{c.docente.employee_first_name} {c.docente.employee_last_name}" if c.docente else "—",
                 c.hrs_semanal or 0]
                for c in CargaAcademica.objects.all().select_related("docente")[:1000]]
        return headers, rows

    # Reportes con datos no disponibles aún (escala-salarial / nuevas-plazas / etc.)
    return ["Mensaje"], [[f"Datos pendientes — el reporte '{REPORTES.get(tipo, tipo)}' "
                          "se calcula con datos que aún no están cargados."]]


@login_required
def index(request):
    tipo = request.GET.get("tipo", "actividad-academica")
    if tipo not in REPORTES:
        tipo = "actividad-academica"
    headers, rows = _build_rows(tipo)
    return render(request, "academic_reports/index.html", {
        "tipo": tipo, "tipo_label": REPORTES[tipo],
        "reportes": REPORTES, "headers": headers, "rows": rows,
        "total": len(rows),
    })


@login_required
def export_excel(request):
    tipo = request.GET.get("tipo", "actividad-academica")
    headers, rows = _build_rows(tipo)
    wb = Workbook()
    ws = wb.active
    ws.title = REPORTES.get(tipo, tipo)[:31]
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    resp = HttpResponse(buf.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    resp["Content-Disposition"] = f'attachment; filename="reporte_{tipo}.xlsx"'
    return resp
