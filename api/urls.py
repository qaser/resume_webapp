from django.urls import path
from .views import get_requests

urlpatterns = [
    path('requests/', get_requests, name='get_requests'),
]
