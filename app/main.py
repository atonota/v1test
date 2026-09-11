"""HTTP controllers; the only exposed files are explicitly listed view assets."""
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse

from app.application import SnapshotService, SnapshotUnavailable

app = FastAPI(title="Fabrika durum ve görev panosu", docs_url=None, redoc_url=None,
              openapi_url=None)
service = SnapshotService()
VIEW = Path(__file__).parent


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/overview")
def overview():
    headers = {"Cache-Control": "no-store"}
    try:
        return JSONResponse(service.read().model_dump(), headers=headers)
    except SnapshotUnavailable:
        return JSONResponse({"detail": "Fabrika verisi şu anda kullanılamıyor."},
                            status_code=503, headers=headers)


@app.get("/")
def homepage():
    return FileResponse(VIEW / "index.html", media_type="text/html")


@app.get("/static/styles.css", include_in_schema=False)
def stylesheet():
    return FileResponse(VIEW / "static/styles.css", media_type="text/css")


@app.get("/static/dashboard.css", include_in_schema=False)
def dashboard_styles():
    return FileResponse(VIEW / "static/dashboard.css", media_type="text/css")


@app.get("/static/dashboard.js", include_in_schema=False)
def dashboard_script():
    return FileResponse(VIEW / "static/dashboard.js", media_type="text/javascript")
