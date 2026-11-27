from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from backend.routers import auth,care
app=FastAPI(title='SmartLivestock AI API',version='1.0.0',description='Educational livestock care screening; not veterinary diagnosis.')
app.include_router(auth.router); app.include_router(care.router)
@app.get('/api/health')
def health(): return {'status':'ok','models':'lazy loaded'}
app.mount('/',StaticFiles(directory=Path(__file__).resolve().parents[1]/'frontend',html=True),name='frontend')

