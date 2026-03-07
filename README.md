# ListeningProject

A real-time AI-powered translation and transcription application built with React, Vite, and the Google Gemini API.

## Features

- **Live Translator**: Real-time multi-language translation using Gemini Multimodal Live API.
- **Transcriber**: High-fidelity transcription with speaker identification.
- **AI Assistant**: Context-aware assistance with integrated search grounding.
- **Offline Mode**: Local speech recognition and translation using Xenova Transformers.
- **Pocket Mode**: Dimmed UI with lock protection for background listening.
- **Session History**: Local storage of transcription sessions via IndexedDB.

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: 
  - Google Gemini API (Multimodal Live, Flash, TTS)
  - Xenova Transformers (Whisper, NLLB)
- **Audio Handling**: Web Audio API (AudioWorklet, AnalyserNode)
- **Persistence**: IndexedDB

## Getting Started

1. Clone the repository.
2. Install dependencies: `npm install`
3. Create a `.env` file with your Gemini API key:
   ```
   VITE_GEMINI_API_KEY=your_api_key
   ```
4. Start the development server: `npm run dev`

## Deployment

Refer to [DEPLOYMENT.md](./DEPLOYMENT.md) for details on containerization and cloud deployment.
