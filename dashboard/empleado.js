/**
 * empleado.js - Vista detallada por empleado
 */

let allData = [];
let analysisResult = null;
let selectedEmpleado = null;

const eventTypeLabels = {
  entrada: 'Entrada', salida: 'Salida', falta: 'Falta', permiso: 'Permiso',
  vacaciones: 'Vacaciones', incapacidad: 'Incapacidad', hora_extra: 'Hora Extra',
  olvido_entrada: 'Olvido Entrada', olvido_salida: 'Olvido Salida', doble_checada: 'Doble Checada'
};
const eventTypeColors = {
  entrada: '#10b981', salida: '#3b82f6', falta: '#ef4444', permiso: '#f59e0b',
  vacaciones: '#8b5cf6', incapacidad: '#ec4899', hora_extra: '#f97316',
  olvido_entrada: '#eab308', olvido_salida: '#94a3b8', doble_checada: '#06b6d4'
};

function createChart(el, options) {
  if (!el) return null;
  const existing = el.querySelector('div');
  if (existing && existing._chart && typeof existing._chart.destroy === 'function') {
    existing._chart.destroy();
  }
  const themed = MDCharts.applyTheme(options);
  const chart = new ApexCharts(el, themed);
  chart.render();
  if (el.firstElementChild) el.firstElementChild._chart = chart;
  MDCharts.register(chart);
  return chart;
}

async function init() {
  try {
    const res = await fetch('data.json');
    allData = await res.json();
    allData.sort((a, b) => a.timestamp - b.timestamp);
    analysisResult = Analisis.analizarDatos(allData);
    populateSelector();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('afterbegin', `<div class="alert alert-danger m-3">Error: ${err.message}</div>`);
  }
}

function populateSelector() {
  const sel = document.getElementById('empleado-select');
  const emps = Object.values(analysisResult.porEmpleado)
    .sort((a, b) => a.name.localeCompare(b.name));
  emps.forEach(emp => {
    sel.add(new Option(`${emp.name} — ${emp.branch} (${emp.num_empleado})`, emp.num_empleado));
  });
  sel.addEventListener('change', e => {
    if (e.target.value) loadEmpleado(e.target.value);
  });
}

function loadEmpleado(numEmpleado) {
  selectedEmpleado = analysisResult.porEmpleado[numEmpleado];
  if (!selectedEmpleado) return;
  const emp = selectedEmpleado;
  const an = emp.analisis;

  document.getElementById('empleado-info').style.display = '';
  document.getElementById('kpi-empleado').style.display = '';
  document.getElementById('charts-empleado').style.display = '';
  document.getElementById('table-empleado').style.display = '';

  document.getElementById('emp-name').textContent = emp.name;
  document.getElementById('emp-meta').textContent = `${emp.num_empleado} · ${emp.branch} · ${emp.arquetipo.replace(/_/g, ' ')}`;
  const ind = an.indicador;
  const badge = document.getElementById('emp-indicador');
  badge.textContent = ind.label;
  badge.className = `badge ${ind.bg} fs-5 px-3 py-2`;

  document.getElementById('emp-kpi-dias').textContent = an.totalDiasLaborados;
  document.getElementById('emp-kpi-horas').textContent = an.promedioHoras + 'h';
  document.getElementById('emp-kpi-total-horas').textContent = Math.round(an.totalHorasTrabajadas) + 'h';
  document.getElementById('emp-kpi-retardos').textContent = an.retardos;
  document.getElementById('emp-kpi-faltas').textContent = an.faltas;
  document.getElementById('emp-kpi-permisos').textContent = an.permisos;
  document.getElementById('emp-kpi-vacaciones').textContent = an.vacaciones;
  document.getElementById('emp-kpi-incapacidades').textContent = an.incapacidades;
  document.getElementById('emp-kpi-hextra').textContent = an.horasExtra;
  document.getElementById('emp-kpi-puntualidad').textContent = an.puntualidadRate + '%';
  document.getElementById('emp-kpi-riesgo').textContent = an.riesgo;
  document.getElementById('emp-kpi-asistencia').textContent = an.asistenciaRate + '%';

  MDCharts.clear();
  renderEmpTimeline(emp);
  renderEmpEventos(emp);
  renderEmpHoras(emp);
  renderEmpHorario(emp);
  renderEmpWeekday(emp);
  renderEmpRadial(emp);
  renderEmpTable(emp);
}

