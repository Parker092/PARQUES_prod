FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .

CMD ["./wait-for.sh", "db:5432", "--", "node", "src/index.js"]
