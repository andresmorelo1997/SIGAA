from django.apps import AppConfig


class AcademicReportsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "academic_reports"
    verbose_name = "Reportes SNIES"

    def ready(self):
        from django.urls import include, path
        from horilla.urls import urlpatterns
        urlpatterns.append(
            path("academic-reports/", include("academic_reports.urls")),
        )
        super().ready()
