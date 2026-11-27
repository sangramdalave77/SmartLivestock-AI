import pytest
from fastapi.testclient import TestClient
from backend.main import app
@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('CATTLESENSE_DB',str(tmp_path/'test.sqlite3'))
    return TestClient(app)
def register(c,email='farmer@example.com'):
    return c.post('/api/auth/register',json={'email':email,'password':'password123'})
def test_auth(client):
    assert client.get('/api/history').status_code==401
    assert register(client).status_code==201
    assert register(client).status_code==409
    assert client.get('/api/auth/me').json()['email']=='farmer@example.com'
    assert client.post('/api/auth/logout').status_code==200
    assert client.get('/api/history').status_code==401
    assert client.post('/api/auth/login',json={'email':'farmer@example.com','password':'wrongpass'}).status_code==401
    assert client.post('/api/auth/login',json={'email':'farmer@example.com','password':'password123'}).status_code==200
def test_assess(client):
    register(client)
    r=client.post('/api/assess',json={'symptoms':['Mouth blisters','Excessive drooling']})
    assert r.status_code==200 and 'FMD' in r.json()[0]['name']
    assert len(client.get('/api/history').json())==1
    assert client.post('/api/assess',json={'symptoms':['invalid']}).status_code==400
    client.delete('/api/history'); assert client.get('/api/history').json()==[]
def test_milk_and_isolation(client):
    register(client)
    assert client.post('/api/milk',json={'animal':'Cow 1','litres':12.5}).status_code==201
    assert client.post('/api/milk',json={'animal':'Cow 1','litres':-1}).status_code==422
    assert client.get('/api/milk').json()[0]['litres']==12.5
    client.post('/api/auth/logout'); register(client,'other@example.com')
    assert client.get('/api/milk').json()==[]
def test_invalid_image(client):
    register(client)
    assert client.post('/api/predict/breed',json={'image':'invalid'}).status_code==400
    assert client.post('/api/predict/unknown',json={'image':'invalid'}).status_code==404
def test_model_failure_not_fake(client,monkeypatch):
    import io,base64
    from PIL import Image
    from backend.services import vision
    register(client); b=io.BytesIO();Image.new('RGB',(20,20)).save(b,format='PNG')
    def fail(*args): raise RuntimeError('offline')
    monkeypatch.setattr(vision,'predict',fail)
    assert client.post('/api/predict/breed',json={'image':base64.b64encode(b.getvalue()).decode()}).status_code==503
    assert client.get('/api/history').json()==[]
def test_static(client):
    assert client.get('/').status_code==200
    assert client.get('/api.js').status_code==200
    assert client.get('/docs').status_code==200
def test_dashboard_and_model_metadata(client):
    assert client.get('/api/dashboard').status_code==401
    register(client)
    assert client.get('/api/dashboard').json()['milk']['total']==0
    client.post('/api/milk',json={'animal':'A','litres':9})
    assert client.get('/api/dashboard').json()['milk']['total']==9
    assert client.get('/api/models').json()['skin']['classes']==4

def test_uncertainty():
    from backend.services.vision import prediction_summary
    assert prediction_summary(['a','b'],[.51,.49],[])[1]
    assert prediction_summary(['a','b'],[.9,.1],['blur'])[1]
    assert not prediction_summary(['a','b'],[.9,.1],[])[1]

def test_label_mapping(tmp_path):
    from backend.services.vision import labels_from_json
    p=tmp_path/'classes.json';p.write_text('{"b":1,"a":0}')
    assert labels_from_json(p)==['a','b']

def test_gemini_route(client,monkeypatch):
    from backend.services import assistant
    register(client)
    def mocked(question, history):
        assert question=='What about feeding?'
        assert history[0].role=='user'
        return {'answer':'Test response','mode':'Gemini mock'}
    monkeypatch.setattr(assistant,'answer',mocked)
    assert client.post('/api/chat',json={'question':'What about feeding?','history':[{'role':'user','text':'Hello'}]}).json()['answer']=='Test response'
    assert client.post('/api/chat',json={'question':'x','history':[{'role':'system','text':'x'}]}).status_code==422
