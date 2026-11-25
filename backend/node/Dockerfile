FROM node:22-slim
WORKDIR /srv
COPY backend/node/package*.json ./
RUN npm ci --omit=dev
COPY backend/node/src src
COPY db db
ENV DB_DIR=/srv/db
EXPOSE 4000
CMD ["node", "src/server.js"]
