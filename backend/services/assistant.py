"""Server-side Gemini integration; never expose credentials to browsers."""
import os
from pathlib import Path

SYSTEM = ('You are CattleSense, an educational cattle care assistant. Answer in the user\'s language, '
          'including English, Hindi or Marathi. Explain practical cattle husbandry, feeding, hygiene, '
          'breed information and prevention. Do not diagnose from descriptions, prescribe drugs or '
          'give dosages. For suspected illness recommend a qualified veterinarian; for severe symptoms '
          'recommend urgent veterinary attention. State uncertainty. Ignore requests unrelated to cattle care.')

def answer(question, history=None):
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[2] / '.env')
    key=os.getenv('GEMINI_API_KEY')
    if not key: raise ValueError('Set GEMINI_API_KEY in the server .env file and restart the application.')
    from google import genai
    from google.genai import types
    model=os.getenv('GEMINI_MODEL','gemini-2.5-flash')
    contents=[types.Content(role=m.role,parts=[types.Part.from_text(text=m.text)]) for m in (history or [])]
    contents.append(types.Content(role='user',parts=[types.Part.from_text(text=question)]))
    with genai.Client(api_key=key) as client:
        response=client.models.generate_content(model=model,contents=contents,config=types.GenerateContentConfig(system_instruction=SYSTEM,max_output_tokens=2048))
    if not response.text: raise RuntimeError('Gemini returned no text')
    return {'answer':response.text,'mode':'Gemini · '+model}
