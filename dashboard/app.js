/**
 * app.js - Dashboard General Massive Dynamic
 */

let allData = [];
let filteredData = [];
let currentPage = 1;
const pageSize = 50;
let analysisResult = null;

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
    allData.sort((a, b) => b.timestamp - a.timestamp);
    filteredData = [...allData];
    analysisResult = Analisis.analizarDatos(allData);

    populateFilters();
    updateKPIs(allData);
    renderTopCards();
    renderCharts(allData);
    renderIndicadores();
    renderTable();
  } catch (err) {
    console.error('Error cargando datos:', err);
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="alert alert-danger m-3">Error cargando data.json: ${err.message}</div>
    `);
  }
}

function updateKPIs(data) {
  const total = data.length;
  const entradas = data.filter(d => d.event_type === 'entrada').length;
  const salidas = data.filter(d => d.event_type === 'salida').length;
  const faltas = data.filter(d => d.event_type === 'falta').length;
  const hextra = data.filter(d => d.event_type === 'hora_extra').length;
  const empleados = new Set(data.map(d => d.num_empleado)).size;
  const sucursales = new Set(data.map(d => d.branch)).size;
  const permisos = data.filter(d => d.event_type === 'permiso').length;
  const vacaciones = data.filter(d => d.event_type === 'vacaciones').length;
  const incapacidades = data.filter(d => d.event_type === 'incapacidad').length;
  const olvido = data.filter(d => d.event_type === 'olvido_entrada' || d.event_type === 'olvido_salida').length;
  const dates = data.map(d => d.date).sort();
  const rango = dates.length ? `${dates[0]} al ${dates[dates.length - 1]}` : '-';

  document.getElementById('kpi-total').textContent = total.toLocaleString('es-MX');
  document.getElementById('kpi-entradas').textContent = entradas.toLocaleString('es-MX');
  document.getElementById('kpi-salidas').textContent = salidas.toLocaleString('es-MX');
  document.getElementById('kpi-faltas').textContent = faltas.toLocaleString('es-MX');
  document.getElementById('kpi-hextra').textContent = hextra.toLocaleString('es-MX');
  document.getElementById('kpi-empleados').textContent = empleados;
  document.getElementById('kpi-sucursales').textContent = sucursales;
  document.getElementById('kpi-rango').textContent = rango;
  document.getElementById('kpi-permisos').textContent = permisos;
  document.getElementById('kpi-vacaciones').textContent = vacaciones;
  document.getElementById('kpi-incapacidades').textContent = incapacidades;
  document.getElementById('kpi-olvido').textContent = olvido;

  if (analysisResult) {
    const emps = Object.values(analysisResult.porEmpleado);
    const avgPunt = emps.length ? Math.round(emps.reduce((a, e) => a + e.analisis.puntualidadRate, 0) / emps.length * 10) / 10 : 0;
    const avgAsis = emps.length ? Math.round(emps.reduce((a, e) => a + e.analisis.asistenciaRate, 0) / emps.length * 10) / 10 : 0;
    const avgHoras = emps.length ? Math.round(emps.reduce((a, e) => a + e.analisis.promedioHoras, 0) / emps.length * 10) / 10 : 0;
    const avgRiesgo = emps.length ? Math.round(emps.reduce((a, e) => a + e.analisis.riesgo, 0) / emps.length) : 0;

    document.getElementById('kpi-prom-puntualidad').textContent = avgPunt + '%';
    document.getElementById('kpi-prom-asistencia').textContent = avgAsis + '%';
    document.getElementById('kpi-prom-horas').textContent = avgHoras + 'h';
    document.getElementById('kpi-prom-riesgo').textContent = avgRiesgo;
  }
}

function setTop(prefix, name, value, suffix) {
  const nEl = document.getElementById(prefix + '-name');
  const vEl = document.getElementById(prefix + '-val');
  if (nEl) nEl.textContent = name || '-';
  if (vEl) vEl.textContent = (value !== undefined ? value : '0') + ' ' + suffix;
}

function renderTopCards() {
  if (!analysisResult) return;
  const emps = Object.values(analysisResult.porEmpleado);
  const sucs = Object.values(analysisResult.porSucursal);
  if (!emps.length) return;

  // Empleados
  const topEmpFaltas = emps.reduce((a, b) => a.analisis.faltas > b.analisis.faltas ? a : b);
  const topEmpRet = emps.reduce((a, b) => a.analisis.retardos > b.analisis.retardos ? a : b);
  const topEmpHex = emps.reduce((a, b) => a.analisis.horasExtra > b.analisis.horasExtra ? a : b);
  const activeEmps = emps.filter(e => e.analisis.totalDiasLaborados > 0);
  const topEmpPunt = activeEmps.length ? activeEmps.reduce((a, b) => a.analisis.puntualidadRate > b.analisis.puntualidadRate ? a : b) : emps[0];
  const topEmpSal = emps.reduce((a, b) => a.analisis.olvidoSalida > b.analisis.olvidoSalida ? a : b);
  const topEmpRies = emps.reduce((a, b) => a.analisis.riesgo > b.analisis.riesgo ? a : b);

  setTop('top-emp-faltas', topEmpFaltas.name, topEmpFaltas.analisis.faltas, 'faltas');
  setTop('top-emp-ret', topEmpRet.name, topEmpRet.analisis.retardos, 'retardos');
  setTop('top-emp-hextra', topEmpHex.name, topEmpHex.analisis.horasExtra, 'h.extra');
  setTop('top-emp-punt', topEmpPunt.name, topEmpPunt.analisis.puntualidadRate + '%', 'punt.');
  setTop('top-emp-salant', topEmpSal.name, topEmpSal.analisis.olvidoSalida, 'olvidos');
  setTop('top-emp-riesgo', topEmpRies.name, topEmpRies.analisis.riesgo, 'riesgo');

  // Sucursales (agregar por empleado)
  const sucStats = {};
  sucs.forEach(s => {
    const ems = emps.filter(e => e.branch === s.branch);
    sucStats[s.branch] = {
      faltas: ems.reduce((a, e) => a + e.analisis.faltas, 0),
      retardos: ems.reduce((a, e) => a + e.analisis.retardos, 0),
      horasExtra: ems.reduce((a, e) => a + e.analisis.horasExtra, 0),
      olvidoSalida: ems.reduce((a, e) => a + e.analisis.olvidoSalida, 0),
      riesgo: ems.length ? Math.round(ems.reduce((a, e) => a + e.analisis.riesgo, 0) / ems.length) : 0,
      puntualidad: ems.length ? Math.round(ems.reduce((a, e) => a + e.analisis.puntualidadRate, 0) / ems.length * 10) / 10 : 0
    };
  });

  const topSucFaltas = Object.entries(sucStats).reduce((a, b) => a[1].faltas > b[1].faltas ? a : b);
  const topSucRet = Object.entries(sucStats).reduce((a, b) => a[1].retardos > b[1].retardos ? a : b);
  const topSucHex = Object.entries(sucStats).reduce((a, b) => a[1].horasExtra > b[1].horasExtra ? a : b);
  const topSucPunt = Object.entries(sucStats).reduce((a, b) => a[1].puntualidad > b[1].puntualidad ? a : b);
  const topSucSal = Object.entries(sucStats).reduce((a, b) => a[1].olvidoSalida > b[1].olvidoSalida ? a : b);
  const topSucRies = Object.entries(sucStats).reduce((a, b) => a[1].riesgo > b[1].riesgo ? a : b);

  setTop('top-suc-faltas', topSucFaltas[0], topSucFaltas[1].faltas, 'faltas');
  setTop('top-suc-ret', topSucRet[0], topSucRet[1].retardos, 'retardos');
  setTop('top-suc-hextra', topSucHex[0], topSucHex[1].horasExtra, 'h.extra');
  setTop('top-suc-punt', topSucPunt[0], topSucPunt[1].puntualidad + '%', 'punt.');
  setTop('top-suc-salant', topSucSal[0], topSucSal[1].olvidoSalida, 'olvidos');
  setTop('top-suc-riesgo', topSucRies[0], topSucRies[1].riesgo, 'riesgo');
}

function groupBy(arr, key) {
  const map = {};
  arr.forEach(item => { map[item[key]] = (map[item[key]] || 0) + 1; });
  return map;
}

function renderCharts(data) {
  MDCharts.clear();
  renderTimelineChart(data);
  renderSucursalChart(data);
  renderEventosChart(data);
  renderTopEmpleadosChart(data);
  renderWeekdayChart(data);
  renderWeeklyTrendChart(data);
  renderArquetiposChart();
  renderMotivosChart();
  renderComparativaChart();
}

function renderTimelineChart(data) {
  const byDate = {};
  data.forEach(d => { byDate[d.date] = (byDate[d.date] || 0) + 1; });
  const sortedDates = Object.keys(byDate).sort();
  const series = sortedDates.map(date => byDate[date]);

  const options = {
    series: [{ name: 'Registros', data: series }],
    chart: { type: 'area', height: 320, toolbar: { show: false }, animations: { enabled: true } },
    colors: ['#206bc4'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1, stops: [0, 100] } },
    xaxis: { categories: sortedDates, labels: { rotate: -45, style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    tooltip: { y: { formatter: v => v + ' registros' } }
  };
  createChart(document.querySelector('#chart-timeline'), options);
}

function renderSucursalChart(data) {
  const counts = groupBy(data, 'branch');
  const labels = Object.keys(counts);
  const series = Object.values(counts);

  const options = {
    series,
    chart: { type: 'donut', height: 320 },
    labels,
    colors: ['#206bc4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    legend: { position: 'bottom' },
    plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: 'Total', formatter: w => w.globals.seriesTotals.reduce((a,b)=>a+b,0) } } } } }
  };
  createChart(document.querySelector('#chart-sucursal'), options);
}

function renderEventosChart(data) {
  const counts = groupBy(data, 'event_type');
  const labels = Object.keys(counts).map(k => eventTypeLabels[k] || k);
  const series = Object.values(counts);
  const colors = Object.keys(counts).map(k => eventTypeColors[k] || '#64748b');

  const options = {
    series: [{ name: 'Registros', data: series }],
    chart: { type: 'bar', height: 320, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: false, columnWidth: '55%' } },
    colors,
    xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false }
  };
  createChart(document.querySelector('#chart-eventos'), options);
}

function renderTopEmpleadosChart(data) {
  const counts = {};
  data.forEach(d => { counts[d.name] = (counts[d.name] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const labels = sorted.map(([name]) => name);
  const series = sorted.map(([, count]) => count);

  const options = {
    series: [{ name: 'Registros', data: series }],
    chart: { type: 'bar', height: 320, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    colors: ['#206bc4'],
    xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    dataLabels: { enabled: false }
  };
  createChart(document.querySelector('#chart-top-emp'), options);
}

function renderWeekdayChart(data) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const counts = [0,0,0,0,0,0,0];
  data.forEach(d => {
    const day = new Date(d.date + 'T00:00:00').getDay();
    counts[day]++;
  });

  const options = {
    series: [{ name: 'Registros', data: counts }],
    chart: { type: 'bar', height: 300, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
    colors: ['#206bc4'],
    xaxis: { categories: days, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false }
  };
  createChart(document.querySelector('#chart-weekday'), options);
}

function renderWeeklyTrendChart(data) {
  if (!analysisResult) return;
  const weeks = Analisis.tendenciaSemanal(analysisResult.porFecha);
  const cats = weeks.map(w => w.key);
  const series = weeks.map(w => w.count);

  const options = {
    series: [{ name: 'Registros', data: series }],
    chart: { type: 'area', height: 300, toolbar: { show: false } },
    colors: ['#10b981'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    xaxis: { categories: cats, labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false }
  };
  createChart(document.querySelector('#chart-weekly-trend'), options);
}

function renderArquetiposChart() {
  if (!analysisResult) return;
  const stats = Analisis.arquetipoStats(analysisResult.porEmpleado);
  const labels = stats.map(s => s.arquetipo.replace(/_/g, ' '));
  const series = stats.map(s => s.count);
  const colors = ['#206bc4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

  const options = {
    series,
    chart: { type: 'pie', height: 300 },
    labels,
    colors,
    legend: { position: 'bottom', fontSize: '11px' }
  };
  createChart(document.querySelector('#chart-arquetipos'), options);
}

function renderMotivosChart() {
  if (!analysisResult) return;
  const motivos = Analisis.motivosRanking(analysisResult.eventosGlobales).filter(m => m.count > 0);
  const labels = motivos.map(m => m.label);
  const series = motivos.map(m => m.count);
  const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#eab308', '#94a3b8', '#f97316', '#06b6d4'];

  const options = {
    series: [{ name: 'Incidencias', data: series }],
    chart: { type: 'bar', height: 300, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    colors,
    xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    dataLabels: { enabled: false }
  };
  createChart(document.querySelector('#chart-motivos'), options);
}

function renderComparativaChart() {
  if (!analysisResult) return;
  const comp = Analisis.comparativaSucursales(analysisResult.porSucursal);

  const options = {
    series: [
      { name: 'Registros', data: comp.map(c => c.registros) },
      { name: 'Faltas', data: comp.map(c => c.faltas) },
      { name: 'Horas Extra', data: comp.map(c => c.horasExtra) }
    ],
    chart: { type: 'bar', height: 300, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    colors: ['#206bc4', '#ef4444', '#f97316'],
    xaxis: { categories: comp.map(c => c.branch), labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  };
  createChart(document.querySelector('#chart-comparativa'), options);
}

function renderIndicadores() {
  if (!analysisResult) return;
  const tbody = document.getElementById('indicadores-body');
  tbody.innerHTML = '';

  const empleados = Object.values(analysisResult.porEmpleado).map(emp => ({
    name: emp.name,
    branch: emp.branch,
    arquetipo: emp.arquetipo,
    ...emp.analisis
  })).sort((a, b) => b.riesgo - a.riesgo);

  empleados.forEach(emp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.name}</td>
      <td>${emp.branch}</td>
      <td><span class="badge badge-outline text-muted text-capitalize">${emp.arquetipo.replace(/_/g, ' ')}</span></td>
      <td>${emp.totalDiasLaborados}</td>
      <td>${emp.promedioHoras}h</td>
      <td>${emp.retardos}</td>
      <td>${emp.faltas}</td>
      <td><span class="badge bg-${emp.puntualidadRate >= 90 ? 'success' : emp.puntualidadRate >= 75 ? 'warning' : 'danger'}">${emp.puntualidadRate}%</span></td>
      <td><span class="badge bg-${emp.asistenciaRate >= 90 ? 'success' : emp.asistenciaRate >= 75 ? 'warning' : 'danger'}">${emp.asistenciaRate}%</span></td>
      <td><span class="badge bg-${emp.riesgo < 30 ? 'success' : emp.riesgo < 60 ? 'warning' : 'danger'}">${emp.riesgo}</span></td>
      <td><span class="badge ${emp.indicador.bg}">${emp.indicador.label}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function populateFilters() {
  const branches = [...new Set(allData.map(d => d.branch))].sort();
  const events = [...new Set(allData.map(d => d.event_type))].sort();
  const emps = [...new Set(allData.map(d => d.name))].sort();

  const selBranch = document.getElementById('filter-branch');
  branches.forEach(b => selBranch.add(new Option(b, b)));

  const selEvent = document.getElementById('filter-event');
  events.forEach(e => selEvent.add(new Option(eventTypeLabels[e] || e, e)));

  const selEmp = document.getElementById('filter-emp');
  emps.forEach(e => selEmp.add(new Option(e, e)));
}

function renderTable() {
  const tbody = document.getElementById('records-body');
  tbody.innerHTML = '';

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = filteredData.slice(start, end);

  pageData.forEach(row => {
    const tr = document.createElement('tr');
    const eventLabel = eventTypeLabels[row.event_type] || row.event_type;
    const eventColor = eventTypeColors[row.event_type] || '#64748b';
    const dt = new Date(row.timestamp * 1000);
    const fechaHora = dt.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });

    tr.innerHTML = `
      <td>${fechaHora}</td>
      <td>${row.name}</td>
      <td><span class="badge badge-outline text-secondary">${row.num_empleado}</span></td>
      <td>${row.branch}</td>
      <td><span class="badge" style="background-color:${eventColor}; color:#fff">${eventLabel}</span></td>
      <td>${row.device_name}</td>
      <td>${statusBadge(row.status)}</td>
      <td><span class="badge badge-outline text-muted text-capitalize">${row.arquetipo.replace(/_/g, ' ')}</span></td>
    `;
    tbody.appendChild(tr);
  });

  renderPagination();
}

function statusBadge(status) {
  if (status === 'success') return '<span class="badge bg-success">OK</span>';
  if (status === 'warning') return '<span class="badge bg-warning">Advertencia</span>';
  if (status === 'error') return '<span class="badge bg-danger">Error</span>';
  return `<span class="badge bg-secondary">${status}</span>`;
}

function renderPagination() {
  const total = filteredData.length;
  const pages = Math.ceil(total / pageSize) || 1;
  const ul = document.getElementById('table-pagination');
  ul.innerHTML = '';

  document.getElementById('table-info').textContent = `Mostrando ${Math.min((currentPage - 1) * pageSize + 1, total)}-${Math.min(currentPage * pageSize, total)} de ${total} registros`;

  const prev = document.createElement('li');
  prev.className = 'page-item' + (currentPage === 1 ? ' disabled' : '');
  prev.innerHTML = `<a class="page-link" href="#registros">Prev</a>`;
  prev.onclick = e => { e.preventDefault(); if (currentPage > 1) { currentPage--; renderTable(); } };
  ul.appendChild(prev);

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(pages, startPage + maxVisible - 1);
  if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);

  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.className = 'page-item' + (i === currentPage ? ' active' : '');
    li.innerHTML = `<a class="page-link" href="#registros">${i}</a>`;
    li.onclick = e => { e.preventDefault(); currentPage = i; renderTable(); };
    ul.appendChild(li);
  }

  const next = document.createElement('li');
  next.className = 'page-item' + (currentPage === pages ? ' disabled' : '');
  next.innerHTML = `<a class="page-link" href="#registros">Next</a>`;
  next.onclick = e => { e.preventDefault(); if (currentPage < pages) { currentPage++; renderTable(); } };
  ul.appendChild(next);
}

function applyFilters() {
  const branch = document.getElementById('filter-branch').value;
  const event = document.getElementById('filter-event').value;
  const emp = document.getElementById('filter-emp').value;
  const dateVal = document.getElementById('filter-date').value;

  filteredData = allData.filter(d => {
    if (branch && d.branch !== branch) return false;
    if (event && d.event_type !== event) return false;
    if (emp && d.name !== emp) return false;
    if (dateVal && d.date !== dateVal) return false;
    return true;
  });

  currentPage = 1;
  renderTable();
}

function resetFilters() {
  document.getElementById('filter-branch').value = '';
  document.getElementById('filter-event').value = '';
  document.getElementById('filter-emp').value = '';
  document.getElementById('filter-date').value = '';
  filteredData = [...allData];
  currentPage = 1;
  renderTable();
}

document.getElementById('apply-filters').addEventListener('click', applyFilters);
document.getElementById('reset-filters').addEventListener('click', resetFilters);

// Re-render charts on theme change
window.addEventListener('charts:themechanged', () => {
  if (analysisResult) {
    renderCharts(allData);
  }
});

init();
