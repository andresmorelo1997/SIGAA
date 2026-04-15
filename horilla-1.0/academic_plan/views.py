"""
academic_plan.views — Listado, importador y validación cruzada.
"""
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Count, Q, F, OuterRef, Subquery
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse

from academic_load.models import CargaAcademica
from base.models import Department
from .import_helpers import parse_plan
from .models import PlanEstudio


@login_required
def plan_faltantes(request):
    """Asignaturas del plan sin clase programada — panel clave para planeación."""
    programa = request.GET.get("programa", "")
    ciclo = request.GET.get("ciclo", "")

    # Catálogos con carga programada (opcionalmente filtrado por ciclo)
    carga_cats_qs = CargaAcademica.objects.exclude(catalogo__isnull=True).exclude(catalogo="")
    if ciclo:
        carga_cats_qs = carga_cats_qs.filter(ciclo_lectivo=ciclo)
    carga_cats = set(carga_cats_qs.values_list("catalogo", flat=True).distinct())

    plan = PlanEstudio.objects.all()
    if programa:
        plan = plan.filter(programa_codigo=programa)

    sin_programar_qs = plan.exclude(catalogo__in=carga_cats).order_by(
        "programa_codigo", "semestre", "catalogo"
    )

    from django.core.paginator import Paginator
    paginator = Paginator(sin_programar_qs, 100)
    sin_programar = paginator.get_page(request.GET.get("page") or 1)

    # Resumen por programa
    from collections import defaultdict
    resumen = defaultdict(lambda: {"total": 0, "faltantes": 0, "hrs_faltantes": 0})
    for p in plan:
        r = resumen[p.programa_codigo]
        r["total"] += 1
        if p.catalogo not in carga_cats:
            r["faltantes"] += 1
            r["hrs_faltantes"] += p.hrs_semestre or 0
    resumen_list = [
        {"programa": k, **v,
         "cobertura": round(100 * (v["total"] - v["faltantes"]) / v["total"], 1) if v["total"] else 0}
        for k, v in sorted(resumen.items())
    ]

    ciclos = sorted(set(
        CargaAcademica.objects.exclude(ciclo_lectivo__isnull=True).exclude(ciclo_lectivo="")
        .values_list("ciclo_lectivo", flat=True)
    ), reverse=True)
    programas = list(PlanEstudio.objects.values_list("programa_codigo", flat=True).distinct())

    return render(request, "academic_plan/faltantes.html", {
        "sin_programar": sin_programar,
        "resumen": resumen_list,
        "ciclos": ciclos,
        "programas": programas,
        "programa": programa,
        "ciclo": ciclo,
        "total_faltantes": sin_programar_qs.count(),
    })


@login_required
def plan_list(request):
    programa = request.GET.get("programa", "")
    qs = PlanEstudio.objects.all()
    if programa:
        qs = qs.filter(programa_codigo=programa)

    programas = (
        PlanEstudio.objects.values("programa_codigo")
        .annotate(n=Count("id"), creditos=Sum("creditos"))
        .order_by("programa_codigo")
    )
    return render(request, "academic_plan/plan_list.html", {
        "qs": qs[:500], "total": qs.count(),
        "programas": programas, "programa_filtro": programa,
    })


