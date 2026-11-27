"""Evaluate on an independent directory of class-labelled photos. No training data overlap."""
import argparse,json
from pathlib import Path
from collections import Counter
from backend.services.vision import predict

def norm(s): return ''.join(c for c in s.lower() if c.isalnum())
def main():
    p=argparse.ArgumentParser();p.add_argument('kind',choices=['breed','skin']);p.add_argument('folder',type=Path);p.add_argument('--output',type=Path,default=Path('evaluation.json'));args=p.parse_args()
    counts=Counter(); correct=Counter(); confusion=Counter(); uncertain=0; errors=[]
    for f in sorted(args.folder.glob('*/*')):
        if f.suffix.lower() not in ('.jpg','.jpeg','.png','.webp'):continue
        try:
            r=predict(args.kind,f.read_bytes()); expected=norm(f.parent.name); actual=norm(r['results'][0]['label']); counts[expected]+=1;correct[expected]+=int(expected==actual);confusion[f'{expected} -> {actual}']+=1;uncertain+=int(r['uncertain'])
        except Exception as e: errors.append({'file':str(f),'error':str(e)})
    n=sum(counts.values()); accuracy=sum(correct.values())/n if n else None
    report={'samples':n,'accuracy':accuracy,'balanced_accuracy':sum(correct[k]/v for k,v in counts.items())/len(counts) if n else None,'uncertain':uncertain,'per_class':{k:{'samples':v,'recall':correct[k]/v} for k,v in counts.items()},'confusion':dict(confusion),'errors':errors,'target_met':bool(n and not errors and accuracy>=.8)}
    args.output.write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));return 0 if report['target_met'] else 1
if __name__=='__main__':raise SystemExit(main())
