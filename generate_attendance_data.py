#!/usr/bin/env python3
"""
generate_attendance_data.py

Genera datos sintéticos de asistencia de empleados para pruebas de un sistema
de checador NFC. Produce archivos JSON, CSV y NDJSON con alta calidad y
aleatoriedad controlada.

Uso:
    python generate_attendance_data.py

Salida:
    attendance_data.json
    attendance_data.csv
    attendance_data.ndjson
"""

import csv
import json
import random
import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Dict, Any, Tuple, Optional

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

SEED: int = 42
START_DATE_STR: str = "2025-01-01"
END_DATE_STR: str = "2025-06-30"

# Turnos
NORMAL_START = time(8, 0)
NORMAL_END = time(17, 0)

SHIFT_A_START = time(6, 0)
SHIFT_A_END = time(14, 0)
SHIFT_B_START = time(14, 0)
SHIFT_B_END = time(22, 0)
SHIFT_C_START = time(22, 0)
SHIFT_C_END = time(6, 0)  # día siguiente

BRANCHES = ["Saltillo", "Ramos Arizpe", "Monterrey"]
DEVICES = {
    "Saltillo": "Checador_Saltillo_01",
    "Ramos Arizpe": "Checador_RamosArizpe_01",
    "Monterrey": "Checador_Monterrey_01",
}

# Nombres mexicanos (15 únicos)
MEXICAN_NAMES = [
    ("Juan", "Pérez García"),
    ("María", "López Hernández"),
    ("Carlos", "González Martínez"),
    ("Ana", "Sánchez Ruiz"),
    ("Luis", "Ramírez Flores"),
    ("Patricia", "Torres Castro"),
    ("José", "Rivera Morales"),
    ("Laura", "Ortiz Reyes"),
    ("Fernando", "Jiménez Cruz"),
    ("Diana", "Mendoza Aguilar"),
    ("Miguel", "Vargas Silva"),
    ("Isabel", "Ramos Peña"),
    ("Roberto", "Navarro León"),
    ("Carmen", "Estrada Bravo"),
    ("Alejandro", "Figueroa Campos"),
]

ARQUETIPOS = [
    "puntual",
    "impuntual",
    "problemas_personales",
    "workaholic",
    "normal",
    "nuevo_ingreso",
    "supervisor",
    "operador_produccion",
]

# Distribución de arquetipos (15 empleados)
# Nota: repetimos algunos arquetipos para llegar a 15
ARQUETIPO_DISTRIBUTION = [
    "puntual",
    "puntual",           # 2
    "impuntual",
    "impuntual",         # 2
    "problemas_personales",  # 1
    "workaholic",
    "workaholic",        # 2
    "normal",
    "normal",
    "normal",            # 3
    "nuevo_ingreso",     # 1
    "supervisor",
    "supervisor",        # 2
    "operador_produccion",
    "operador_produccion",  # 2
]

# Ruido controlado para evitar patrones repetitivos
def seeded_random(seed: int) -> random.Random:
    return random.Random(seed)

rng = seeded_random(SEED)

# =============================================================================
# MODELOS
# =============================================================================

class Empleado:
    def __init__(
        self,
        num_empleado: str,
        first_name: str,
        last_name: str,
        branch: str,
        telegram_id: str,
        uid_tarjeta: str,
        arquetipo: str,
    ):
        self.num_empleado = num_empleado
        self.first_name = first_name
        self.last_name = last_name
        self.branch = branch
        self.telegram_id = telegram_id
        self.uid_tarjeta = uid_tarjeta
        self.arquetipo = arquetipo
        self.start_work_date: Optional[date] = None
        self.shift_changes: List[Tuple[date, str]] = []

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"Empleado({self.num_empleado}, {self.name}, {self.arquetipo})"


class Registro:
    def __init__(
        self,
        timestamp: datetime,
        empleado: Empleado,
        event_type: str,
        device_name: str,
        status: str,
    ):
        self.uuid = uuid.UUID(int=rng.getrandbits(128))
        self.timestamp = timestamp
        self.empleado = empleado
        self.event_type = event_type
        self.device_name = device_name
        self.status = status

    def to_dict(self) -> Dict[str, Any]:
        dt_utc = self.timestamp.astimezone(timezone.utc)
        return {
            "uuid": str(self.uuid),
            "timestamp": int(self.timestamp.timestamp()),
            "datetime_utc": dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "date": self.timestamp.strftime("%Y-%m-%d"),
            "num_empleado": self.empleado.num_empleado,
            "name": self.empleado.name,
            "branch": self.empleado.branch,
            "telegram_id": self.empleado.telegram_id,
            "uid_tarjeta": self.empleado.uid_tarjeta,
            "event_type": self.event_type,
            "device_name": self.device_name,
            "status": self.status,
            "arquetipo": self.empleado.arquetipo,
        }


