"""
Migración SIGAA → Horilla
Lee /tmp/sigaa.db (SQLite del SIGAA Next.js) y crea:
  - Compañía "Universidad del Sinú"
  - Programas Académicos como Departments
  - Dedicaciones como JobPositions
  - Docentes como Employees + User
"""
import os
import sqlite3
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "horilla.settings")
django.setup()

from django.contrib.auth.models import User
from base.models import Company, Department, JobPosition
from employee.models import Employee


def main():
    src = sqlite3.connect("/tmp/sigaa.db")
    src.row_factory = sqlite3.Row

    # 1) Compañía Universidad del Sinú
    company, created = Company.objects.update_or_create(
        company="Universidad del Sinú",
        defaults={
            "address": "Km 1.5 vía a Cereté, Montería, Córdoba",
            "country": "Colombia",
            "state": "Córdoba",
            "city": "Montería",
            "zip": "230002",
            "date_format": "DD-MM-YYYY",
            "time_format": "24",
            "hq": True,
        },
    )
    print(f"  ✓ Compañía: {company.company} ({'creada' if created else 'actualizada'})")

    # 2) Programas → Departments
    programas_filas = src.execute(
        "SELECT codigo, nombre, grado FROM programas WHERE codigo IS NOT NULL"
    ).fetchall()
    progs_creados = 0
    map_codigo_dept = {}
    for r in programas_filas:
        codigo = r["codigo"]
        nombre = r["nombre"] or codigo
        # Para no romper el verbose_name, usamos `nombre` como Department.department
        dept, created = Department.objects.get_or_create(department=nombre[:100])
        if company not in dept.company_id.all():
            dept.company_id.add(company)
        map_codigo_dept[codigo] = dept
        if created:
            progs_creados += 1
    print(f"  ✓ Programas/Departments: {progs_creados} nuevos / {len(programas_filas)} totales")

    # 3) Dedicaciones → JobPositions (anclados a un dept administrativo)
    admin_dept, _ = Department.objects.get_or_create(department="Administración Académica")
    if company not in admin_dept.company_id.all():
        admin_dept.company_id.add(company)
    DEDICACIONES = [
        "Tiempo Completo",
        "Medio Tiempo",
        "Catedrático",
        "Hora Cátedra",
        "Profesor Investigador",
        "Coordinador",
    ]
    map_dedicacion_jp = {}
    for d in DEDICACIONES:
        jp, _ = JobPosition.objects.get_or_create(
            job_position=d, department_id=admin_dept,
        )
        if company not in jp.company_id.all():
            jp.company_id.add(company)
        map_dedicacion_jp[d.lower()] = jp
    print(f"  ✓ Dedicaciones/JobPositions: {len(DEDICACIONES)}")

    # 4) Docentes → Employee (+ User)
    # DISTINCT por instructor_id para no duplicar
    docentes_filas = src.execute(
        """SELECT instructor_id, primer_nombre, segundo_nombre,
                  primer_apellido, segundo_apellido, doc_id, tipo_doc,
                  ciudad, direccion, telefono, correo, campus,
                  fecha_inicio, fecha_final, dedicacion
             FROM docentes
            WHERE instructor_id IS NOT NULL AND instructor_id != ''
              AND primer_nombre IS NOT NULL AND primer_nombre != ''
            GROUP BY instructor_id"""
    ).fetchall()
    print(f"  → procesando {len(docentes_filas)} docentes…")

    creados = 0
    actualizados = 0
    for r in docentes_filas:
        ins_id = r["instructor_id"].strip()
        if not ins_id:
            continue

        # Username = instructor_id (10 dígitos)
        username = f"docente_{ins_id}"
        first_name = (r["primer_nombre"] or "").strip()
        last_name = " ".join(
            x for x in [r["primer_apellido"], r["segundo_apellido"]] if x
        ).strip() or first_name

        email = (r["correo"] or "").strip()
        if not email or "@" not in email:
            email = f"{ins_id}@unisinu.edu.co"
        # Deduplicate: if email is already taken by another employee, suffix it
        if Employee.objects.filter(email=email).exclude(badge_id=ins_id).exists():
            email = f"{ins_id}+{ins_id[-4:]}@unisinu.edu.co"

        # Crear user
        user, u_created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": first_name[:30],
                "last_name": last_name[:30],
                "is_active": True,
            },
        )
        if u_created:
            user.set_password(f"docente{ins_id[-4:]}")  # password temporal
            user.save()

        # Vincular con dedicación
        ded = (r["dedicacion"] or "").lower().strip()
        job = map_dedicacion_jp.get(ded)

        # Crear Employee
        defaults = {
            "employee_first_name": first_name[:200],
            "employee_last_name": last_name[:200],
            "email": email,
            "phone": (r["telefono"] or "0")[:25],
            "address": (r["direccion"] or "")[:255],
            "country": "Colombia",
            "state": "Córdoba",
            "city": (r["ciudad"] or "")[:50],
            "badge_id": ins_id[:50],
        }
        emp, e_created = Employee.objects.update_or_create(
            employee_user_id=user, defaults=defaults
        )
        if e_created:
            creados += 1
        else:
            actualizados += 1

        if (creados + actualizados) % 200 == 0:
            print(f"     · {creados + actualizados} procesados…")

    print(f"  ✓ Docentes/Empleados: {creados} creados, {actualizados} actualizados")
    print()
    print("MIGRACIÓN COMPLETA")


if __name__ == "__main__":
    main()
