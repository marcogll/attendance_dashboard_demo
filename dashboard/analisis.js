/**
 * analisis.js - Motor de análisis de asistencia Massive Dynamic
 */

// Horarios oficiales (hora límite para considerar puntual)
const HORARIOS = {
  normal: { entrada: '08:00', limiteRetraso: '08:05', salida: '17:00' },
  supervisor: { entrada: '07:30', limiteRetraso: '08:00', salida: '17:00' },
  operador_produccion: { entrada: '06:00', limiteRetraso: '06:05', salida: '14:00' }, // Turno A por defecto
  workaholic: { entrada: '08:00', limiteRetraso: '08:05', salida: '17:00' },
  puntual: { entrada: '08:00', limiteRetraso: '08:05', salida: '17:00' },
  impuntual: { entrada: '08:00', limiteRetraso: '08:05', salida: '17:00' },
  problemas_personales: { entrada: '08:00', limiteRetraso: '08:05', salida: '17:00' },
  normal2: { entrada: '08:00', limiteRetraso: '08:05', salida: '17:00' },
  nuevo_ingreso: { entrada: '08:00', limiteRetraso: '08:05', salida: '17:00' }
};

function getHorario(arquetipo) {
  return HORARIOS[arquetipo] || HORARIOS.normal;
}

function parseTime(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timeToStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
}

function isWeekend(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  return day === 0 || day === 6; // domingo o sábado
}

/**
 * Procesa todos los registros y devuelve análisis estructurado
 */
function analizarDatos(registros) {
  const porEmpleado = {};
  const porSucursal = {};
  const porFecha = {};
  const eventosGlobales = {};
  
  // Indexar
  registros.forEach(r => {
    // Por empleado
    if (!porEmpleado[r.num_empleado]) {
      porEmpleado[r.num_empleado] = {
        num_empleado: r.num_empleado,
        name: r.name,
        branch: r.branch,
        arquetipo: r.arquetipo,
        registros: [],
        dias: {}
      };
    }
    porEmpleado[r.num_empleado].registros.push(r);
    
    // Por sucursal
    if (!porSucursal[r.branch]) {
      porSucursal[r.branch] = { branch: r.branch, registros: [], empleados: new Set() };
    }
    porSucursal[r.branch].registros.push(r);
    porSucursal[r.branch].empleados.add(r.num_empleado);
    
    // Por fecha
    if (!porFecha[r.date]) porFecha[r.date] = [];
    porFecha[r.date].push(r);
    
    // Eventos globales
    eventosGlobales[r.event_type] = (eventosGlobales[r.event_type] || 0) + 1;
  });
  
  // Analizar cada empleado día por día
  Object.values(porEmpleado).forEach(emp => {
    const dias = {};
    emp.registros.forEach(r => {
      if (!dias[r.date]) {
        dias[r.date] = { date: r.date, registros: [], entrada: null, salida: null, eventos: [] };
      }
      dias[r.date].registros.push(r);
      if (r.event_type === 'entrada') dias[r.date].entrada = r;
      if (r.event_type === 'salida') dias[r.date].salida = r;
      if (!['entrada','salida'].includes(r.event_type)) {
        dias[r.date].eventos.push(r);
      }
    });
    emp.dias = dias;
    emp.analisis = analizarEmpleado(emp);
  });
  
  // Analizar sucursales
  Object.values(porSucursal).forEach(suc => {
    suc.analisis = analizarSucursal(suc);
  });
  
  return { porEmpleado, porSucursal, porFecha, eventosGlobales };
}

function analizarEmpleado(emp) {
  let totalDiasLaborados = 0;
  let totalHorasTrabajadas = 0;
  let retardos = 0;
  let faltas = 0;
  let vacaciones = 0;
  let permisos = 0;
  let incapacidades = 0;
  let horasExtra = 0;
  let olvidoEntrada = 0;
  let olvidoSalida = 0;
  let dobleChecada = 0;
  let entradas = [];
  let salidas = [];
  
  const horario = getHorario(emp.arquetipo);
  const limiteRetrasoMin = parseTime(horario.limiteRetraso);
  
  Object.values(emp.dias).forEach(dia => {
    // Eventos especiales
    dia.eventos.forEach(ev => {
      if (ev.event_type === 'falta') faltas++;
      if (ev.event_type === 'vacaciones') vacaciones++;
      if (ev.event_type === 'permiso') permisos++;
      if (ev.event_type === 'incapacidad') incapacidades++;
      if (ev.event_type === 'hora_extra') horasExtra++;
      if (ev.event_type === 'olvido_entrada') olvidoEntrada++;
      if (ev.event_type === 'olvido_salida') olvidoSalida++;
      if (ev.event_type === 'doble_checada') dobleChecada++;
    });
    
    // Si hay entrada y/o salida, contar como día laborado
    if (dia.entrada || dia.salida) {
      totalDiasLaborados++;
    }
    
    // Horas trabajadas
    if (dia.entrada && dia.salida) {
      const t1 = dia.entrada.timestamp;
      const t2 = dia.salida.timestamp;
      const horas = (t2 - t1) / 3600;
      if (horas > 0 && horas < 24) { // filtrar anomalías
        totalHorasTrabajadas += horas;
      }
    }
    
    // Retraso en entrada
    if (dia.entrada) {
      const dt = new Date(dia.entrada.timestamp * 1000);
      const minutos = dt.getUTCHours() * 60 + dt.getUTCMinutes();
      entradas.push(minutos);
      if (minutos > limiteRetrasoMin) {
        retardos++;
      }
    }
    
    // Salidas
    if (dia.salida) {
      const dt = new Date(dia.salida.timestamp * 1000);
      const minutos = dt.getUTCHours() * 60 + dt.getUTCMinutes();
      salidas.push(minutos);
    }
  });
  
  const promedioHoras = totalDiasLaborados > 0 ? totalHorasTrabajadas / totalDiasLaborados : 0;
  const diasConRegistro = Object.keys(emp.dias).length;
  const asistenciaRate = diasConRegistro > 0 ? ((diasConRegistro - faltas) / diasConRegistro * 100) : 0;
  const puntualidadRate = totalDiasLaborados > 0 ? ((totalDiasLaborados - retardos) / totalDiasLaborados * 100) : 0;
  
  // Puntaje de riesgo (0-100): más alto = más problemas
  const riesgo = Math.min(100, Math.round(
    (faltas * 15) + (retardos * 5) + (olvidoEntrada * 8) + (olvidoSalida * 3) + 
    (incapacidades * 10) + (permisos * 2)
  ));
  
  return {
    totalDiasLaborados,
    totalHorasTrabajadas: Math.round(totalHorasTrabajadas * 10) / 10,
    promedioHoras: Math.round(promedioHoras * 10) / 10,
    retardos,
    faltas,
    vacaciones,
    permisos,
    incapacidades,
    horasExtra,
    olvidoEntrada,
    olvidoSalida,
    dobleChecada,
    entradas,
    salidas,
    asistenciaRate: Math.round(asistenciaRate * 10) / 10,
    puntualidadRate: Math.round(puntualidadRate * 10) / 10,
    riesgo,
    indicador: calcularIndicador(riesgo, puntualidadRate, asistenciaRate)
  };
}