# =============================================================================
# GENERACIÓN DE EMPLEADOS
# =============================================================================

def generar_empleados() -> List[Empleado]:
    empleados: List[Empleado] = []
    nombres_disponibles = list(MEXICAN_NAMES)
    rng.shuffle(nombres_disponibles)

    arquetipos_disponibles = list(ARQUETIPO_DISTRIBUTION)
    rng.shuffle(arquetipos_disponibles)

    idx_nombre = 0
    idx_arquetipo = 0

    for branch in BRANCHES:
        for _ in range(5):
            first, last = nombres_disponibles[idx_nombre]
            idx_nombre += 1
            num = f"EMP{idx_nombre:03d}"
            # Generar telegram_id como string de 10 dígitos
            tel_id = str(rng.randint(1000000000, 9999999999))
            # Generar UID de tarjeta NFC (10 hex chars)
            uid = "".join(rng.choice("0123456789ABCDEF") for _ in range(10))
            arquetipo = arquetipos_disponibles[idx_arquetipo]
            idx_arquetipo += 1

            emp = Empleado(num, first, last, branch, tel_id, uid, arquetipo)
            empleados.append(emp)

    return empleados


# =============================================================================
# LÓGICA DE HORARIOS Y ARQUETIPOS
# =============================================================================

# Cache de días feriados en México 2025 (aproximados para el ejemplo)
FESTIVOS_MEX_2025 = {
    date(2025, 1, 1),   # Año Nuevo
    date(2025, 2, 3),   # Día de la Constitución (observado)
    date(2025, 3, 17),  # Natalicio de Benito Juárez (observado)
    date(2025, 5, 1),   # Día del Trabajo
    date(2025, 5, 5),   # Batalla de Puebla
    date(2025, 9, 16),  # Día de la Independencia
    date(2025, 11, 17), # Día de la Revolución (observado)
    date(2025, 12, 25), # Navidad
}


def es_dia_laboral(d: date, emp: Empleado) -> bool:
    # Supervisores ocasionalmente trabajan sábado o domingo (15% de probabilidad)
    if emp.arquetipo == "supervisor":
        if d.weekday() >= 5:
            return rng.random() < 0.15
    # Operadores de producción pueden tener turnos rotativos; para simplificar,
    # asumimos que también descansan domingos, pero algunos sábados laboran.
    if emp.arquetipo == "operador_produccion":
        if d.weekday() == 6:  # domingo
            return rng.random() < 0.10
        if d.weekday() == 5:  # sábado
            return rng.random() < 0.35
    else:
        if d.weekday() >= 5:
            return False
    if d in FESTIVOS_MEX_2025:
        return False
    return True


def horario_del_dia(emp: Empleado, d: date) -> Tuple[time, time]:
    """Devuelve (entrada, salida) para el empleado en la fecha dada."""
    if emp.arquetipo == "operador_produccion":
        # Buscar si hay un cambio de turno que aplique
        current_shift = "A"
        for change_date, shift in emp.shift_changes:
            if d >= change_date:
                current_shift = shift
        if current_shift == "A":
            return SHIFT_A_START, SHIFT_A_END
        elif current_shift == "B":
            return SHIFT_B_START, SHIFT_B_END
        else:
            return SHIFT_C_START, SHIFT_C_END
    elif emp.arquetipo == "supervisor":
        # Supervisores: entrada 07:30 - 08:00, salida 17:00 - 18:30
        return time(7, 30), time(17, 0)
    else:
        return NORMAL_START, NORMAL_END


