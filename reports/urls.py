from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('view/', views.view_data, name='view_data'),
    path('api/reports/', views.handle_report, name='handle_report'),
    path('api/reports/get/', views.get_reports, name='get_reports'),
    path('api/planning/', views.handle_planning, name='handle_planning'),
    path('api/plans/', views.get_plans, name='get_plans'),
    path('api/leaks/', views.get_leaks, name='get_leaks'),
    path('api/kss/', views.get_kss, name='get_kss'),
    path('api/remarks/', views.get_remarks, name='get_remarks'),
]
