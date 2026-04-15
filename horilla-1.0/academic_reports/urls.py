from django.urls import path
from . import views

urlpatterns = [
    path("", views.index, name="reports-index"),
    path("export/", views.export_excel, name="reports-export"),
]