@login_required
def plan_import(request):
    if request.method == "POST" and request.FILES.getlist("archivos"):
        files = request.FILES.getlist("archivos")
        total_inserted = 0
        total_failed = 0
        errors = []
        for f in files:
            try:
                data = f.read()
                rows = parse_plan(data, f.name)
                if not rows:
                    errors.append(f"{f.name}: sin filas válidas")
                    total_failed += 1
                    continue

                prog_code = rows[0].get("programa_codigo", "PROG")[:20]
                dept, _ = Department.objects.get_or_create(department=prog_code)

                created = 0
                for r in rows:
                    r.setdefault("programa_codigo", prog_code)
                    pe, was_created = PlanEstudio.objects.update_or_create(
                        programa_codigo=r["programa_codigo"][:20],
                        catalogo=r["catalogo"],
                        defaults={
                            "programa": dept,
                            "semestre": r.get("semestre", "")[:10],
                            "asignatura": r.get("asignatura", "")[:255],
                            "creditos": r.get("creditos", 0),
                            "hrs_semanal": r.get("hrs_semanal", 0),
                            "hrs_semestre": r.get("hrs_semestre", 0),
                            "atrib_curso": r.get("atrib_curso"),
                            "cohorte": r.get("cohorte"),
                            "grado": r.get("grado"),
                            "modalidad": r.get("modalidad"),
                            "campus": r.get("campus"),
                        },
                    )
                    if was_created: created += 1
                total_inserted += created
            except Exception as e:
                errors.append(f"{f.name}: {e}")
                total_failed += 1

        if total_inserted:
            messages.success(
                request,
                f"Importación completa: {total_inserted} asignaturas insertadas en {len(files) - total_failed} planes.",
            )
        if errors:
            messages.warning(request, " · ".join(errors[:5]))
        return HttpResponseRedirect(reverse("plan-list"))

    return render(request, "academic_plan/plan_import.html")


@login_required
def plan_validar(request):
    programa = request.GET.get("programa", "")
    if not programa:
        programas = list(PlanEstudio.objects.values_list("programa_codigo", flat=True).distinct())
        return render(request, "academic_plan/validar.html", {"programas": programas, "programa": ""})

    plan = PlanEstudio.objects.filter(programa_codigo=programa)
    plan_catalogos = set(plan.values_list("catalogo", flat=True))
    prefixes = {c[:4] for c in plan_catalogos if len(c) >= 4}

    carga_qs = CargaAcademica.objects.none()
    if prefixes:
        q = Q()
        for p in prefixes:
            q |= Q(catalogo__startswith=p)
        carga_qs = CargaAcademica.objects.filter(q).select_related("docente")

    sin_carga = []
    for p in plan:
        m = carga_qs.filter(catalogo=p.catalogo).first()
        sin_carga.append({
            "catalogo": p.catalogo, "asignatura": p.asignatura,
            "semestre": p.semestre, "creditos": p.creditos,
            "hrs_plan": p.hrs_semestre,
            "hrs_carga": m.hrs_semestre if m else None,
            "estado": "sin_carga" if not m else (
                "diferencia_horas" if abs((m.hrs_semestre or 0) - (p.hrs_semestre or 0)) > 0.5 else "ok"
            ),
            "docente": (f"{m.docente.employee_first_name} {m.docente.employee_last_name}"
                        if m and m.docente else None),
            "docente_id": (m.docente.id if m and m.docente else None),
        })

    huerfanas = [
        {"catalogo": c.catalogo, "descripcion": c.descripcion,
         "docente": (f"{c.docente.employee_first_name} {c.docente.employee_last_name}"
                     if c.docente else "—"),
         "docente_id": (c.docente.id if c.docente else None),
         "hrs_semestre": c.hrs_semestre or 0, "ciclo": c.ciclo_lectivo or ""}
        for c in carga_qs if c.catalogo not in plan_catalogos
    ][:200]

    resumen = {
        "total": len(sin_carga),
        "ok": sum(1 for d in sin_carga if d["estado"] == "ok"),
        "sin_carga": sum(1 for d in sin_carga if d["estado"] == "sin_carga"),
        "diferencia": sum(1 for d in sin_carga if d["estado"] == "diferencia_horas"),
        "huerfanas": len(huerfanas),
    }
    programas = list(PlanEstudio.objects.values_list("programa_codigo", flat=True).distinct())

    return render(request, "academic_plan/validar.html", {
        "programa": programa, "programas": programas,
        "sin_carga": sin_carga, "huerfanas": huerfanas, "resumen": resumen,
    })
