from django.apps import AppConfig


class AcademicPayrollConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "academic_payroll"
    verbose_name = "Prenómina Docente"

    def ready(self):
        from django.urls import include, path
        from horilla.urls import urlpatterns
        urlpatterns.append(
            path("academic-payroll/", include("academic_payroll.urls")),
        )
        super().ready()
