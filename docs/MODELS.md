# Model provenance and limitations

| Module | Source | Author-reported validation accuracy |
|---|---|---|
| Breed | https://huggingface.co/ujjwal75/indian-bovine-breeds-model | approximately 90% |
| Skin | https://github.com/harunkor/HerdHealthVision | 89.4% (934/1045) |
| Assistant | https://ai.google.dev/gemini-api/docs | not applicable |

Both classifier source projects list MIT licenses. Weights are downloaded, not redistributed. Breed card describes 40 breeds and CNN architecture; strict checkpoint compatibility is checked at runtime because the card is ambiguous about the architecture. Skin checkpoint uses timm EfficientNet-B2 and author-provided labels from the Hugging Face Space HARUNKOR/herd-health-vision. The source validation transform is RGB, resize 224x224, ImageNet normalization for both. Skin classes are FMD, healthy, LSD, mastitis; other diseases are outside scope and may be wrongly assigned to supported classes. A high score is not a clinical diagnosis. The source reports 91.3% LSD recall. Independent accuracy is unknown; model downloads were blocked by DNS in the build environment. The uncertainty thresholds are heuristics, not calibrated probabilities. No original training experiment or accuracy is claimed.

## Evaluation
Use independent, labelled, non-duplicate farm images arranged in subfolders named exactly as the downloaded classes. Run `python -m scripts.evaluate breed path/to/test_images --output breed-evaluation.json` and similarly for skin. Inspect per-class recall, balanced accuracy, confusion and errors; a small or incomplete sample cannot establish broad performance. The 80% target is a screening criterion, not a guaranteed result.
