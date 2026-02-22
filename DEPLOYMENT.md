# Deployment Guide for Antigravity

This project is container-ready and configured for deployment. Follow these steps to point Antigravity to your repository.

## 1. Export Source Code
Since you are currently in a temporary AI Studio sandbox, you first need to get the code into a permanent Git repository.

1.  **Download the Project**: Click the **Download** button in the AI Studio interface (usually in the top right or file menu) to save the source code to your computer.
2.  **Unzip** the downloaded file.

## 2. Create a Git Repository
1.  Go to your Git provider (e.g., GitHub, GitLab, or Google Cloud Source Repositories).
2.  Create a **new empty repository**.
3.  Open a terminal in your unzipped project folder and run:

```bash
git init
git add .
git commit -m "Initial commit - ListeningProject"
git branch -M main
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```

## 3. Configure Antigravity
Now that your code is in a repository, you can point Antigravity to it.

1.  Open **Antigravity** (or your deployment console).
2.  Select **"New Service"** or **"Create Deployment"**.
3.  Choose **"Deploy from Repository"** (or "Source").
4.  **Select the Repository** you just created.
5.  **Build Configuration**:
    *   **Type**: Docker / Container
    *   **Dockerfile Path**: `Dockerfile` (It is in the root directory)
    *   **Port**: `80` (The Dockerfile exposes port 80 via Nginx)

## 4. Environment Variables
In the Antigravity configuration settings, add the following environment variable:

*   `VITE_GEMINI_API_KEY`: Your Google Gemini API Key.

## 5. Deploy
Click **Deploy**. Antigravity will:
1.  Clone your repository.
2.  Build the Docker image using the provided `Dockerfile`.
3.  Deploy the application.

## Technical Details
*   **Build System**: Vite (builds to static files in `/dist`)
*   **Web Server**: Nginx (serves static files on port 80)
*   **Base Image**: `node:18-alpine` (build) -> `nginx:alpine` (runtime)
