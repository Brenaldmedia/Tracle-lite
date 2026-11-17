FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg git ca-certificates tar python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json index.js ./
ENV NODE_ENV=production
# Logins and the downloaded bot are kept here
VOLUME ["/app/sessions", "/app/.tracle"]
EXPOSE 5000
CMD ["node", "index.js"]
