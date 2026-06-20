"""Upload + local file serving — mirrors src/app/api/upload + src/app/api/files."""
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt

from core.http import current_user, fail, ok
from core.services.storage import read_local_file, upload_file

MAX_BYTES = 8 * 1024 * 1024  # 8 MB
ALLOWED = {"image/png", "image/jpeg", "image/webp", "application/pdf"}


@csrf_exempt
def upload(request):
    if request.method != "POST":
        return fail("Method not allowed", 405)
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    file = request.FILES.get("file")
    if file is None:
        return fail("No file provided", 422)
    if file.size > MAX_BYTES:
        return fail("File too large (max 8 MB)", 413)
    if file.content_type not in ALLOWED:
        return fail("Only PNG, JPG, WEBP or PDF files are allowed", 415)

    stored = upload_file("payment-proofs", file.name or "proof", file.read(), file.content_type)
    return ok({"key": stored["key"], "url": stored["url"], "name": file.name, "size": file.size})


def files(request, path):
    """Serves locally-stored files (dev/no-Supabase fallback). Auth required."""
    user = current_user(request)
    if not user:
        return fail("Not authenticated", 401, "UNAUTHENTICATED")

    found = read_local_file(path)
    if not found:
        return HttpResponse("Not found", status=404)

    response = HttpResponse(found["data"], content_type=found["content_type"])
    response["Cache-Control"] = "private, max-age=3600"
    return response
