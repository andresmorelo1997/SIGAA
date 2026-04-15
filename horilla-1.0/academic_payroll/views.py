"""
academic_payroll.views
======================
Vistas del módulo Prenómina Docente.
"""
import io
from datetime import datetime, date

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Count
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import render, get_object_or_404
from django.urls import reverse

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill

from django.db.models import Q

from academic_load.models import CargaAcademica, GRADO_CHOICES, CAMPUS_CHOICES
from employee.models import Employee
from .forms import CorteForm
from .models import Corte, PrenominaDocente


# ──────────────────────── helpers ────────────────────────
def _grados_for_tipo(tipo: str) -> list[str]:
    if tipo.upper() == "PREGRADO":
        return ["PREG", "PRE2", "TCN"]
    return ["POSG", "MSTR", "DOCT", "ESP"]


def _calcular_consolidado(periodo: str, tipo: str, ciclo: str = ""):
    """
    Calcula consolidado on-demand desde CargaAcademica.
    Devuelve (rows[], cortes_info[]).
    """
    grados = _grados_for_tipo(tipo)

    cortes = list(Corte.objects.filter(periodo=periodo, grado__in=grados)
                  .order_by("num_corte").values("num_corte", "fecha_inicio",
                                                "fecha_fin", "grado", "emitido"))

    # Agrupa por num_corte (algunos grados comparten corte)
    cortes_info = {}
    for c in cortes:
        n = c["num_corte"]
        if n not in cortes_info:
            cortes_info[n] = {
                "num": n,
                "fecha_inicio": c["fecha_inicio"],
                "fecha_fin": c["fecha_fin"],
                "emitido": c["emitido"],
            }

    cortes_list = sorted(cortes_info.values(), key=lambda x: x["num"])
    num_cortes = len(cortes_list)

    qs = CargaAcademica.objects.filter(grado__in=grados).select_related("docente")
    if ciclo:
        qs = qs.filter(ciclo_lectivo=ciclo)

    # Agrupa por docente
    consol = {}
    for c in qs:
        if not c.docente_id:
            continue
        key = c.docente_id
        if key not in consol:
            consol[key] = {
                "docente": c.docente,
                "campus": c.campus or "",
                "programa": c.programa.department if c.programa else "",
                "hrs_semana": 0,
                "hrs_semestre": 0,
                "cortes": [0] * 6,
                "clases": [],
            }
        d = consol[key]
        d["hrs_semana"] += float(c.hrs_semanal or 0)
        d["hrs_semestre"] += float(c.hrs_semestre or 0)
        # Reparto sencillo de horas por corte (proporcional al número de cortes)
        if num_cortes > 0:
            por_corte = (c.hrs_semestre or 0) / num_cortes
            for i in range(num_cortes):
                d["cortes"][i] += por_corte

        d["clases"].append({
            "num_clase": c.num_clase, "catalogo": c.catalogo,
            "asignatura": c.descripcion, "componente": c.componente,
            "hrs_semana": c.hrs_semanal or 0, "hrs_semestre": c.hrs_semestre or 0,
        })

    rows = []
    for d in consol.values():
        hrs_prenom = round(sum(d["cortes"][:num_cortes]), 2)
        rows.append({
            "docente_id": d["docente"].id,
            "instructor_id": d["docente"].badge_id,
            "nombre": f"{d['docente'].employee_first_name} {d['docente'].employee_last_name}",
            "campus": d["campus"], "programa": d["programa"],
            "hrs_semana": round(d["hrs_semana"], 2),
            "hrs_semestre": round(d["hrs_semestre"], 2),
            "cortes": [round(x, 2) for x in d["cortes"][:num_cortes]],
            "hrs_prenomina": hrs_prenom,
            "saldo": round(d["hrs_semestre"] - hrs_prenom, 2),
        })
    rows.sort(key=lambda x: x["nombre"])

    return rows, cortes_list


