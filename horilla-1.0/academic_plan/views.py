"""
academic_plan.views
===================
Vistas del plan de estudios + validación cruzada con CargaAcademica.
"""
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Count
from django.shortcuts import render

from academic_load.models import CargaAcademica
from .models import PlanEstudio


@login_required
def plan_list(request):
    """Lista todos los programas con asignaturas en el plan."""
    programa = request.GET.get("programa", "")
    qs = PlanEstudio.objects.all().select_related("programa")
    if programa:
        qs = qs.filter(programa_codigo=programa)

    programas = (
        PlanEstudio.objects.values("programa_codigo")
        .annotate(n=Count("id"), creditos=Sum("creditos"))
        .order_by("programa_codigo")
    )

    return render(request, "academic_plan/plan_list.html", {
        "qs": qs[:500],
        "total": qs.count(),
        "programas": programas,
        "programa_filtro": programa,
    })


@login_required
def plan_validar(request):
    """
    Cruza el plan de estudios contra CargaAcademica:
      - asignaturas del plan SIN programación
      - asignaturas programadas que NO están en el plan (huérfanas)
    """
    programa = request.GET.get("programa", "")
    if not programa:
        # Lista de programas disponibles
        programas = list(
            PlanEstudio.objects.values_list("programa_codigo", flat=True).distinct()
        )
        return render(request, "academic_plan/validar.html", {
            "programas": programas, "programa": "",
        })

    plan = PlanEstudio.objects.filter(programa_codigo=programa)
    plan_catalogos = set(plan.values_list("catalogo", flat=True))

    # Carga académica con catálogo similar (mismo prefijo de 4 chars)
    prefixes = {c[:4] for c in plan_catalogos if len(c) >= 4}
    carga_qs = CargaAcademica.objects.none()
    if prefixes:
        from django.db.models import Q
        q = Q()
        for p in prefixes:
            q |= Q(catalogo__startswith=p)
        carga_qs = CargaAcademica.objects.filter(q).select_related("docente")

    carga_catalogos = set(carga_qs.values_list("catalogo", flat=True))

    # Sin programación
    sin_carga = []
    for p in plan:
        match = carga_qs.filter(catalogo=p.catalogo).first()
        sin_carga.append({
            "catalogo": p.catalogo,
            "asignatura": p.asignatura,
            "semestre": p.semestre,
            "creditos": p.creditos,
            "hrs_plan": p.hrs_semestre,
            "estado": "sin_carga" if not match else (
                "diferencia_horas"
                if abs((match.hrs_semestre or 0) - (p.hrs_semestre or 0)) > 0.5
                else "ok"
            ),
            "hrs_carga": match.hrs_semestre if match else None,
            "docente": (
                f"{match.docente.employee_first_name} {match.docente.employee_last_name}"
                if match and match.docente else None
            ),
        })

    # Huérfanas — programadas con prefijo similar pero sin entry en plan
    huerfanas = [
        {
            "catalogo": c.catalogo, "descripcion": c.descripcion,
            "docente": (f"{c.docente.employee_first_name} {c.docente.employee_last_name}"
                        if c.docente else "—"),
            "hrs_semestre": c.hrs_semestre or 0,
            "ciclo": c.ciclo_lectivo or "",
        }
        for c in carga_qs if c.catalogo not in plan_catalogos
    ][:200]

    resumen = {
        "total": len(sin_carga),
        "ok": sum(1 for d in sin_carga if d["estado"] == "ok"),
        "sin_carga": sum(1 for d in sin_carga if d["estado"] == "sin_carga"),
        "diferencia": sum(1 for d in sin_carga if d["estado"] == "diferencia_horas"),
        "huerfanas": len(huerfanas),
    }

    programas = list(
        PlanEstudio.objects.values_list("programa_codigo", flat=True).distinct()
    )

    return render(request, "academic_plan/validar.html", {
        "programa": programa, "programas": programas,
        "sin_carga": sin_carga, "huerfanas": huerfanas,
        "resumen": resumen,
    })
