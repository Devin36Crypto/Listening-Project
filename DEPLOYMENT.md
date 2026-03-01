# Deployment Guide

ListeningProject is designed as a modern PWA (Progressive Web App).

## Docker Deployment

1. Build the image:
   ```bash
   docker build -t listening-project .
   ```

2. Run the container:
   ```bash
   docker run -d -p 8080:80 --name lp listening-project
   ```

## Production Considerations

- **HTTPS**: Required for microphone access and service workers.
- **API Security**: The API key is bundled in the build. For public deployment, use a backend proxy or restrictive API key settings in Google AI Studio.
- **Environment Variables**: Ensure `VITE_GEMINI_API_KEY` is set during the build process.

### Dockerfile

```dockerfile
# Build Stage
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
