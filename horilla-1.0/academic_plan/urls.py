from django.urls import path
from . import views

urlpatterns = [
    path("", views.plan_list, name="plan-list"),
    path("validar/", views.plan_validar, name="plan-validar"),
]
