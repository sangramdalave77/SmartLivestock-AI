import base64, binascii
from PIL import Image
import io
from fastapi import APIRouter, Depends, HTTPException
from backend.routers.auth import current_user
from backend.schemas import ImageInput, Symptoms, Question, Milk
from backend.services import vision, health, assistant
from backend.db import db
router=APIRouter(prefix='/api')
def save(uid,kind,result):
    with db() as c: c.execute('INSERT INTO records(user_id,type,result) VALUES(?,?,?)',(uid,kind,result))
@router.post('/predict/{kind}')
def predict(kind:str,body:ImageInput,uid:int=Depends(current_user)):
    if kind not in ('breed','skin'): raise HTTPException(404,'Unknown model')
    try:
        raw=base64.b64decode(body.image.split(',')[-1],validate=True)
        if not raw or len(raw)>9_000_000: raise ValueError('Image size must be between 1 byte and 9 MB')
        with Image.open(io.BytesIO(raw)) as im:
            if im.format not in ('JPEG','PNG','WEBP') or im.width*im.height>25_000_000: raise ValueError('Unsupported image or dimensions')
            im.verify()
    except (ValueError,binascii.Error,OSError,Image.DecompressionBombError): raise HTTPException(400,'Invalid image (JPEG, PNG or WebP, maximum 9 MB and 25 megapixels)')
    try: result=vision.predict(kind,raw)
    except Exception as e:
        raise HTTPException(503,'Model unavailable. Run python -m scripts.download_models and check model access.') from e
    if result['results']: save(uid,kind,('Inconclusive — ' if result.get('uncertain') else '')+result['results'][0]['label'])
    return result
@router.get('/diseases')
def diseases(): return health.DISEASES
@router.post('/assess')
def assess(body:Symptoms,uid:int=Depends(current_user)):
    try: result=health.assess(body.symptoms)
    except ValueError as e: raise HTTPException(400,str(e))
    save(uid,'Health quiz',result[0]['name'] if result else 'No match')
    return result
@router.post('/chat')
def chat(body:Question,uid:int=Depends(current_user)):
    try: return assistant.answer(body.question,body.history)
    except ValueError as e: raise HTTPException(503,str(e)) from e
    except Exception as e: raise HTTPException(503,'Gemini request failed. Check your API key, model access, internet and quota.') from e
@router.get('/history')
def history(uid:int=Depends(current_user)):
    with db() as c: return [dict(r) for r in c.execute('SELECT type,result,date FROM records WHERE user_id=? ORDER BY id DESC',(uid,))]
@router.delete('/history')
def clear(uid:int=Depends(current_user)):
    with db() as c: c.execute('DELETE FROM records WHERE user_id=?',(uid,))
    return {'ok':True}
@router.post('/milk',status_code=201)
def milk(body:Milk,uid:int=Depends(current_user)):
    with db() as c: c.execute('INSERT INTO milk(user_id,animal,litres) VALUES(?,?,?)',(uid,body.animal,body.litres))
    return {'ok':True}
@router.get('/milk')
def milk_list(uid:int=Depends(current_user)):
    with db() as c: return [dict(r) for r in c.execute('SELECT animal,litres,date FROM milk WHERE user_id=? ORDER BY id DESC',(uid,))]

@router.get('/models')
def models(): return vision.META
@router.get('/dashboard')
def dashboard(uid:int=Depends(current_user)):
    with db() as c:
        counts={r['type']:r['n'] for r in c.execute('SELECT type, count(*) n FROM records WHERE user_id=? GROUP BY type',(uid,))}
        milk=c.execute('SELECT count(*) n,coalesce(sum(litres),0) total,count(distinct animal) animals FROM milk WHERE user_id=?',(uid,)).fetchone()
        recent=[dict(r) for r in c.execute('SELECT type,result,date FROM records WHERE user_id=? ORDER BY id DESC LIMIT 5',(uid,))]
    return {'counts':counts,'milk':dict(milk),'recent':recent}
