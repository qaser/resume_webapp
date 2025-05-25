from django.views.generic import TemplateView


class LoginView(TemplateView):
    template_name = 'report_webapp/login.html'
