# Mobile UI revision

The supplied references inform the dark burgundy, cream panels, editorial serif
headings, fine borders and arched image frames. Existing AI illustrations and
their attribution are retained. No patient photos or new external assets added.

The Indonesian home page opens a separate screening surface at `#check`.
The four steps are pulse, cough, questionnaire and result. Fixed bottom actions,
single-column fields and native yes/no radios support touch use. Returning to
earlier steps preserves answers within the page session. Leaving capture stops
camera/microphone resources. Scores are disclosed in expandable result details.

Run `powershell -ExecutionPolicy Bypass -File .\prototype\start.ps1 -UiOnly`.
In the screening view, expand **Mode pratinjau UI** for fictional examples of
pulse, denied permission, weak signal, audio, empty recording, questionnaire,
positive and negative results. These examples never call the model API. Both the
screen and downloaded summaries identify simulated data. Exit simulation to
return to real acquisition. Normal model mode does not expose preview examples.

Validation: `node prototype/tests/ui_mobile.cjs` against the UI-only server.
It checks 320/390/768/1440px layouts, navigation, validation, answer retention,
simulated states, downloads and reset. It separately stubs the model API to
check manual pulse, synthetic WAV upload, the two-stage request contract and
nine numeric clinical fields. This does not establish real-model accuracy,
physical-phone camera accuracy or Safari behavior. Images are written to the
ignored `prototype/test-results/mobile-redesign/` directory.

The older `design.cjs` and `e2e.cjs` describe the previous English three-step UI;
use `ui_mobile.cjs` for the revised interface. Backend checks remain separate.
No research source, fitted model, calibration or decision threshold was changed.
