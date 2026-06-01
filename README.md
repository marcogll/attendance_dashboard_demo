<p align="center">
  <img src="https://raw.githubusercontent.com/marcogll/mg_data_storage/refs/heads/main/soul23/logo/soul23_logo.svg" width="110" alt="Time & Attendance Dashboard">
</p>

<h1 align="center">Time & Attendance Dashboard</h1>

<p align="center">
  Sistema de control de asistencia con generacion de datos sinteticos, motor de analisis avanzado y dashboard visual interactivo.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3a3a3a?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/JavaScript-3a3a3a?style=flat-square&logo=javascript&logoColor=white" alt="JavaScript">
  <img src="https://img.shields.io/badge/Docker-3a3a3a?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Nginx-3a3a3a?style=flat-square&logo=nginx&logoColor=white" alt="Nginx">
  <img src="https://img.shields.io/badge/HTML5-3a3a3a?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
</p>

---

## Descripcion

Este proyecto simula un sistema real de control de asistencia basado en checadores NFC, generando datos realistas de 15 empleados distribuidos en 3 sucursales (Saltillo, Ramos Arizpe, Monterrey) con diferentes perfiles comportamentales (arquetipos), turnos rotativos y eventos de asistencia variados.

Incluye un dashboard analitico completo construido con Tabler que permite visualizar KPIs, tendencias, rankings de empleados, comparativas por sucursal y analisis de motivos de incidencias, con soporte para temas Dark/Light y diseno responsive.

## Arquitectura

```
attendance_dashboar_demo/
├── generate_attendance_data.py   # Generador de datos sinteticos (Python 3)
├── attendance_data.json           # Datos de asistencia (JSON)
├── attendance_data.csv            # Datos de asistencia (CSV)
├── attendance_data.ndjson         # Datos de asistencia (NDJSON)
└── dashboard/                     # Dashboard visual (HTML/CSS/JS)
    ├── index.html                 # Vista General
    ├── empleado.html              # Vista por Empleado
    ├── sucursal.html              # Vista por Sucursal
    ├── app.js                     # Logica Dashboard General
    ├── empleado.js                # Logica Vista por Empleado
    ├── sucursal.js                # Logica Vista por Sucursal
    ├── analisis.js                # Motor de analisis (horas, retardos, indicadores)
    ├── theme.js                   # Toggle Dark/Light
    ├── charts-theme.js            # Adaptacion de graficos al tema
    ├── data.json                  # Datos embebidos para el dashboard
    ├── Dockerfile                 # Imagen Docker (nginx)
    ├── docker-compose.yml         # Orquestacion Docker
    ├── nginx.conf                 # Configuracion nginx produccion
    ├── build.sh                   # Script de build automatizado
    └── README.md                  # Guia de deploy del dashboard
```

## Caracteristicas

### Generador de Datos (`generate_attendance_data.py`)

- 15 empleados con nombres reales mexicanos en 3 sucursales
- 8 arquetipos: puntual, impuntual, problemas personales, workaholic, normal, nuevo ingreso, supervisor, operador de produccion
- Turnos: Matutino (8am-5pm), Turno A (6am-2pm), Turno B (2pm-10pm), Turno C (10pm-6am)
- Eventos: Entradas, salidas, faltas, permisos, vacaciones, incapacidades, horas extra, olvido de entrada, olvido de salida, doble checada
- Logica realista: horarios por arquetipo, variaciones de puntualidad, cambios de turno, dias feriados MX 2025, descansos fin de semana
- Salida: JSON, CSV y NDJSON con alta calidad

### Motor de Analisis (`analisis.js`)

- Emparejamiento automatico de entrada/salida por dia
- Calculo de horas trabajadas reales
- Deteccion de retardos segun horario oficial de cada arquetipo/turno
- Calculo de % Puntualidad y % Asistencia
- Indice de Riesgo ponderado (0-100) por tipo de incidencia
- Clasificacion de indicadores: Excelente / Normal / Revisar / Critico
- Agrupacion por empleado, sucursal, semana y dia de la semana

### Dashboard Visual (`dashboard/`)

#### Vista General (`/`)