def variacion_minutos(arquetipo: str, tipo: str) -> int:
    """
    Devuelve minutos de desviación respecto al horario oficial.
    tipo: 'entrada' o 'salida'.
    """
    if arquetipo == "puntual":
        if tipo == "entrada":
            return rng.randint(-10, 3)
        else:
            return rng.randint(-5, 5)

    elif arquetipo == "impuntual":
        if tipo == "entrada":
            return rng.randint(10, 45)
        else:
            return rng.randint(-10, 10)

    elif arquetipo == "problemas_personales":
        if tipo == "entrada":
            return rng.randint(5, 60)
        else:
            # Algunas salidas anticipadas
            if rng.random() < 0.20:
                return rng.randint(-120, -15)
            return rng.randint(-10, 10)

    elif arquetipo == "workaholic":
        if tipo == "entrada":
            return rng.randint(-60, -5)
        else:
            return rng.randint(30, 120)

    elif arquetipo == "normal":
        if tipo == "entrada":
            return rng.randint(-8, 12)
        else:
            return rng.randint(-10, 15)

    elif arquetipo == "nuevo_ingreso":
        # Más errático
        if tipo == "entrada":
            return rng.randint(-5, 30)
        else:
            return rng.randint(-15, 20)

    elif arquetipo == "supervisor":
        if tipo == "entrada":
            return rng.randint(-15, 5)
        else:
            return rng.randint(0, 90)

    elif arquetipo == "operador_produccion":
        if tipo == "entrada":
            return rng.randint(-10, 10)
        else:
            return rng.randint(-10, 10)

    return 0


# =============================================================================
# GENERACIÓN DE REGISTROS POR EMPLEADO
# =============================================================================