function calcularIndicador(riesgo, puntualidad, asistencia) {
  if (riesgo > 60 || asistencia < 70) return { label: 'Crítico', color: '#dc3545', bg: 'bg-danger' };
  if (riesgo > 35 || puntualidad < 75) return { label: 'Revisar', color: '#fd7e14', bg: 'bg-warning' };
  if (puntualidad > 95 && asistencia > 95) return { label: 'Excelente', color: '#20c997', bg: 'bg-success' };
  return { label: 'Normal', color: '#206bc4', bg: 'bg-primary' };
}

function analizarSucursal(suc) {
  let totalHoras = 0;
  let totalDias = 0;
  let retardos = 0;
  let faltas = 0;
  let horasExtra = 0;
  let entradas = 0;
  let salidas = 0;
  const eventos = {};
  
  suc.registros.forEach(r => {
    if (r.event_type === 'entrada') entradas++;
    if (r.event_type === 'salida') salidas++;
    if (r.event_type === 'falta') faltas++;
    if (r.event_type === 'hora_extra') horasExtra++;
    eventos[r.event_type] = (eventos[r.event_type] || 0) + 1;
  });
  
  const numEmpleados = suc.empleados.size;
  const promedioRegistros = numEmpleados > 0 ? Math.round(suc.registros.length / numEmpleados) : 0;
  
  return {
    numEmpleados,
    totalRegistros: suc.registros.length,
    promedioRegistros,
    faltas,
    horasExtra,
    entradas,
    salidas,
    eventos
  };
}

/**
 * Devuelve tendencia de asistencia por semana
 */
function tendenciaSemanal(porFecha) {
  const semanas = {};
  Object.keys(porFecha).sort().forEach(dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const year = d.getFullYear();
    const week = getWeekNumber(d);
    const key = `${year}-W${week}`;
    if (!semanas[key]) semanas[key] = { key, count: 0, faltas: 0, retardos: 0, fechas: [] };
    semanas[key].count += porFecha[dateStr].length;
    semanas[key].fechas.push(dateStr);
  });
  return Object.values(semanas);
}

function getWeekNumber(d) {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

/**
 * Top motivos / eventos
 */
function motivosRanking(eventosGlobales) {
  const motivos = [
    { key: 'falta', label: 'Faltas', peso: 1 },
    { key: 'permiso', label: 'Permisos', peso: 0.5 },
    { key: 'vacaciones', label: 'Vacaciones', peso: 0.3 },
    { key: 'incapacidad', label: 'Incapacidades', peso: 0.8 },
    { key: 'olvido_entrada', label: 'Olvido Entrada', peso: 0.6 },
    { key: 'olvido_salida', label: 'Olvido Salida', peso: 0.4 },
    { key: 'hora_extra', label: 'Horas Extra', peso: 0.2 },
    { key: 'doble_checada', label: 'Doble Checada', peso: 0.3 }
  ];
  
  return motivos.map(m => ({
    ...m,
    count: eventosGlobales[m.key] || 0,
    impacto: Math.round((eventosGlobales[m.key] || 0) * m.peso * 10) / 10
  })).sort((a, b) => b.count - a.count);
}

/**
 * Distribución de arquetipos
 */
function arquetipoStats(porEmpleado) {
  const stats = {};
  Object.values(porEmpleado).forEach(emp => {
    const a = emp.arquetipo;
    if (!stats[a]) stats[a] = { arquetipo: a, count: 0, empleados: [] };
    stats[a].count++;
    stats[a].empleados.push(emp.name);
  });
  return Object.values(stats);
}

/**
 * Comparativa sucursales
 */
function comparativaSucursales(porSucursal) {
  return Object.values(porSucursal).map(s => ({
    branch: s.branch,
    empleados: s.analisis.numEmpleados,
    registros: s.analisis.totalRegistros,
    promedio: s.analisis.promedioRegistros,
    faltas: s.analisis.faltas,
    horasExtra: s.analisis.horasExtra
  }));
}

// Exportar para uso global
window.Analisis = {
  analizarDatos,
  analizarEmpleado,
  analizarSucursal,
  tendenciaSemanal,
  motivosRanking,
  arquetipoStats,
  comparativaSucursales,
  getHorario,
  parseTime,
  timeToStr
};
