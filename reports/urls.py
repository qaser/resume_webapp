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
    path('api/protocols/', views.handle_protocols, name='protocols'),
    path('api/protocols/<str:protocol_id>/archive/', views.archive_protocol, name='archive_protocol'),
    path('api/protocols/<str:protocol_id>/done/', views.mark_protocol_done, name='mark_protocol_done'),
    path('api/orders/', views.handle_orders, name='orders'),
    path('api/orders/<str:order_id>/archive/', views.archive_order, name='archive_order'),
    path('api/orders/<str:order_id>/done/', views.mark_order_done, name='mark_order_done'),
    path("api/authenticate/", views.authenticate_view),
    path("api/departments/", views.departments_list),
]
