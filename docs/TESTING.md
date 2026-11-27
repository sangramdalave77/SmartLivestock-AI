# Verification checklist

Automated: authentication, logout, login validation, per-user isolation, symptom ranking, history deletion, milk validation, invalid images, unavailable-model behavior and static routes. Run `python -m pytest -q`.

Manual checks after downloading models:
1. Create an account and sign in.
2. Upload a known cattle breed photograph and compare the returned top three labels to its verified breed.
3. Upload a suitable skin photograph; check real output labels. Do not use for diagnosis.
4. Select mouth blisters and drooling; confirm FMD symptom overlap appears.
5. Ask the assistant about feeding and check the generated Gemini response (requires configured API key and internet).
6. Record a milk yield, refresh, and confirm persistence.
7. Sign out and create another account; verify records are isolated.
8. Restart the app and confirm saved records remain.
9. Test image inference with network disabled after downloading models and setting HF_HUB_OFFLINE=1; Gemini requires internet.

No measured accuracy is claimed. For evaluation, use an independently labeled held-out dataset and report per-class metrics and limitations.