# ──────────────────────── views ────────────────────────
@login_required
def consolidado(request):
    periodo = request.GET.get("periodo", "2026-1")
    tipo = request.GET.get("tipo", "PREGRADO")
    ciclo = request.GET.get("ciclo", "")

    # opciones disponibles
    periodos = sorted(set(Corte.objects.values_list("periodo", flat=True))) or ["2026-1"]
    ciclos = sorted(set(
        CargaAcademica.objects.exclude(ciclo_lectivo__isnull=True)
        .exclude(ciclo_lectivo="").values_list("ciclo_lectivo", flat=True)
    ))

    rows, cortes_info = _calcular_consolidado(periodo, tipo, ciclo)
    return render(request, "academic_payroll/consolidado.html", {
        "rows": rows, "cortes_info": cortes_info,
        "periodo": periodo, "tipo": tipo, "ciclo": ciclo,
        "periodos": periodos, "ciclos": ciclos,
        "total": len(rows),
    })


@login_required
def cortes_view(request):
    cortes = Corte.objects.all().order_by("periodo", "grado", "num_corte")
    return render(request, "academic_payroll/cortes.html", {"cortes": cortes})


@login_required
def corte_new(request):
    form = CorteForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Corte creado correctamente.")
        return HttpResponseRedirect(reverse("payroll-cortes"))
    return render(request, "academic_payroll/corte_form.html", {"form": form, "is_new": True})


@login_required
def corte_edit(request, pk: int):
    corte = get_object_or_404(Corte, pk=pk)
    form = CorteForm(request.POST or None, instance=corte)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Corte actualizado correctamente.")
        return HttpResponseRedirect(reverse("payroll-cortes"))
    return render(request, "academic_payroll/corte_form.html", {"form": form, "corte": corte})


@login_required
def historicos(request):
    """Muestra snapshots PrenominaDocente emitidos (auditoría)."""
    periodo = request.GET.get("periodo", "")
    tipo = request.GET.get("tipo", "")
    qs = PrenominaDocente.objects.select_related("docente").filter(estado="emitido")
    if periodo:
        qs = qs.filter(periodo=periodo)
    if tipo:
        qs = qs.filter(tipo=tipo)

    periodos = sorted(set(PrenominaDocente.objects.values_list("periodo", flat=True).distinct()))
    tipos = ["PREGRADO", "POSGRADO"]

    return render(request, "academic_payroll/historicos.html", {
        "snapshots": qs[:500],
        "total": qs.count(),
        "periodos": periodos,
        "tipos": tipos,
        "periodo": periodo,
        "tipo": tipo,
    })


@login_required
def corte_emitir(request, pk: int):
    """Emite/congela un corte: crea snapshots PrenominaDocente con las horas
    consolidadas en ese momento. Al re-importar carga académica, estos
    snapshots no cambian."""
    corte = get_object_or_404(Corte, pk=pk)

    if corte.emitido:
        messages.warning(request, f"El corte {corte.num_corte} de {corte.periodo} ya fue emitido.")
        return HttpResponseRedirect(reverse("payroll-cortes"))

    from django.utils import timezone as _tz
    tipo = "POSGRADO" if corte.grado.upper() in ("POSG", "MSTR", "DOCT", "ESP") else "PREGRADO"
    rows, _cortes = _calcular_consolidado(corte.periodo, tipo)

    creados = 0
    for r in rows:
        docente_id = r.get("docente_id")
        if not docente_id:
            continue
        hrs_prenomina = r["hrs_prenomina"]
        try:
            pd, created = PrenominaDocente.objects.update_or_create(
                periodo=corte.periodo,
                tipo=tipo,
                docente_id=docente_id,
                defaults={
                    "hrs_semana": r["hrs_semana"],
                    "hrs_semestre": r["hrs_semestre"],
                    "corte_1": r["cortes"][0] if len(r["cortes"]) > 0 else 0,
                    "corte_2": r["cortes"][1] if len(r["cortes"]) > 1 else 0,
                    "corte_3": r["cortes"][2] if len(r["cortes"]) > 2 else 0,
                    "corte_4": r["cortes"][3] if len(r["cortes"]) > 3 else 0,
                    "corte_5": r["cortes"][4] if len(r["cortes"]) > 4 else 0,
                    "corte_6": r["cortes"][5] if len(r["cortes"]) > 5 else 0,
                    "hrs_prenomina": hrs_prenomina,
                    "saldo": r["saldo"],
                    "estado": "emitido",
                    "num_corte_emitido": corte.num_corte,
                },
            )
            if created:
                creados += 1
        except Exception as e:
            messages.error(request, f"Error en {r['nombre']}: {e}")

    corte.emitido = True
    corte.fecha_emision = _tz.now()
    corte.save(update_fields=["emitido", "fecha_emision"])

    messages.success(
        request,
        f"Corte {corte.num_corte} · {corte.periodo} · {corte.grado} emitido. "
        f"{len(rows)} docentes consolidados ({creados} nuevos snapshots).",
    )
    return HttpResponseRedirect(reverse("payroll-cortes"))


