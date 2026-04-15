"""
academic_payroll.models
=======================
Modelos del módulo Prenómina Docente:
  - `Corte`: definición de cortes por periodo + grado (PREG/POSG)
  - `PrenominaDocente`: fila del consolidado por docente (snapshot)
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from employee.models import Employee
from academic_load.models import GRADO_CHOICES


class Corte(models.Model):
    """Configuración de cortes para un periodo y grado."""

    periodo = models.CharField(_("Periodo"), max_length=10, db_index=True,
                               help_text="Ejemplo: 2026-1")
    grado = models.CharField(_("Grado"), max_length=10, choices=GRADO_CHOICES,
                             db_index=True)
    num_corte = models.IntegerField(_("N° Corte"), help_text="1, 2, 3, 4 …")
    fecha_inicio = models.DateField(_("Fecha inicio"))
    fecha_fin = models.DateField(_("Fecha fin"))
    descripcion = models.CharField(_("Descripción"), max_length=255,
                                   blank=True, null=True)
    emitido = models.BooleanField(_("Emitido / congelado"), default=False)
    fecha_emision = models.DateTimeField(_("Fecha emisión"), null=True, blank=True)

    class Meta:
        verbose_name = _("Corte de Prenómina")
        verbose_name_plural = _("Cortes de Prenómina")
        unique_together = [("periodo", "grado", "num_corte")]
        ordering = ["periodo", "grado", "num_corte"]

    def __str__(self):
        return f"Corte {self.num_corte} · {self.grado} · {self.periodo}"


class PrenominaDocente(models.Model):
    """
    Snapshot del consolidado de prenómina por docente para un periodo.
    Se genera al ejecutar el cálculo y se congela cuando se emite el corte.
    """

    periodo = models.CharField(_("Periodo"), max_length=10, db_index=True)
    tipo = models.CharField(_("Tipo"), max_length=20, choices=[
        ("PREGRADO", "Pregrado"),
        ("POSGRADO", "Posgrado"),
    ], db_index=True)
    docente = models.ForeignKey(
        Employee, on_delete=models.CASCADE,
        related_name="prenominas_docente",
        verbose_name=_("Docente"),
    )

    # Métricas agregadas
    hrs_semana = models.FloatField(_("Hrs/semana"), default=0)
    hrs_semestre = models.FloatField(_("Hrs/semestre"), default=0)

    # Cortes (hasta 6 — los típicos son 4)
    corte_1 = models.FloatField(default=0)
    corte_2 = models.FloatField(default=0)
    corte_3 = models.FloatField(default=0)
    corte_4 = models.FloatField(default=0)
    corte_5 = models.FloatField(default=0)
    corte_6 = models.FloatField(default=0)

    # Totales
    hrs_prenomina = models.FloatField(_("Hrs prenómina"), default=0)
    saldo = models.FloatField(_("Saldo"), default=0)

    estado = models.CharField(_("Estado"), max_length=20, default="pendiente",
                              choices=[
                                  ("pendiente", _("Pendiente")),
                                  ("emitido", _("Emitido")),
                              ])
    num_corte_emitido = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Prenómina Docente")
        verbose_name_plural = _("Prenómina Docente")
        unique_together = [("periodo", "tipo", "docente")]
        ordering = ["docente__employee_first_name"]

    def __str__(self):
        return f"{self.docente} · {self.periodo} ({self.tipo})"
