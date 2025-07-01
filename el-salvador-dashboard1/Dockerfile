FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

# Instala todas las dependencias.
RUN npm install --force

COPY . .

RUN npm run build

EXPOSE 3004

CMD ["npm", "start"]