@login_required
def consolidado_export(request):
    """Exporta el consolidado de prenómina (en HORAS) a Excel."""
    periodo = request.GET.get("periodo", "2026-1")
    tipo = request.GET.get("tipo", "PREGRADO")
    ciclo = request.GET.get("ciclo", "")

    rows, cortes_info = _calcular_consolidado(periodo, tipo, ciclo)

    wb = Workbook()
    ws = wb.active
    ws.title = f"Prenomina {periodo}"[:31]

    # Encabezado
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="A6192E")  # rojo UniSinú

    headers = ["N°", "Cédula", "Docente", "Campus", "Programa",
               "Hrs/sem", "Hrs/sem.re"]
    for c in cortes_info:
        headers.append(f"Corte {c['num']}")
    headers += ["Hrs prenómina", "Saldo horas"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = header_font
        cell.fill = header_fill

    # Filas
    for i, r in enumerate(rows, start=1):
        row = [i, r["instructor_id"], r["nombre"], r["campus"], r["programa"],
               r["hrs_semana"], r["hrs_semestre"]]
        row += r["cortes"]
        row += [r["hrs_prenomina"], r["saldo"]]
        ws.append(row)

    # Auto-ancho básico
    for col in ws.columns:
        letter = col[0].column_letter
        ws.column_dimensions[letter].width = 18

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    filename = f"prenomina_{tipo.lower()}_{periodo}"
    if ciclo:
        filename += f"_{ciclo}"
    filename += ".xlsx"
    resp = HttpResponse(
        buf.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{filename}"'
    return resp


# ──────────────────────── EMPLOYEE TAB ────────────────────────
@login_required
def mi_prenomina(request):
    """Shortcut: redirige al employee detail del usuario logueado con tab prenómina.
    Útil para compartir link directo al docente con sus horas."""
    try:
        emp = request.user.employee_get
        if emp:
            return HttpResponseRedirect(
                f"{reverse('employee-view-individual', args=[emp.id])}#academic_payroll_target"
            )
    except Exception:
        pass
    messages.warning(request, "No tiene perfil de docente asociado.")
    return HttpResponseRedirect(reverse("academic-dashboard"))


@login_required
def mi_constancia(request):
    """Shortcut: constancia del docente logueado."""
    try:
        emp = request.user.employee_get
        if emp:
            return HttpResponseRedirect(reverse("payroll-constancia", args=[emp.id]))
    except Exception:
        pass
    messages.warning(request, "No tiene perfil de docente asociado.")
    return HttpResponseRedirect(reverse("academic-dashboard"))


@login_required
def constancia_horas(request, emp_id: int):
    """Constancia imprimible de horas académicas del docente (vista limpia)."""
    emp = get_object_or_404(Employee, pk=emp_id)
    cedula_raw = (emp.badge_id or "").strip()
    cedula_padded = cedula_raw.zfill(10) if cedula_raw.isdigit() else cedula_raw

    clases = CargaAcademica.objects.filter(
        Q(docente_id=emp.id)
        | Q(instructor_id_raw=cedula_raw)
        | Q(instructor_id_raw=cedula_padded)
    ).order_by("-ciclo_lectivo", "catalogo")

    ciclos_qs = (
        clases.exclude(ciclo_lectivo__isnull=True).exclude(ciclo_lectivo="")
        .values("ciclo_lectivo")
        .annotate(n=Count("id"), hs=Sum("hrs_semanal"), hsr=Sum("hrs_semestre"))
        .order_by("-ciclo_lectivo")
    )

    totales = clases.aggregate(n=Count("id"), hs=Sum("hrs_semanal"), hsr=Sum("hrs_semestre"))

    from django.utils import timezone as _tz
    return render(request, "academic_payroll/constancia_horas.html", {
        "employee": emp,
        "ciclos_qs": ciclos_qs,
        "totales": totales,
        "fecha": _tz.now(),
    })


@login_required
def academic_payroll_employee_tab(request, emp_id: int):
    """Renderiza la pestaña 'Prenómina Docente' dentro del detalle del docente.

    Calcula on-demand desde CargaAcademica: hrs/semana, hrs/semestre, cortes
    proporcionales y saldo, TODO en horas (SIGAA no maneja valores monetarios).
    """
    emp = get_object_or_404(Employee, pk=emp_id)

    cedula_raw = (emp.badge_id or "").strip()
    cedula_padded = cedula_raw.zfill(10) if cedula_raw.isdigit() else cedula_raw

    clases = CargaAcademica.objects.filter(
        Q(docente_id=emp.id)
        | Q(instructor_id_raw=cedula_raw)
        | Q(instructor_id_raw=cedula_padded)
    )

    # Filtro opcional por ciclo
    ciclo = request.GET.get("ciclo", "")
    if ciclo:
        clases = clases.filter(ciclo_lectivo=ciclo)

    ciclos_disponibles = sorted(set(
        clases.exclude(ciclo_lectivo__isnull=True).exclude(ciclo_lectivo="")
             .values_list("ciclo_lectivo", flat=True)
    ))

    # Consolidado por ciclo en horas
    filas = []
    for c_ciclo in (ciclos_disponibles if not ciclo else [ciclo]):
        qs = clases.filter(ciclo_lectivo=c_ciclo) if not ciclo else clases
        agg = qs.aggregate(
            hs=Sum("hrs_semanal"),
            hsr=Sum("hrs_semestre"),
            n=Count("id"),
        )
        if not agg["n"]:
            continue
        # Grado dominante para definir cortes
        grado = (qs.values_list("grado", flat=True).first() or "").upper()
        grados_filtro = _grados_for_tipo("POSGRADO" if grado in ("POSG", "MSTR", "DOCT", "ESP") else "PREGRADO")

        cortes = list(
            Corte.objects.filter(
                grado__in=grados_filtro,
            ).order_by("num_corte").values_list("num_corte", flat=True).distinct()
        )
        n_cortes = len(cortes) or 4  # fallback: 4 cortes
        por_corte = round((agg["hsr"] or 0) / n_cortes, 2) if n_cortes else 0
        hrs_cortes = [por_corte] * n_cortes
        hrs_prenomina = round(sum(hrs_cortes), 2)
        saldo = round((agg["hsr"] or 0) - hrs_prenomina, 2)

        filas.append({
            "ciclo": c_ciclo,
            "n_clases": agg["n"],
            "hrs_semana": round(agg["hs"] or 0, 2),
            "hrs_semestre": round(agg["hsr"] or 0, 2),
            "cortes": hrs_cortes,
            "n_cortes": n_cortes,
            "hrs_prenomina": hrs_prenomina,
            "saldo": saldo,
        })

    # Totales global
    totales = clases.aggregate(hs=Sum("hrs_semanal"), hsr=Sum("hrs_semestre"), n=Count("id"))

    return render(request, "academic_payroll/tab_prenomina_docente.html", {
        "employee": emp,
        "filas": filas,
        "totales": totales,
        "ciclos_disponibles": ciclos_disponibles,
        "ciclo_filtro": ciclo,
    })