- 16 KPIs: Total registros, entradas, salidas, faltas, horas extra, empleados, sucursales, promedio de puntualidad, asistencia, horas/dia, riesgo, permisos, vacaciones, incapacidades, olvidos
- 12 Tarjetas de Tops y Alertas: Empleado/sucursal con mas faltas, mas retardos, mas horas extra, mas puntual, mas salidas anticipadas, mayor riesgo
- 10 Graficas interactivas (ApexCharts): Registros por dia, distribucion por sucursal, eventos por tipo, top 10 empleados, actividad por dia de la semana, tendencia semanal, arquetipos, motivos/incidencias, comparativa entre sucursales
- Tabla de indicadores: Ranking completo de empleados con metricas
- Tabla detallada: Registros con paginacion y filtros avanzados

#### Vista por Empleado (`/empleado.html`)

- Selector de empleado con perfil e indicador
- 12 KPIs individuales: dias laborados, promedio horas/dia, total horas, retardos, faltas, permisos, vacaciones, incapacidades, horas extra, puntualidad, riesgo, asistencia
- 6 Graficas: registros por dia, eventos por tipo, horas trabajadas, horario entrada vs salida, actividad por dia de semana, distribucion radial de eventos
- Tabla completa de registros del empleado

#### Vista por Sucursal (`/sucursal.html`)

- Comparativa general entre todas las sucursales
- Selector de sucursal con 12 KPIs
- 7 Graficas: registros por dia, eventos por tipo, comparativa empleados, arquetipos, actividad por dia de semana, tendencia de puntualidad
- Tablas: empleados de la sucursal con indicadores y registros detallados

### UI/UX

- Tema Dark/Light con persistencia en localStorage
- Graficos adaptativos al tema (sin texto invisible)
- Diseno responsive (desktop, tablet, mobile)
- Sidebar de navegacion unificada entre vistas
- Badges con semaforos de colores para metricas

## Tecnologias

**Generador de datos:** Python 3, CSV, JSON

**Dashboard UI:** HTML5, CSS3, Tabler

**Graficas:** ApexCharts

**Iconos:** Tabler Icons

**Motor de analisis:** Vanilla JavaScript

**Servidor:** Nginx (Alpine)

**Container:** Docker + Docker Compose

## Requisitos

- Python 3.8+ (solo para regenerar datos)
- Docker + Docker Compose (para deploy del dashboard)
- Navegador moderno con soporte ES6

## Uso Rapido

### 1. Generar datos (opcional)

```bash
python generate_attendance_data.py
```

Genera `attendance_data.json`, `.csv` y `.ndjson`.

### 2. Preparar dashboard

```bash
cp attendance_data.json dashboard/data.json
```

### 3. Deploy

```bash
cd dashboard

# Opcion A: Script automatico
./build.sh

# Opcion B: Docker Compose
docker compose up -d --build
```

### 4. Acceder

```
http://localhost:8080           -> Dashboard General
http://localhost:8080/empleado.html  -> Por Empleado
http://localhost:8080/sucursal.html  -> Por Sucursal
```

## Deploy en VPS

Desde tu maquina local:

```bash
zip -r dashboard-deploy.zip dashboard/
scp dashboard-deploy.zip usuario@vps-ip:/opt/
```

En el VPS:

```bash
ssh usuario@vps-ip
cd /opt && unzip dashboard-deploy.zip
cd dashboard
docker compose up -d --build
```

## Estructura de Datos

Cada registro de asistencia incluye:

```json
{
  "uuid": "...",
  "timestamp": 1735797900,
  "datetime_utc": "2025-01-02T06:05:00Z",
  "date": "2025-01-02",
  "num_empleado": "EMP014",
  "name": "Maria Lopez Hernandez",
  "branch": "Monterrey",
  "telegram_id": "1405126228",
  "uid_tarjeta": "DBDDE131CA",
  "event_type": "entrada",
  "device_name": "Checador_Monterrey_01",
  "status": "success",
  "arquetipo": "operador_produccion"
}
```

Eventos disponibles: `entrada`, `salida`, `falta`, `permiso`, `vacaciones`, `incapacidad`, `hora_extra`, `olvido_entrada`, `olvido_salida`, `doble_checada`.

## KPIs y Metricas Calculadas

**Horas trabajadas:** Diferencia real entre entrada y salida del mismo dia.

**Retardos:** Entradas despues del horario limite segun arquetipo.

**Puntualidad:** (Dias laborados - retardos) / Dias laborados * 100.

**Asistencia:** (Dias con registro - faltas) / Dias con registro * 100.

**Riesgo:** Indice ponderado: faltas*15 + retardos*5 + olvidos*8 + incapacidades*10.

**Indicador:** Clasificacion automatica: Excelente / Normal / Revisar / Critico.

## Autor

Marco G. — Sistema de control de asistencia Massive Dynamic

## Licencia

MIT
