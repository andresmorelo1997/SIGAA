"""horilla URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.shortcuts import redirect
from django.urls import include, path, re_path

import notifications.urls

from . import settings


def health_check(request):
    return JsonResponse({"status": "ok"}, status=200)


def sigaa_home(request):
    """Landing SIGAA · comportamiento según rol del usuario.

    - Anónimo → /login/
    - Staff/superuser → Dashboard académico con todos los KPIs
    - Docente normal (Employee sin permisos de staff) → su propio tab de
      Carga Académica (para ver solo sus clases y horas).
    """
    user = request.user
    if not user.is_authenticated:
        return redirect("login")

    # Superuser/staff → dashboard global
    if user.is_staff or user.is_superuser:
        return redirect("academic-dashboard")

    # Docente normal → su employee-view-individual
    try:
        emp = user.employee_get
        if emp:
            return redirect("employee-view-individual", emp.id)
    except Exception:
        pass

    # Fallback
    return redirect("academic-dashboard")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path("accounts/", include("django.contrib.auth.urls")),
    # SIGAA: redirect home al dashboard antes de delegar a base.urls
    path("", sigaa_home, name="sigaa-home"),
    path("", include("base.urls")),
    path("", include("horilla_automations.urls")),
    path("", include("horilla_views.urls")),
    path("employee/", include("employee.urls")),
    path("horilla-widget/", include("horilla_widgets.urls")),
    path("api/", include("horilla_api.urls")),
    re_path(
        "^inbox/notifications/", include(notifications.urls, namespace="notifications")
    ),
    path("i18n/", include("django.conf.urls.i18n")),
    path("health/", health_check),
    # ───────── SIGAA · Universidad del Sinú ─────────
    path("academic/", include("academic_load.urls")),
    path("plan/", include("academic_plan.urls")),
    path("prenomina/", include("academic_payroll.urls")),
    path("reports/", include("academic_reports.urls")),
]

# if settings.DEBUG:
#     urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
