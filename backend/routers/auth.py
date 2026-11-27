import hashlib, secrets, hmac, time, sqlite3
from fastapi import APIRouter, HTTPException, Cookie, Response, Depends
from backend.db import db,password_hash,new_session
from backend.schemas import Credentials
router=APIRouter(prefix='/api/auth')
def current_user(session: str | None = Cookie(default=None)):
    if not session: raise HTTPException(401,'Sign in first')
    with db() as c:
        row=c.execute('SELECT user_id FROM sessions WHERE token=? AND expires>?',(hashlib.sha256(session.encode()).hexdigest(),int(time.time()))).fetchone()
    if not row: raise HTTPException(401,'Session expired')
    return row['user_id']
def cookie(response,token):
    response.set_cookie('session',token,httponly=True,samesite='strict',max_age=86400)
@router.post('/register',status_code=201)
def register(body:Credentials,response:Response):
    salt=secrets.token_hex(16)
    try:
        with db() as c:
            uid=c.execute('INSERT INTO users(email,salt,password) VALUES(?,?,?)',(body.email.lower(),salt,password_hash(body.password,salt))).lastrowid
            token=new_session(c,uid)
    except sqlite3.IntegrityError: raise HTTPException(409,'Account already exists')
    cookie(response,token); return {'email':body.email.lower()}
@router.post('/login')
def login(body:Credentials,response:Response):
    with db() as c:
        row=c.execute('SELECT * FROM users WHERE email=?',(body.email.lower(),)).fetchone()
        if not row or not hmac.compare_digest(row['password'],password_hash(body.password,row['salt'])): raise HTTPException(401,'Invalid credentials')
        token=new_session(c,row['id'])
    cookie(response,token); return {'email':row['email']}
@router.get('/me')
def me(uid:int=Depends(current_user)):
    with db() as c: return {'email':c.execute('SELECT email FROM users WHERE id=?',(uid,)).fetchone()['email']}
@router.post('/logout')
def logout(response:Response,session:str|None=Cookie(default=None)):
    if session:
        with db() as c: c.execute('DELETE FROM sessions WHERE token=?',(hashlib.sha256(session.encode()).hexdigest(),))
    response.delete_cookie('session'); return {'ok':True}
