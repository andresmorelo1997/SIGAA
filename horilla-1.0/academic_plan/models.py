"""
academic_plan.models
====================
Plan de estudios — definición de las asignaturas que un programa
académico debe ofrecer por semestre. Se contrasta con CargaAcademica
para identificar asignaturas no programadas.
"""
from django.db import models
from django.utils.translation import gettext_lazy as _

from base.models import Department


class PlanEstudio(models.Model):
    """Una asignatura del plan de estudios para un programa específico."""

    programa = models.ForeignKey(
        Department, on_delete=models.CASCADE,
        related_name="plan_estudios",
        verbose_name=_("Programa"),
    )
    programa_codigo = models.CharField(_("Código programa"), max_length=20, db_index=True,
                                       help_text="Código del programa: ADMON, EPSIG, etc.")
    semestre = models.CharField(_("Semestre"), max_length=10,
                                help_text="I, II, III, IV…")
    catalogo = models.CharField(_("Catálogo"), max_length=64, db_index=True)
    asignatura = models.CharField(_("Asignatura"), max_length=255)
    creditos = models.IntegerField(_("Créditos"), default=0)
    hrs_semanal = models.FloatField(_("Hrs/sem"), default=0)
    hrs_semestre = models.FloatField(_("Hrs/sem.re"), default=0)
    atrib_curso = models.CharField(_("Atributo curso"), max_length=64, blank=True, null=True)
    cohorte = models.CharField(_("Cohorte"), max_length=20, blank=True, null=True)
    grado = models.CharField(_("Grado"), max_length=10, blank=True, null=True)
    modalidad = models.CharField(_("Modalidad"), max_length=50, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Plan de Estudios")
        verbose_name_plural = _("Plan de Estudios")
        unique_together = [("programa_codigo", "catalogo")]
        ordering = ["programa_codigo", "semestre", "catalogo"]

    def __str__(self):
        return f"{self.programa_codigo} · {self.semestre} · {self.asignatura}"
