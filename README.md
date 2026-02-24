# AgenType

AgenType is a cross-platform desktop reply assistant. Use a global shortcut to capture the screen or read clipboard text, generate multi-style reply candidates with GPT, and copy or insert the response into the current input field.

## Features

- Global hotkey trigger (customizable)
- Screenshot capture → system OCR / vision flow
- Multi-slot reply styles (each slot has its own tone/language/length)
- Floating candidate panel with copy/insert
- History panel with recent replies
- Prompt template editable via local file

## Setup

```bash
npm install
npm run tauri dev
```

## Notes

- Screenshot capture uses the system tool and reads the clipboard image.
- System OCR uses macOS Vision (via Swift) and Windows OCR (via PowerShell + WinRT). Fallback to vision model is supported.
- OpenAI API key is stored locally via the Stronghold vault.

## Release

GitHub Actions will produce Windows and macOS bundles (unsigned for the first release).
