# Dashboard de Asistencia Massive Dynamic

Dashboard estático basado en [Tabler](https://tabler.io) para visualizar las checadas (registros de asistencia) de los empleados de Massive Dynamic.

## Estructura del Proyecto

```
dashboard/
├── index.html           # Dashboard general con KPIs, gráficas y tabla
├── app.js               # Lógica del dashboard general
├── analisis.js          # Motor de análisis (horas, retardos, indicadores)
├── theme.js             # Toggle Dark/Light con persistencia
├── charts-theme.js      # Helper para colores de gráficos según tema
├── empleado.html        # Vista detallada por empleado
├── empleado.js          # Lógica vista por empleado
├── sucursal.html        # Vista detallada por sucursal
├── sucursal.js          # Lógica vista por sucursal
├── data.json            # Datos de asistencia
├── Dockerfile           # Imagen Docker con nginx
├── docker-compose.yml   # Orquestación para VPS
├── .dockerignore        # Archivos excluidos del build
├── build.sh             # Script de build automatizado
└── README.md            # Este archivo
```

## Características

### Dashboard General (`/`)
- **16 KPIs**: Total registros, entradas, salidas, faltas, horas extra, empleados, sucursales, rango de fechas, promedio de puntualidad, asistencia, horas/día, riesgo, permisos, vacaciones, incapacidades, olvidos de checada.
- **12 Tarjetas de Tops y Alertas**: Empleado y sucursal con más faltas, más retardos, más horas extra, más puntual, más salidas anticipadas y mayor riesgo.
- **10 Gráficas**: Registros por día (área), distribución por sucursal (donut), eventos por tipo (barras), top 10 empleados, actividad por día de la semana, tendencia semanal, arquetipos (pie), motivos/incidencias, comparativa entre sucursales.
- **Tabla de indicadores**: Ranking de empleados con puntualidad, asistencia, índice de riesgo y etiqueta de indicador.
- **Tabla detallada**: Registros con paginación y filtros por sucursal, evento, empleado y fecha.

### Vista por Empleado (`/empleado.html`)
- Selector de empleado con información detallada e indicador.
- **12 KPIs individuales**: días laborados, promedio horas/día, total horas, retardos, faltas, permisos, vacaciones, incapacidades, horas extra, puntualidad, riesgo, asistencia.
- **6 Gráficas**: registros por día, eventos por tipo (donut), horas trabajadas por día, horario entrada vs salida, actividad por día de la semana, distribución radial de eventos.
- Tabla completa de registros del empleado.

### Vista por Sucursal (`/sucursal.html`)
- Comparativa general entre todas las sucursales desde el inicio.
- Selector de sucursal con **12 KPIs** propios.
- **6 Gráficas**: registros por día, eventos por tipo, comparativa entre empleados, distribución de arquetipos, actividad por día de la semana, tendencia de puntualidad.
- Tablas: empleados de la sucursal con indicadores, y registros detallados.

### Tema Dark/Light
- Botón de tema en todas las vistas (persistente en localStorage).
- Los gráficos se adaptan automáticamente al tema para evitar texto invisible.

## Requisitos

- Docker y Docker Compose (recomendado)
- O cualquier servidor web estático (Nginx, Apache, Caddy, Python, etc.)

## Deploy Rápido (Docker Compose)

### Opción 1: Script de Build Automático

```bash
cd dashboard
./build.sh
```

El script verifica archivos, Docker, construye la imagen y da instrucciones finales.

### Opción 2: Manual

```bash
cd dashboard

# Construir imagen
docker compose build --no-cache

# Iniciar contenedor
docker compose up -d
```

### Opción 3: Docker directo

```bash
cd dashboard
docker build -t massive-dynamic-dashboard:latest .
docker run -d --name massive-dynamic-dashboard -p 8080:80 massive-dynamic-dashboard:latest
```

## Acceso

Después del deploy, el dashboard estará disponible en:

```
http://TU_VPS_IP:8080
```

Rutas disponibles:
- `/` - Dashboard General
- `/empleado.html` - Vista por Empleado
- `/sucursal.html` - Vista por Sucursal

## Deploy en VPS (paso a paso)

1. **Comprimir la carpeta `dashboard/`:**

```bash
cd /ruta/al/proyecto
zip -r dashboard-deploy.zip dashboard/
```

2. **Subir al VPS:**

```bash
scp dashboard-deploy.zip usuario@vps-ip:/opt/
```

3. **En el VPS, descomprimir y deploy:**

```bash
ssh usuario@vps-ip
cd /opt
unzip dashboard-deploy.zip
cd dashboard

# Construir e iniciar
docker compose up -d --build

# Verificar que está corriendo
docker ps
```

4. **Configurar reverse proxy (opcional, para HTTPS):**

Si usas Nginx como reverse proxy:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Actualizar Datos

Cuando regeneres datos con `generate_attendance_data.py`:

```bash
# Copiar nuevos datos
cp attendance_data.json dashboard/data.json

# Reconstruir contenedor
cd dashboard
docker compose down
docker compose up -d --build
```

O simplemente copiar `data.json` dentro del contenedor corriendo:

```bash
docker cp data.json massive-dynamic-dashboard:/usr/share/nginx/html/data.json
```

## Variables de Entorno

El dashboard es 100% estático (frontend). No requiere variables de entorno ni base de datos.

## Notas

- El dashboard es 100% frontend (HTML/CSS/JS). No requiere backend ni base de datos.
- Los datos se cargan desde `data.json` mediante `fetch()` al abrir la página.
- Si necesitas autenticación, configúrala a nivel de servidor web (Nginx Basic Auth, etc.).
- Para producción con alto tráfico, considera usar Nginx directamente en lugar del servidor Python.
