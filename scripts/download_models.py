from backend.services.vision import breed_model,skin_model
if __name__=="__main__":
    for name,load in [("Breed",breed_model),("Skin",skin_model)]:
        print("Loading",name,flush=True); load(); print(name,"ready",flush=True)
