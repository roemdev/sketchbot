#!/usr/bin/env bash
set -e

# Colores para la salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}        DESPLIEGUE / ACTUALIZACIÓN           ${NC}"
echo -e "${BLUE}               SKETCHBOT                      ${NC}"
echo -e "${BLUE}==============================================${NC}"

# Navegar al directorio raíz del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo -e "${YELLOW}==> Directorio de trabajo:${NC} $PROJECT_DIR"

# 1. Comprobar que existe config.json
if [ ! -f "config.json" ]; then
  echo -e "${RED}[ERROR] No se encontró el archivo 'config.json' en $PROJECT_DIR.${NC}"
  echo -e "Por favor, crea el archivo 'config.json' con tus tokens antes de desplegar."
  exit 1
fi

# 2. Asegurar que la base de datos sqlite no cause conflictos al hacer pull
if [ -f "data/database.sqlite" ]; then
  # Evita que cambios en la BD local bloqueen el git pull
  git update-index --skip-worktree data/database.sqlite 2>/dev/null || true
fi

# 3. Descargar cambios de GitHub
echo -e "${YELLOW}==> Obteniendo últimos cambios de GitHub (git pull origin main)...${NC}"
git pull origin main

# 4. Determinar comando de Docker Compose
if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  echo -e "${RED}[ERROR] No se encontró Docker Compose ('docker compose' ni 'docker-compose').${NC}"
  exit 1
fi

# 5. Reconstruir imagen e iniciar contenedores
echo -e "${YELLOW}==> Levantando contenedores con $COMPOSE_CMD...${NC}"
$COMPOSE_CMD up -d --build --remove-orphans

# 6. Limpieza de imágenes antiguas huérfanas
echo -e "${YELLOW}==> Limpiando imágenes Docker antiguas huérfanas...${NC}"
docker image prune -f

# 7. Comprobar estado de los servicios
echo -e "${GREEN}==> ¡Despliegue finalizado con éxito!${NC}"
echo -e "${BLUE}==> Estado de los contenedores:${NC}"
$COMPOSE_CMD ps

# 8. Mostrar últimas líneas de logs
echo -e "${BLUE}==> Últimos logs de Sketchbot:${NC}"
$COMPOSE_CMD logs --tail=30 sketchbot
