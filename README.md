# ListeningProject

A real-time AI translator and transcriber built with React, Vite, and Google Gemini API.

## Features

- **Live Translator**: Real-time translation using Gemini Live API.
- **Transcriber**: Batch transcription for longer audio.
- **AI Assistant**: Context-aware AI assistant.
- **Offline Mode**: On-device transcription using Whisper (via Transformers.js).
- **Pocket Mode**: Lock screen overlay for background listening.
- **Background Listening**: Keeps audio session active when app is in background.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file with your Gemini API key:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```

4.  **Build for Production**:
    ```bash
    npm run build
    ```

## Deployment (Antigravity / Cloud Run)

This project includes a `Dockerfile` for containerized deployment.

1.  **Build Docker Image**:
    ```bash
    docker build -t listening-project .
    ```

2.  **Run Container**:
    ```bash
    docker run -p 3000:80 listening-project
    ```

## Offline Mode Note

The offline mode uses `transformers.js` which downloads models to the browser cache. The first run requires an internet connection to fetch the models (~40MB for Whisper Tiny).
