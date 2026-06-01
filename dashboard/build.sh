#!/usr/bin/env bash
set -e

echo "=========================================="
echo "  Massive Dynamic Dashboard - Build"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Step 1/4: Verificando archivos...${NC}"

REQUIRED_FILES=(
  "index.html"
  "app.js"
  "analisis.js"
  "theme.js"
  "charts-theme.js"
  "empleado.html"
  "empleado.js"
  "sucursal.html"
  "sucursal.js"
  "data.json"
  "Dockerfile"
  "docker-compose.yml"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo -e "${RED}Error: Falta archivo requerido: $file${NC}"
    exit 1
  fi
done

echo -e "${GREEN}Todos los archivos presentes${NC}"

echo -e "${YELLOW}Step 2/4: Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${RED}Error: Docker no está instalado${NC}"
  exit 1
fi
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  echo -e "${RED}Error: Docker Compose no está instalado${NC}"
  exit 1
fi

echo -e "${GREEN}Docker detectado${NC}"

echo -e "${YELLOW}Step 3/4: Construyendo imagen...${NC}"
if docker compose version &> /dev/null; then
  docker compose build --no-cache
else
  docker-compose build --no-cache
fi

echo -e "${GREEN}Imagen construida exitosamente${NC}"

echo -e "${YELLOW}Step 4/4: Verificando build...${NC}"
if docker images | grep -q "massive-dynamic-dashboard"; then
  echo -e "${GREEN}Build completado exitosamente!${NC}"
  echo ""
  echo -e "${GREEN}Para iniciar el contenedor:${NC}"
  echo "  docker compose up -d"
  echo ""
  echo -e "${GREEN}El dashboard estará disponible en:${NC}"
  echo "  http://localhost:8080"
else
  echo -e "${RED}Error: No se encontró la imagen construida${NC}"
  exit 1
fi

echo ""
echo "=========================================="
echo "  Build finalizado"
echo "=========================================="
