"""
academic_load.models
====================
Modelos del módulo Carga Académica (SIGAA · Universidad del Sinú).

Diseño:
- `CargaAcademica` representa una clase programada (una fila del XLSX
  US_PROG_CLASES). Vincula un docente (Employee de Horilla), un programa
  (Department de Horilla) y conserva los campos institucionales necesarios
  para reportes SNIES y prenómina.
- `ImportHistory` registra cada importación (bitácora con file_blob para
  poder reabrir el Excel original).
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from base.models import Department
from employee.models import Employee


CAMPUS_CHOICES = [
    ("MONTR", _("Montería")),
    ("CARTG", _("Cartagena")),
    ("BOGT", _("Bogotá")),
    ("CECOV", _("Cereté — Covenas")),
    ("CESAN", _("Cereté — Sant. de Quil.")),
    ("CETIE", _("Cereté — Tierralta")),
    ("CEVAL", _("Cereté — Valencia")),
]

GRADO_CHOICES = [
    ("PREG", _("Pregrado")),
    ("PRE2", _("Pregrado 2")),
    ("POSG", _("Posgrado")),
    ("MSTR", _("Maestría")),
    ("DOCT", _("Doctorado")),
    ("ESP",  _("Especialización")),
    ("TCN",  _("Técnico")),
]

ESTADO_CHOICES = [
    ("Activo", _("Activo")),
    ("Cancelada", _("Cancelada")),
    ("Detener", _("Detenida")),
    ("Inactivo", _("Inactivo")),
]


class CargaAcademica(models.Model):
    """Programación académica — una fila por clase programada."""

    # Identidad
    num_clase = models.IntegerField(_("N° Clase"), null=True, blank=True)
    id_curso = models.IntegerField(_("ID Curso"), null=True, blank=True)
    catalogo = models.CharField(_("Catálogo"), max_length=64, null=True, blank=True)
    descripcion = models.CharField(_("Descripción / Asignatura"), max_length=255, null=True, blank=True)
    componente = models.CharField(_("Componente"), max_length=16, null=True, blank=True)

    creditos = models.IntegerField(_("Créditos"), null=True, blank=True)
    seccion = models.IntegerField(_("Sección"), null=True, blank=True)
    estado_clase = models.CharField(_("Estado"), max_length=20, choices=ESTADO_CHOICES, default="Activo")

    # Dimensiones académicas
    campus = models.CharField(_("Campus"), max_length=10, choices=CAMPUS_CHOICES, null=True, blank=True, db_index=True)
    ciclo_lectivo = models.CharField(_("Ciclo Lectivo"), max_length=10, null=True, blank=True, db_index=True)
    grado = models.CharField(_("Grado"), max_length=10, choices=GRADO_CHOICES, null=True, blank=True, db_index=True)
    grupo_academico = models.CharField(_("Grupo Académico"), max_length=64, null=True, blank=True)
    org_academica = models.CharField(_("Organización Académica"), max_length=64, null=True, blank=True)
    desc_org_academica = models.CharField(_("Descripción Org. Académica"), max_length=255, null=True, blank=True)

    # Programa académico (Department de Horilla)
    programa = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="clases_carga",
        verbose_name=_("Programa"),
    )

    # Docente (Employee de Horilla)
    docente = models.ForeignKey(
        Employee,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="clases_dictadas",
        verbose_name=_("Docente"),
    )
    nombre_instructor = models.CharField(_("Nombre Instructor (texto)"), max_length=255, null=True, blank=True)
    instructor_id_raw = models.CharField(_("Instructor ID (10 dígitos)"), max_length=20, null=True, blank=True, db_index=True)

    # Tiempo
    fecha_inicial = models.CharField(_("Fecha Inicial"), max_length=20, null=True, blank=True)
    fecha_final = models.CharField(_("Fecha Final"), max_length=20, null=True, blank=True)
    semanas = models.IntegerField(_("Semanas"), null=True, blank=True)

    hora_inicio = models.CharField(_("Hora Inicio"), max_length=10, null=True, blank=True)
    hora_fin = models.CharField(_("Hora Fin"), max_length=10, null=True, blank=True)
    jornada = models.CharField(_("Jornada"), max_length=20, null=True, blank=True)

    # Días
    lunes = models.CharField(max_length=2, null=True, blank=True)
    martes = models.CharField(max_length=2, null=True, blank=True)
    miercoles = models.CharField(max_length=2, null=True, blank=True)
    jueves = models.CharField(max_length=2, null=True, blank=True)
    viernes = models.CharField(max_length=2, null=True, blank=True)
    sabado = models.CharField(max_length=2, null=True, blank=True)
    domingo = models.CharField(max_length=2, null=True, blank=True)

    # Métricas calculadas
    hrs_semanal = models.FloatField(_("Hrs/semana"), null=True, blank=True)
    hrs_semestre = models.FloatField(_("Hrs/semestre"), null=True, blank=True)
    capacidad_inscripcion = models.IntegerField(_("Cupos"), null=True, blank=True)
    total_inscripciones = models.IntegerField(_("Inscritos"), null=True, blank=True)

    # Auditoría
    import_id = models.ForeignKey(
        "academic_load.ImportHistory",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="filas",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Carga Académica")
        verbose_name_plural = _("Carga Académica")
        ordering = ["-id"]
        indexes = [
            models.Index(fields=["campus", "ciclo_lectivo"]),
            models.Index(fields=["docente"]),
            models.Index(fields=["catalogo"]),
        ]

    def __str__(self):
        return f"{self.num_clase or '?'} · {self.catalogo or ''} — {self.descripcion or ''}"


class ImportHistory(models.Model):
    """Bitácora de importaciones — un registro por archivo procesado."""

    FILE_TYPES = [
        ("US_PROG", "US_PROG_CLASES"),
        ("LC_PROG", "LC_PROGRAMACION_CLASES"),
        ("US_DATOS", "US_DATOS_DOCENTES"),
        ("DOCENTES_IES", "DOCENTES_IES"),
        ("UNKNOWN", "Desconocido"),
    ]
    STATUS = [
        ("processing", _("Procesando")),
        ("completed", _("Completado")),
        ("error", _("Error")),
    ]

    filename = models.CharField(_("Archivo"), max_length=255)
    file_type = models.CharField(_("Tipo"), max_length=20, choices=FILE_TYPES, default="UNKNOWN")
    file_size = models.BigIntegerField(_("Tamaño (bytes)"), null=True, blank=True)
    file_blob = models.BinaryField(_("Archivo original"), null=True, blank=True)
    ciclo_lectivo = models.CharField(_("Ciclo Lectivo"), max_length=10, null=True, blank=True)
    grado = models.CharField(_("Grado"), max_length=10, null=True, blank=True)
    campus = models.CharField(_("Campus"), max_length=255, null=True, blank=True,
                              help_text=_("CSV de campus afectados"))
    records_inserted = models.IntegerField(default=0)
    records_updated = models.IntegerField(default=0)
    records_skipped = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS, default="processing")
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Importación")
        verbose_name_plural = _("Historial de importaciones")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.filename} ({self.created_at:%Y-%m-%d %H:%M})"
