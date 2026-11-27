"""Cattle-specific classifiers. No fabricated predictions or unsafe pickle fallback."""
import io,json,time
from functools import lru_cache
from PIL import Image,ImageOps,ImageStat,ImageFilter
BREED='ujjwal75/indian-bovine-breeds-model'
SKIN='HARUNKOR/herd-health-vision'
META={'breed':{'source':f'https://huggingface.co/{BREED}','reported_accuracy':0.90,'metric_type':'Author-reported approximate validation accuracy','architecture':'Indian bovine CNN','classes':40},'skin':{'source':'https://github.com/harunkor/HerdHealthVision','reported_accuracy':0.894,'metric_type':'Author-reported validation accuracy (1,045 samples)','architecture':'EfficientNet-B2','classes':4}}
def labels_from_json(path):
    with open(path,encoding='utf8') as f: data=json.load(f)
    if isinstance(data,list): return [str(x) for x in data]
    if isinstance(data,dict):
        for key in ('classes','class_names','idx_to_class','class_to_idx'):
            if key in data:
                data=data[key]; break
        if isinstance(data,list): return [str(x) for x in data]
        if all(str(k).isdigit() for k in data): return [str(data[str(i)]) for i in range(len(data))]
        if all(isinstance(v,int) for v in data.values()): return [k for k,v in sorted(data.items(),key=lambda x:x[1])]
    raise ValueError('Unrecognized class mapping')
def state_dict(path):
    import torch
    d=torch.load(path,map_location='cpu',weights_only=True)
    for k in ('model_state_dict','state_dict','model'):
        if isinstance(d,dict) and isinstance(d.get(k),dict): d=d[k];break
    return {k.removeprefix('module.').removeprefix('_orig_mod.'):v for k,v in d.items()}
@lru_cache(maxsize=1)
def breed_model():
    from huggingface_hub import hf_hub_download
    from torchvision import models
    labels=labels_from_json(hf_hub_download(BREED,'classes.json'))
    d=state_dict(hf_hub_download(BREED,'Indian_bovine_finetuned_model.pth'))
    import timm
    candidates=[models.resnet50,models.resnet101,models.resnet152,models.efficientnet_b0,models.efficientnet_b3,models.efficientnet_b4,lambda **kw: timm.create_model("convnext_tiny",pretrained=False,num_classes=kw["num_classes"])]
    for constructor in candidates:
        m=constructor(weights=None,num_classes=len(labels))
        try: m.load_state_dict(d,strict=True);return m.eval(),labels
        except RuntimeError: continue
    raise RuntimeError('Breed checkpoint architecture not recognized')
@lru_cache(maxsize=1)
def skin_model():
    import timm
    from huggingface_hub import hf_hub_download
    labels=labels_from_json(hf_hub_download(SKIN,'classes.json',repo_type='space'))
    d=state_dict(hf_hub_download(SKIN,'herd_health_model.pt',repo_type='space'))
    m=timm.create_model('efficientnet_b2',pretrained=False,num_classes=len(labels))
    m.load_state_dict(d,strict=True)
    return m.eval(),labels

def quality(im):
    gray=im.convert('L'); small=gray.resize((224,224)); stat=ImageStat.Stat(small)
    warnings=[]
    if min(im.size)<160: warnings.append('Low resolution: retake a larger photograph.')
    if stat.mean[0]<35 or stat.mean[0]>225: warnings.append('Extreme exposure: retake in even daylight.')
    if ImageStat.Stat(small.filter(ImageFilter.FIND_EDGES).crop((5,5,219,219))).stddev[0]<5: warnings.append('Little visible detail: check focus and framing.')
    return warnings

def prediction_summary(labels,scores,warnings):
    ranked=sorted([{'label':str(n).replace('_',' ').title(),'score':float(s)} for n,s in zip(labels,scores)],key=lambda x:x['score'],reverse=True)
    if not ranked: raise ValueError('Empty prediction')
    uncertain=bool(warnings) or ranked[0]['score']<.65 or (len(ranked)>1 and ranked[0]['score']-ranked[1]['score']<.15)
    return ranked[:5],uncertain

def predict(kind,raw):
    import torch
    from torchvision import transforms as T
    start=time.perf_counter(); im=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
    warnings=quality(im)
    model,labels=(breed_model() if kind=='breed' else skin_model())
    resize=T.Resize((224,224))
    transform=T.Compose([resize,T.ToTensor(),T.Normalize([.485,.456,.406],[.229,.224,.225])])
    with torch.inference_mode():
        logits=model(transform(im).unsqueeze(0)); scores=logits.softmax(1)[0].tolist()
    if len(scores)!=len(labels): raise RuntimeError('Class mapping mismatch')
    ranked,uncertain=prediction_summary(labels,scores,warnings)
    return {'metric':'Model score, not calibrated clinical probability','results':ranked,'uncertain':uncertain,'warnings':warnings,'model':META[kind],'supported_labels':labels,'elapsed_ms':round((time.perf_counter()-start)*1000)}
