FROM node:22-alpine

WORKDIR /usr/src/app

# Instalar dependencias del sistema:
# - ffmpeg: para reproducción de audio / voz
# - tzdata: requerido en Alpine para que las zonas horarias (TZ) funcionen
# - fontconfig, ttf-dejavu, font-noto: requeridos para renderizar texto correctamente con @napi-rs/canvas
RUN apk add --no-cache ffmpeg tzdata fontconfig ttf-dejavu font-noto && \
    npm install -g pnpm

# Copiamos manifiestos de dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* .npmrc* ./

# Instalamos dependencias del proyecto
RUN pnpm install --ignore-scripts

# Copiamos el resto del código
COPY . .

# Registramos los comandos en Discord al arrancar y luego encendemos el bot
CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
