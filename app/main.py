"""HTTP controllers; the only exposed files are explicitly listed view assets."""
from pathlib import Path

from fastapi import FastAPI, HTTPException
import re
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
    path = VIEW / "dist/index.html"
    if not path.is_file():
        raise HTTPException(status_code=503, detail="Arayüz derlemesi hazır değil.")
    return FileResponse(path, media_type="text/html", headers={"Cache-Control":"no-cache"})


@app.get('/assets/{filename}', include_in_schema=False)
def compiled_asset(filename: str):
    if not re.fullmatch(r'[A-Za-z0-9_-]+\.(js|css)', filename):
        raise HTTPException(status_code=404)
    path = VIEW / 'dist/assets' / filename
    if not path.is_file() or path.is_symlink():
        raise HTTPException(status_code=404)
    return FileResponse(path, media_type='text/css' if filename.endswith('.css') else 'text/javascript',
                        headers={'Cache-Control':'public, max-age=31536000, immutable'})


@app.get("/static/styles.css", include_in_schema=False)
def stylesheet():
    return FileResponse(VIEW / "static/styles.css", media_type="text/css")
