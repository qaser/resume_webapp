from django.contrib import admin
from django.urls import path, include
from . import views
from django.views.generic import TemplateView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('reports.urls')),
    path('api/', include('api.urls')),
    path('login/', views.LoginView.as_view(), name='login'),
]
