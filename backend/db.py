import os, sqlite3, hashlib, secrets, time
from pathlib import Path
from contextlib import contextmanager

@contextmanager
def db():
    path=Path(os.getenv('CATTLESENSE_DB','data/cattlesense.sqlite3'))
    path.parent.mkdir(parents=True, exist_ok=True)
    c=sqlite3.connect(path); c.row_factory=sqlite3.Row
    c.execute('PRAGMA foreign_keys=ON')
    try:
        c.executescript('''CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id), expires INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS records(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), type TEXT NOT NULL, result TEXT NOT NULL, date TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS milk(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id), animal TEXT NOT NULL, litres REAL NOT NULL, date TEXT DEFAULT CURRENT_TIMESTAMP);''')
        yield c; c.commit()
    except Exception:
        c.rollback(); raise
    finally: c.close()

def password_hash(password,salt):
    return hashlib.pbkdf2_hmac('sha256',password.encode(),bytes.fromhex(salt),600000).hex()

def new_session(c,user_id):
    token=secrets.token_urlsafe(32)
    c.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),user_id,int(time.time())+86400))
    return token