function renderEmpTimeline(emp) {
  const byDate = {};
  emp.registros.forEach(r => { byDate[r.date] = (byDate[r.date] || 0) + 1; });
  const dates = Object.keys(byDate).sort();
  const series = dates.map(d => byDate[d]);

  const el = document.querySelector('#chart-emp-timeline');
  el.innerHTML = '';
  const options = {
    series: [{ name: 'Registros', data: series }],
    chart: { type: 'area', height: 280, toolbar: { show: false } },
    colors: ['#206bc4'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    xaxis: { categories: dates, labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false }
  };
  createChart(el, options);
}

function renderEmpEventos(emp) {
  const counts = {};
  emp.registros.forEach(r => { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });
  const labels = Object.keys(counts).map(k => eventTypeLabels[k] || k);
  const series = Object.values(counts);
  const colors = Object.keys(counts).map(k => eventTypeColors[k] || '#64748b');

  const el = document.querySelector('#chart-emp-eventos');
  el.innerHTML = '';
  const options = {
    series,
    chart: { type: 'donut', height: 280 },
    labels,
    colors,
    legend: { position: 'bottom', fontSize: '11px' }
  };
  createChart(el, options);
}

function renderEmpHoras(emp) {
  const dias = Object.values(emp.dias).sort((a, b) => a.date.localeCompare(b.date));
  const categories = [];
  const series = [];

  dias.forEach(dia => {
    if (dia.entrada && dia.salida) {
      const hrs = (dia.salida.timestamp - dia.entrada.timestamp) / 3600;
      if (hrs > 0 && hrs < 24) {
        categories.push(dia.date);
        series.push(Math.round(hrs * 10) / 10);
      }
    }
  });

  const el = document.querySelector('#chart-emp-horas');
  el.innerHTML = '';
  const options = {
    series: [{ name: 'Horas', data: series }],
    chart: { type: 'bar', height: 280, toolbar: { show: false } },
    colors: ['#10b981'],
    plotOptions: { bar: { borderRadius: 3, columnWidth: '60%' } },
    xaxis: { categories, labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: v => v + 'h' } },
    tooltip: { y: { formatter: v => v + ' hrs' } },
    dataLabels: { enabled: false }
  };
  createChart(el, options);
}

function renderEmpHorario(emp) {
  const dias = Object.values(emp.dias).sort((a, b) => a.date.localeCompare(b.date));
  const cats = [];
  const entradas = [];
  const salidas = [];

  dias.forEach(dia => {
    if (dia.entrada && dia.salida) {
      cats.push(dia.date);
      const e = new Date(dia.entrada.timestamp * 1000);
      const s = new Date(dia.salida.timestamp * 1000);
      entradas.push(e.getUTCHours() + e.getUTCMinutes()/60);
      salidas.push(s.getUTCHours() + s.getUTCMinutes()/60);
    }
  });

  const slice = -30;
  const catsSlice = cats.slice(slice);
  const entSlice = entradas.slice(slice);
  const salSlice = salidas.slice(slice);

  const el = document.querySelector('#chart-emp-horario');
  el.innerHTML = '';
  const options = {
    series: [
      { name: 'Entrada', data: entSlice },
      { name: 'Salida', data: salSlice }
    ],
    chart: { type: 'line', height: 280, toolbar: { show: false } },
    colors: ['#10b981', '#3b82f6'],
    stroke: { width: [3, 3], curve: 'smooth' },
    xaxis: { categories: catsSlice, labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: v => Math.round(v*10)/10 + 'h' }, min: 4 },
    legend: { position: 'bottom' }
  };
  createChart(el, options);
}

function renderEmpWeekday(emp) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const counts = [0,0,0,0,0,0,0];
  emp.registros.forEach(r => {
    const day = new Date(r.date + 'T00:00:00').getDay();
    counts[day]++;
  });

  const el = document.querySelector('#chart-emp-weekday');
  el.innerHTML = '';
  const options = {
    series: [{ name: 'Registros', data: counts }],
    chart: { type: 'bar', height: 280, toolbar: { show: false } },
    colors: ['#f59e0b'],
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    xaxis: { categories: days, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false }
  };
  createChart(el, options);
}

function renderEmpRadial(emp) {
  const counts = {};
  emp.registros.forEach(r => { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });
  const labels = Object.keys(counts).map(k => eventTypeLabels[k] || k);
  const series = Object.values(counts);

  const el = document.querySelector('#chart-emp-radial');
  el.innerHTML = '';
  const options = {
    series,
    chart: { type: 'polarArea', height: 280 },
    labels,
    stroke: { colors: ['#fff'] },
    fill: { opacity: 0.8 },
    colors: Object.keys(counts).map(k => eventTypeColors[k] || '#64748b'),
    legend: { position: 'bottom', fontSize: '11px' }
  };
  createChart(el, options);
}

function renderEmpTable(emp) {
  const tbody = document.getElementById('emp-table-body');
  tbody.innerHTML = '';
  const regs = [...emp.registros].sort((a, b) => b.timestamp - a.timestamp);
  regs.forEach(r => {
    const dt = new Date(r.timestamp * 1000);
    const fecha = dt.toLocaleDateString('es-MX');
    const hora = dt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const evLabel = eventTypeLabels[r.event_type] || r.event_type;
    const evColor = eventTypeColors[r.event_type] || '#64748b';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fecha}</td>
      <td>${hora}</td>
      <td><span class="badge" style="background-color:${evColor}; color:#fff">${evLabel}</span></td>
      <td>${r.device_name}</td>
      <td>${r.status === 'success' ? '<span class="badge bg-success">OK</span>' : '<span class="badge bg-warning">Adv</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Re-render charts on theme change
window.addEventListener('charts:themechanged', () => {
  if (selectedEmpleado) {
    loadEmpleado(selectedEmpleado.num_empleado);
  }
});

init();
