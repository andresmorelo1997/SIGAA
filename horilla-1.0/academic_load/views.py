"""
academic_load.views
===================
Vistas del módulo Carga Académica:
  - list view con filtros multi-select estilo Excel
  - import wizard (upload → preview → confirm)
  - history view (bitácora con descarga)
  - download del archivo original
"""
from __future__ import annotations

import os
import tempfile
import uuid

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404, render
from django.urls import reverse
from django.views.decorators.http import require_http_methods

from base.models import Department
from employee.models import Employee

from .forms import FilterForm, ImportConfirmForm, ImportUploadForm
from .import_helpers import detect_file_type, parse_rows, preview
from .models import (
    CAMPUS_CHOICES,
    GRADO_CHOICES,
    CargaAcademica,
    ImportHistory,
)


# ---------------------------------------------------------------- LIST
@login_required
def carga_list(request):
    qs = CargaAcademica.objects.select_related("docente", "programa").all()

    form = FilterForm(request.GET or None)
    if form.is_valid():
        d = form.cleaned_data
        if d.get("search"):
            term = d["search"]
            qs = qs.filter(
                Q(descripcion__icontains=term)
                | Q(catalogo__icontains=term)
                | Q(nombre_instructor__icontains=term)
                | Q(instructor_id_raw__icontains=term)
            )
        if d.get("campus"):
            qs = qs.filter(campus__in=d["campus"])
        if d.get("grado"):
            qs = qs.filter(grado__in=d["grado"])
        if d.get("estado"):
            qs = qs.filter(estado_clase__in=d["estado"])
        if d.get("ciclo_lectivo"):
            qs = qs.filter(ciclo_lectivo=d["ciclo_lectivo"])

    paginator = Paginator(qs, 50)
    page = paginator.get_page(request.GET.get("page") or 1)
    return render(
        request,
        "academic_load/carga_list.html",
        {
            "page": page,
            "filter_form": form,
            "total": paginator.count,
            "campus_choices": CAMPUS_CHOICES,
            "grado_choices": GRADO_CHOICES,
        },
    )


# ---------------------------------------------------------------- IMPORT
PENDING_DIR = os.path.join(tempfile.gettempdir(), "academic_load_pending")
os.makedirs(PENDING_DIR, exist_ok=True)


@login_required
@require_http_methods(["GET", "POST"])
def import_upload(request):
    if request.method == "POST":
        form = ImportUploadForm(request.POST, request.FILES)
        if form.is_valid():
            f = form.cleaned_data["archivo"]
            data = f.read()
            token = uuid.uuid4().hex
            path = os.path.join(PENDING_DIR, f"{token}.xlsx")
            with open(path, "wb") as out:
                out.write(data)
            request.session["pending_import"] = {
                "filename": f.name,
                "token": token,
            }
            return HttpResponseRedirect(reverse("academic-load-import-preview"))
    else:
        form = ImportUploadForm()
    return render(request, "academic_load/import_upload.html", {"form": form})


@login_required
def import_preview(request):
    pending = request.session.get("pending_import")
    if not pending:
        messages.warning(request, "Primero suba un archivo Excel.")
        return HttpResponseRedirect(reverse("academic-load-import"))

    path = os.path.join(PENDING_DIR, f"{pending['token']}.xlsx")
    if not os.path.exists(path):
        messages.warning(request, "El archivo se perdió. Vuelva a subirlo.")
        return HttpResponseRedirect(reverse("academic-load-import"))

    with open(path, "rb") as fh:
        file_bytes = fh.read()
    info = preview(file_bytes, pending["filename"])

    # Default: deselect CARTG (Cartagena)
    default_campus = [c for c in info["campus"] if c != "CARTG"]

    if request.method == "POST":
        chosen = request.POST.getlist("campus_ids")
        if not chosen:
            messages.error(request, "Debe seleccionar al menos un campus para importar.")
        else:
            result = _do_import(request, file_bytes, pending["filename"], info, chosen)
            # Cleanup tmp
            try: os.remove(path)
            except: pass
            return result

    return render(
        request,
        "academic_load/import_preview.html",
        {
            "info": info,
            "default_campus": default_campus,
        },
    )


