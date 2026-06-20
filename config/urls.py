from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(_request):
    return JsonResponse({"ok": True, "service": "gyftr-b2b-django", "status": "running"})


urlpatterns = [
    path("", health),
    path("django-admin/", admin.site.urls),
    path("", include("core.urls")),
]