def generar_registros_empleado(emp: Empleado, start: date, end: date) -> List[Registro]:
    registros: List[Registro] = []

    # Configurar fecha de inicio para nuevos ingresos (mitad del período aprox)
    if emp.arquetipo == "nuevo_ingreso":
        total_days = (end - start).days + 1
        mitad = start + timedelta(days=total_days // 2 + rng.randint(-15, 15))
        emp.start_work_date = mitad

    # Configurar cambios de turno para operadores
    if emp.arquetipo == "operador_produccion":
        # Al menos un cambio de turno durante el período
        num_cambios = rng.randint(1, 3)
        fechas_cambio = []
        for _ in range(num_cambios):
            delta = rng.randint(10, 160)
            fecha_cambio = start + timedelta(days=delta)
            if fecha_cambio <= end:
                fechas_cambio.append(fecha_cambio)
        fechas_cambio.sort()
        turnos = ["A", "B", "C"]
        turno_actual = "A"
        for fc in fechas_cambio:
            # Elegir un turno diferente
            opciones = [t for t in turnos if t != turno_actual]
            turno_actual = rng.choice(opciones)
            emp.shift_changes.append((fc, turno_actual))

    # Generar días
    current = start
    while current <= end:
        # Si es nuevo ingreso y aún no empieza, saltar
        if emp.start_work_date and current < emp.start_work_date:
            current += timedelta(days=1)
            continue

        # Determinar si labora
        if not es_dia_laboral(current, emp):
            current += timedelta(days=1)
            continue

        # Decidir evento del día
        # Probabilidades base de eventos especiales
        prob_falta = 0.0
        prob_vacaciones = 0.0
        prob_incapacidad = 0.0
        prob_permiso = 0.0
        prob_olvido_entrada = 0.0
        prob_olvido_salida = 0.0
        prob_doble_checada = 0.0
        prob_hora_extra = 0.0

        if emp.arquetipo == "impuntual":
            prob_falta = 0.04
            prob_olvido_entrada = 0.03
            prob_olvido_salida = 0.02
        elif emp.arquetipo == "problemas_personales":
            prob_falta = 0.08
            prob_vacaciones = 0.02
            prob_incapacidad = 0.03
            prob_permiso = 0.03
            prob_olvido_entrada = 0.05
            prob_olvido_salida = 0.04
        elif emp.arquetipo == "normal":
            prob_falta = 0.015
            prob_vacaciones = 0.01
            prob_permiso = 0.01
            prob_olvido_entrada = 0.01
        elif emp.arquetipo == "puntual":
            prob_falta = 0.005
            prob_vacaciones = 0.015
            prob_permiso = 0.005
        elif emp.arquetipo == "workaholic":
            prob_hora_extra = 0.25
            prob_falta = 0.005
        elif emp.arquetipo == "supervisor":
            prob_falta = 0.01
            prob_permiso = 0.02
            prob_hora_extra = 0.15
        elif emp.arquetipo == "nuevo_ingreso":
            prob_falta = 0.02
            prob_olvido_entrada = 0.06
            prob_olvido_salida = 0.04
            prob_doble_checada = 0.03
        elif emp.arquetipo == "operador_produccion":
            prob_falta = 0.03
            prob_permiso = 0.02

        # Determinar evento
        r = rng.random()
        evento_especial = None

        # Vacaciones: bloques de 1-5 días (muy simplificado, solo marcamos el día)
        # Para un modelo más realista, marcaríamos bloques; aquí por simplicidad día a día
        if r < prob_vacaciones:
            evento_especial = "vacaciones"
        elif r < prob_vacaciones + prob_incapacidad:
            evento_especial = "incapacidad"
        elif r < prob_vacaciones + prob_incapacidad + prob_permiso:
            evento_especial = "permiso"
        elif r < prob_vacaciones + prob_incapacidad + prob_permiso + prob_falta:
            evento_especial = "falta"

        # Crear registro de evento especial si aplica
        if evento_especial:
            dt = datetime.combine(current, NORMAL_START).replace(tzinfo=timezone.utc)
            registros.append(
                Registro(
                    timestamp=dt,
                    empleado=emp,
                    event_type=evento_especial,
                    device_name=DEVICES[emp.branch],
                    status="success",
                )
            )
            current += timedelta(days=1)
            continue

        # Horario del día
        entrada_oficial, salida_oficial = horario_del_dia(emp, current)

        # Variaciones
        var_entrada = variacion_minutos(emp.arquetipo, "entrada")
        var_salida = variacion_minutos(emp.arquetipo, "salida")

        # Hora extra (sobreescribe salida)
        if rng.random() < prob_hora_extra:
            var_salida += rng.randint(60, 180)

        # Calcular horas reales (aware UTC)
        entrada_dt = datetime.combine(current, entrada_oficial).replace(tzinfo=timezone.utc) + timedelta(minutes=var_entrada)
        salida_dt = datetime.combine(current, salida_oficial).replace(tzinfo=timezone.utc) + timedelta(minutes=var_salida)

        # Si el turno C cruza medianoche
        if salida_oficial == SHIFT_C_END and entrada_oficial == SHIFT_C_START:
            salida_dt += timedelta(days=1)

        # Olvido de entrada
        if rng.random() < prob_olvido_entrada:
            # No se registra entrada, solo salida
            registros.append(
                Registro(
                    timestamp=salida_dt,
                    empleado=emp,
                    event_type="olvido_entrada",
                    device_name=DEVICES[emp.branch],
                    status="warning",
                )
            )
        else:
            registros.append(
                Registro(
                    timestamp=entrada_dt,
                    empleado=emp,
                    event_type="entrada",
                    device_name=DEVICES[emp.branch],
                    status="success",
                )
            )

            # Doble checada (entrada extra)
            if rng.random() < prob_doble_checada:
                extra_dt = entrada_dt + timedelta(minutes=rng.randint(1, 5))
                registros.append(
                    Registro(
                        timestamp=extra_dt,
                        empleado=emp,
                        event_type="doble_checada",
                        device_name=DEVICES[emp.branch],
                        status="warning",
                    )
                )

        # Determinar si es hora extra
        es_hora_extra = rng.random() < prob_hora_extra
        if es_hora_extra:
            var_salida += rng.randint(60, 180)
            salida_dt = datetime.combine(current, salida_oficial).replace(tzinfo=timezone.utc) + timedelta(minutes=var_salida)
            if salida_oficial == SHIFT_C_END and entrada_oficial == SHIFT_C_START:
                salida_dt += timedelta(days=1)

        # Olvido de salida
        if rng.random() < prob_olvido_salida:
            # No se registra salida, solo entrada (ya registrada arriba)
            registros.append(
                Registro(
                    timestamp=salida_dt,
                    empleado=emp,
                    event_type="olvido_salida",
                    device_name=DEVICES[emp.branch],
                    status="warning",
                )
            )
        else:
            # Evitar que salida sea antes de entrada (casos borde)
            if salida_dt < entrada_dt:
                salida_dt = entrada_dt + timedelta(hours=8)
            registros.append(
                Registro(
                    timestamp=salida_dt,
                    empleado=emp,
                    event_type="salida",
                    device_name=DEVICES[emp.branch],
                    status="success",
                )
            )
            # Evento especial hora_extra (adicional a la salida)
            if es_hora_extra:
                registros.append(
                    Registro(
                        timestamp=salida_dt,
                        empleado=emp,
                        event_type="hora_extra",
                        device_name=DEVICES[emp.branch],
                        status="success",
                    )
                )

        current += timedelta(days=1)

    return registros


# =============================================================================
# GENERACIÓN GLOBAL
# =============================================================================

def generar_todo(start_str: str, end_str: str) -> Tuple[List[Registro], List[Empleado]]:
    start = datetime.strptime(start_str, "%Y-%m-%d").date()
    end = datetime.strptime(end_str, "%Y-%m-%d").date()

    empleados = generar_empleados()
    todos_registros: List[Registro] = []

    for emp in empleados:
        regs = generar_registros_empleado(emp, start, end)
        todos_registros.extend(regs)

    # Ordenar globalmente por fecha/hora
    todos_registros.sort(key=lambda r: r.timestamp)

    return todos_registros, empleados


# =============================================================================
# ESCRITURA DE ARCHIVOS
# =============================================================================

def escribir_json(regs: List[Registro], filename: str) -> None:
    data = [r.to_dict() for r in regs]
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def escribir_csv(regs: List[Registro], filename: str) -> None:
    if not regs:
        return
    fieldnames = list(regs[0].to_dict().keys())
    with open(filename, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in regs:
            writer.writerow(r.to_dict())


def escribir_ndjson(regs: List[Registro], filename: str) -> None:
    with open(filename, "w", encoding="utf-8") as f:
        for r in regs:
            f.write(json.dumps(r.to_dict(), ensure_ascii=False) + "\n")


# =============================================================================
# ESTADÍSTICAS
# =============================================================================

def mostrar_estadisticas(regs: List[Registro], empleados: List[Empleado]) -> None:
    total = len(regs)
    por_sucursal: Dict[str, int] = {}
    por_empleado: Dict[str, int] = {}
    retardos = 0
    faltas = 0
    horas_extra = 0
    vacaciones = 0
    incapacidades = 0

    for r in regs:
        branch = r.empleado.branch
        num = r.empleado.num_empleado
        por_sucursal[branch] = por_sucursal.get(branch, 0) + 1
        por_empleado[num] = por_empleado.get(num, 0) + 1

        et = r.event_type
        if et == "falta":
            faltas += 1
        elif et == "vacaciones":
            vacaciones += 1
        elif et == "incapacidad":
            incapacidades += 1
        elif et == "entrada":
            # Retraso: consideramos después de 08:05 (o equivalente según turno)
            entrada_oficial, _ = horario_del_dia(r.empleado, r.timestamp.date())
            limite = datetime.combine(r.timestamp.date(), entrada_oficial).replace(tzinfo=timezone.utc) + timedelta(minutes=5)
            # Ajuste para turno C que cruza medianoche: el registro ya tiene la fecha correcta
            if r.timestamp > limite:
                retardos += 1
        elif et == "salida":
            # Horas extra detectadas si sale después del horario + 30 min
            _, salida_oficial = horario_del_dia(r.empleado, r.timestamp.date())
            # Para turno C la salida oficial es 06:00 del día siguiente,
            # pero en la lógica actual salida_dt se calcula sobre current date.
            # Simplificación: si la diferencia con salida_oficial > 30 min
            base = datetime.combine(r.timestamp.date(), salida_oficial).replace(tzinfo=timezone.utc)
            if salida_oficial == time(6, 0) and r.timestamp.hour < 12:
                # Podría ser turno C del día anterior; simplificamos
                pass
            if (r.timestamp - base).total_seconds() > 30 * 60:
                horas_extra += 1
        elif et == "hora_extra":
            horas_extra += 1

    print("=" * 60)
    print("ESTADÍSTICAS DE GENERACIÓN")
    print("=" * 60)
    print(f"Total de registros generados : {total}")
    print("")
    print("Por sucursal:")
    for b in BRANCHES:
        print(f"  {b:<20} : {por_sucursal.get(b, 0)}")
    print("")
    print("Por empleado:")
    for emp in empleados:
        print(f"  {emp.num_empleado} {emp.name:<25} : {por_empleado.get(emp.num_empleado, 0)}")
    print("")
    print("Indicadores:")
    print(f"  Retardos detectados        : {retardos}")
    print(f"  Faltas                     : {faltas}")
    print(f"  Horas extra                : {horas_extra}")
    print(f"  Vacaciones                 : {vacaciones}")
    print(f"  Incapacidades              : {incapacidades}")
    print("=" * 60)


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    print("Generando datos de asistencia NFC...")
    regs, empleados = generar_todo(START_DATE_STR, END_DATE_STR)

    print(f"Registros generados: {len(regs)}")

    escribir_json(regs, "attendance_data.json")
    print("-> attendance_data.json")

    escribir_csv(regs, "attendance_data.csv")
    print("-> attendance_data.csv")

    escribir_ndjson(regs, "attendance_data.ndjson")
    print("-> attendance_data.ndjson")

    mostrar_estadisticas(regs, empleados)

    print("Hecho.")


if __name__ == "__main__":
    main()
