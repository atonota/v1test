"""Baseline scaffold: missing behavior deliberately returns 501 for the RED stage."""
from fastapi import FastAPI
from fastapi.responses import HTMLResponse, JSONResponse

app=FastAPI(title='Fabrika')

@app.get('/health')
def health():
    return {'status':'ok'}

@app.get('/api/overview')
def overview():
    return JSONResponse({'detail':'Not implemented yet'},status_code=501)

@app.get('/',response_class=HTMLResponse)
def homepage():
    return '<!doctype html><html lang="tr"><title>Pilot hazırlanıyor</title><h1>Pilot hazırlanıyor</h1></html>'