def _do_import(request, file_bytes: bytes, filename: str, info: dict, campus_chosen: list[str]):
    """Importa el Excel: crea docentes/empleados que falten + filas de carga."""
    from django.contrib.auth.models import User

    file_type = info["file_type"]
    history = ImportHistory.objects.create(
        filename=filename, file_type=file_type, file_size=len(file_bytes),
        file_blob=file_bytes, ciclo_lectivo=info["ciclo_lectivo"],
        campus=",".join(campus_chosen), status="processing",
    )

    docentes_creados = 0
    inserted = 0
    skipped = 0
    try:
        rows = parse_rows(file_bytes, allowed_campus=set(campus_chosen))

        # Build employee lookup by badge_id
        emp_by_badge = {
            e.badge_id: e
            for e in Employee.objects.exclude(badge_id__isnull=True).exclude(badge_id="")
        }

        objs = []
        for r in rows:
            ins = r.get("instructor_id_raw")
            nombre = (r.get("nombre_instructor") or "").strip()

            # Si el archivo trae un docente nuevo (instructor_id + nombre),
            # crear automáticamente Employee + User para vincular la clase.
            if ins and ins not in emp_by_badge and nombre:
                # Parsear nombre "Apellido,Nombre" o "Nombre Apellido"
                if "," in nombre:
                    apellido, primer_nombre = [x.strip() for x in nombre.split(",", 1)]
                else:
                    parts = nombre.split()
                    primer_nombre = parts[0] if parts else "Docente"
                    apellido = " ".join(parts[1:]) if len(parts) > 1 else primer_nombre

                username = f"docente_{ins}"
                user, _ = User.objects.get_or_create(
                    username=username,
                    defaults={
                        "email": f"{ins}@unisinu.edu.co",
                        "first_name": primer_nombre[:30],
                        "last_name": apellido[:30],
                        "is_active": True,
                    },
                )
                if not user.password:
                    user.set_password(f"docente{ins[-4:]}")
                    user.save()

                try:
                    emp = Employee.objects.create(
                        employee_user_id=user,
                        employee_first_name=primer_nombre[:200],
                        employee_last_name=apellido[:200],
                        email=f"{ins}@unisinu.edu.co",
                        phone="0",
                        country="Colombia",
                        badge_id=ins[:50],
                    )
                    emp_by_badge[ins] = emp
                    docentes_creados += 1
                except Exception:
                    pass

            if ins and ins in emp_by_badge:
                r["docente"] = emp_by_badge[ins]
            r["import_id"] = history
            objs.append(CargaAcademica(**r))

        CargaAcademica.objects.bulk_create(objs, batch_size=500)
        inserted = len(objs)
        skipped = info["total_rows"] - inserted

        history.records_inserted = inserted
        history.records_skipped = skipped
        history.status = "completed"
        history.save()

        request.session.pop("pending_import", None)

        msg = (
            f"Importación completa: {inserted} clases insertadas"
            + (f", {docentes_creados} docentes nuevos creados" if docentes_creados else "")
            + (f", {skipped} omitidas (campus filtrados)" if skipped else "")
            + "."
        )
        messages.success(request, msg)
        return HttpResponseRedirect(reverse("academic-load-list"))
    except Exception as e:
        history.status = "error"
        history.error_message = str(e)
        history.save()
        messages.error(request, f"Error al importar: {e}")
        return HttpResponseRedirect(reverse("academic-load-import"))


@login_required
def history_list(request):
    history = ImportHistory.objects.all()[:200]
    return render(request, "academic_load/history.html", {"history": history})


@login_required
def history_download(request, pk: int):
    h = get_object_or_404(ImportHistory, pk=pk)
    if not h.file_blob:
        messages.warning(request, "Este registro no tiene archivo guardado.")
        return HttpResponseRedirect(reverse("academic-load-history"))
    resp = HttpResponse(
        bytes(h.file_blob),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    resp["Content-Disposition"] = f'attachment; filename="{h.filename}"'
    return resp
