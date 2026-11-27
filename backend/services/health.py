import json
from pathlib import Path
DISEASES=json.loads(Path(__file__).with_name('diseases.json').read_text())
def assess(symptoms):
    selected=set(symptoms)
    known={s for d in DISEASES for s in d['sym']}
    if not selected or not selected <= known: raise ValueError('Select valid symptoms')
    ranked=[{**d,'matched':len(selected.intersection(d['sym']))} for d in DISEASES]
    return sorted([d for d in ranked if d['matched']],key=lambda d:d['matched'],reverse=True)
