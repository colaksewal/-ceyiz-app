# Geliştirme ortamı için: Vite dev server'ı container içinde çalıştırır.
# Aşama 8'de production build (nginx ile serve edilen statik dosyalar) ayrı
# bir Dockerfile.prod olarak eklenecek.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev"]
