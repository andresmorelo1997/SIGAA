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
    "cobertura-plan": "Cobertura del Plan (horas)",
    "nuevas-plazas": "Nuevas Plazas",
    "reemplazos": "Reemplazos",
    "no-continuan": "No Continúan",
}


def _build_rows(tipo: str) -> tuple[list[str], list[list]]:
    """Devuelve (headers, rows) para cada tipo de reporte."""
    if tipo == "actividad-academica":
        # Cruza cada docente con sus clases y muestra programas que dicta
        headers = ["Cédula", "Docente", "N° Clases", "Hrs/sem", "Hrs/sem.re",
                   "Programas que dicta", "Ciclos"]
        rows = []
        qs = CargaAcademica.objects.exclude(docente__isnull=True).select_related("docente")
        por_docente = {}
        for c in qs:
            k = c.docente_id
            d = por_docente.setdefault(k, {
                "docente": c.docente, "hs": 0, "hsr": 0, "n": 0,
                "programas": set(), "ciclos": set(),
            })
            d["hs"] += float(c.hrs_semanal or 0)
            d["hsr"] += float(c.hrs_semestre or 0)
            d["n"] += 1
            if c.catalogo and len(c.catalogo) >= 5:
                d["programas"].add(c.catalogo[-5:] if c.catalogo[-1].isalpha() else c.catalogo[:5])
            if c.ciclo_lectivo: d["ciclos"].add(c.ciclo_lectivo)
        for d in sorted(por_docente.values(), key=lambda x: (x["docente"].employee_first_name or "").lower()):
            rows.append([
                d["docente"].badge_id or "",
                f"{d['docente'].employee_first_name} {d['docente'].employee_last_name}",
                d["n"], round(d["hs"], 1), round(d["hsr"], 1),
                ", ".join(sorted(d["programas"])[:10]),
                ", ".join(sorted(d["ciclos"])),
            ])
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
        headers = ["Catálogo", "Asignatura", "Docente", "Cédula",
                   "Campus", "Ciclo", "Hrs/sem", "Hrs/sem.re"]
        rows = []
        for c in CargaAcademica.objects.all().select_related("docente"):
            rows.append([
                c.catalogo or "", c.descripcion or "",
                f"{c.docente.employee_first_name} {c.docente.employee_last_name}" if c.docente else (c.nombre_instructor or "—"),
                (c.docente.badge_id if c.docente else c.instructor_id_raw) or "",
                c.campus or "", c.ciclo_lectivo or "",
                c.hrs_semanal or 0, c.hrs_semestre or 0,
            ])
        return headers, rows

    if tipo == "cobertura-plan":
        # Cruza plan vs carga — % horas planeadas vs horas programadas
        from academic_plan.models import PlanEstudio
        headers = ["Programa", "Asignaturas plan", "Programadas", "Sin programar",
                   "Hrs plan", "Hrs carga", "% cobertura"]
        rows = []
        programas = PlanEstudio.objects.values_list("programa_codigo", flat=True).distinct()
        for pcode in sorted(programas):
            plan = PlanEstudio.objects.filter(programa_codigo=pcode)
            plan_cats = set(plan.values_list("catalogo", flat=True))
            carga = CargaAcademica.objects.filter(catalogo__in=plan_cats)
            programadas = carga.values_list("catalogo", flat=True).distinct().count()
            hrs_plan = plan.aggregate(s=Sum("hrs_semestre"))["s"] or 0
            hrs_carga = carga.aggregate(s=Sum("hrs_semestre"))["s"] or 0
            cobertura = round(100 * hrs_carga / hrs_plan, 1) if hrs_plan else 0
            rows.append([pcode, plan.count(), programadas,
                         plan.count() - programadas,
                         round(hrs_plan, 1), round(hrs_carga, 1),
                         f"{cobertura}%"])
        return headers, rows

    if tipo == "nivel-formacion":
        # Agrupa por job_position (aprox. nivel de formación/posición)
        headers = ["Dedicación / Cargo", "Cantidad de docentes"]
        agg = Employee.objects.values(
            "employee_work_info__job_position_id__job_position"
        ).annotate(n=Count("id")).order_by("-n")
        return headers, [[
            r["employee_work_info__job_position_id__job_position"] or "Sin registrar",
            r["n"],
        ] for r in agg]

    if tipo == "nuevas-plazas":
        # Docentes con clases en el último ciclo pero no en ciclos anteriores
        ciclos = sorted(set(
            CargaAcademica.objects.exclude(ciclo_lectivo__isnull=True)
            .exclude(ciclo_lectivo="").values_list("ciclo_lectivo", flat=True)
        ), reverse=True)
        headers = ["Cédula", "Docente", "Ciclo actual", "Clases nuevas", "Hrs/sem"]
        rows = []
        if len(ciclos) >= 1:
            ultimo = ciclos[0]
            anteriores = set()
            if len(ciclos) > 1:
                anteriores = set(CargaAcademica.objects.filter(
                    ciclo_lectivo__in=ciclos[1:]
                ).exclude(docente__isnull=True).values_list("docente_id", flat=True))
            nuevas = CargaAcademica.objects.filter(
                ciclo_lectivo=ultimo
            ).exclude(docente__isnull=True).exclude(docente_id__in=anteriores)
            # Agrupar por docente
            por = {}
            for c in nuevas.select_related("docente"):
                d = por.setdefault(c.docente_id, {
                    "docente": c.docente, "n": 0, "hs": 0, "ciclo": ultimo,
                })
                d["n"] += 1
                d["hs"] += float(c.hrs_semanal or 0)
            for d in sorted(por.values(), key=lambda x: x["docente"].employee_first_name or ""):
                rows.append([
                    d["docente"].badge_id or "",
                    f"{d['docente'].employee_first_name} {d['docente'].employee_last_name}",
                    d["ciclo"], d["n"], round(d["hs"], 1),
                ])
        return headers, rows

    if tipo == "reemplazos":
        # Asignaturas donde cambió el docente entre ciclos
        headers = ["Catálogo", "Asignatura", "Docente anterior", "Docente actual", "Ciclo"]
        rows = []
        ciclos = sorted(set(
            CargaAcademica.objects.exclude(ciclo_lectivo__isnull=True)
            .exclude(ciclo_lectivo="").values_list("ciclo_lectivo", flat=True)
        ), reverse=True)
        if len(ciclos) < 2:
            return ["Mensaje"], [["Se necesitan al menos 2 ciclos lectivos para detectar reemplazos."]]
        actual, anterior = ciclos[0], ciclos[1]
        # Mapa catalogo → docente en anterior
        ant = {}
        for c in CargaAcademica.objects.filter(ciclo_lectivo=anterior).exclude(docente__isnull=True):
            if c.catalogo:
                ant[c.catalogo] = c.docente
        for c in CargaAcademica.objects.filter(ciclo_lectivo=actual).exclude(docente__isnull=True):
            if not c.catalogo or c.catalogo not in ant:
                continue
            prev = ant[c.catalogo]
            if prev.id != c.docente_id:
                rows.append([
                    c.catalogo, c.descripcion,
                    f"{prev.employee_first_name} {prev.employee_last_name}",
                    f"{c.docente.employee_first_name} {c.docente.employee_last_name}",
                    actual,
                ])
        return headers, rows

    if tipo == "no-continuan":
        # Docentes con clases en ciclo anterior, sin clases en el actual
        headers = ["Cédula", "Docente", "Último ciclo con carga", "Hrs/sem último"]
        rows = []
        ciclos = sorted(set(
            CargaAcademica.objects.exclude(ciclo_lectivo__isnull=True)
            .exclude(ciclo_lectivo="").values_list("ciclo_lectivo", flat=True)
        ), reverse=True)
        if len(ciclos) < 2:
            return ["Mensaje"], [["Se necesitan al menos 2 ciclos lectivos para detectar docentes que no continúan."]]
        actual = ciclos[0]
        docentes_actual = set(
            CargaAcademica.objects.filter(ciclo_lectivo=actual).exclude(docente__isnull=True)
            .values_list("docente_id", flat=True)
        )
        docentes_ant = CargaAcademica.objects.filter(ciclo_lectivo__in=ciclos[1:]) \
            .exclude(docente__isnull=True) \
            .exclude(docente_id__in=docentes_actual)
        por = {}
        for c in docentes_ant.select_related("docente"):
            d = por.setdefault(c.docente_id, {
                "docente": c.docente, "ciclo": c.ciclo_lectivo, "hs": 0,
            })
            if c.ciclo_lectivo > d["ciclo"]:
                d["ciclo"] = c.ciclo_lectivo
                d["hs"] = 0
            if c.ciclo_lectivo == d["ciclo"]:
                d["hs"] += float(c.hrs_semanal or 0)
        for d in sorted(por.values(), key=lambda x: x["docente"].employee_first_name or ""):
            rows.append([
                d["docente"].badge_id or "",
                f"{d['docente'].employee_first_name} {d['docente'].employee_last_name}",
                d["ciclo"], round(d["hs"], 1),
            ])
        return headers, rows

    # Fallback (no debería llegar aquí)
    return ["Mensaje"], [[f"Reporte '{REPORTES.get(tipo, tipo)}' no implementado aún."]]


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
