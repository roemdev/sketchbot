FROM node:22-alpine
WORKDIR /usr/src/app

# Instala FFmpeg y también activa/instala pnpm globalmente en el contenedor
RUN apk add --no-cache ffmpeg && npm install -g pnpm

# Copiamos los archivos de dependencias de pnpm
COPY package.json pnpm-lock.yaml ./

# Instalamos las dependencias ignorando los scripts molestos que bloquean el build
RUN pnpm install --ignore-scripts

# Copiamos el resto del código
COPY . .

# Registramos los comandos en Discord al arrancar y luego encendemos el bot
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
