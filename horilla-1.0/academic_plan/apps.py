from django.apps import AppConfig


class AcademicPlanConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "academic_plan"
    verbose_name = "Plan de Estudios"

    def ready(self):
        from django.urls import include, path
        from horilla.urls import urlpatterns
        urlpatterns.append(
            path("academic-plan/", include("academic_plan.urls")),
        )
        super().ready()
