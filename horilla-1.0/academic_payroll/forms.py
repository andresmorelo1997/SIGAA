from django import forms
from .models import Corte


class CorteForm(forms.ModelForm):
    class Meta:
        model = Corte
        fields = ["periodo", "grado", "num_corte", "fecha_inicio", "fecha_fin",
                  "descripcion", "emitido"]
        widgets = {
            "periodo": forms.TextInput(attrs={"class": "oh-input", "placeholder": "2026-1"}),
            "grado": forms.Select(attrs={"class": "oh-select"}),
            "num_corte": forms.NumberInput(attrs={"class": "oh-input", "min": 1, "max": 6}),
            "fecha_inicio": forms.DateInput(attrs={"class": "oh-input", "type": "date"}),
            "fecha_fin": forms.DateInput(attrs={"class": "oh-input", "type": "date"}),
            "descripcion": forms.TextInput(attrs={"class": "oh-input"}),
        }
