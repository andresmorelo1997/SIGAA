from django.apps import AppConfig


class AcademicLoadConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "academic_load"
    verbose_name = "Carga Académica"

    def ready(self):
        from django.urls import include, path
        from horilla.urls import urlpatterns

        urlpatterns.append(
            path("academic-load/", include("academic_load.urls")),
        )
        super().ready()
