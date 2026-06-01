/**
 * sucursal.js - Vista detallada por sucursal
 */

let allData = [];
let analysisResult = null;
let selectedSucursal = null;

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
    renderAllSucursalesChart();
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('afterbegin', `<div class="alert alert-danger m-3">Error: ${err.message}</div>`);
  }
}

function populateSelector() {
  const sel = document.getElementById('sucursal-select');
  const branches = Object.keys(analysisResult.porSucursal).sort();
  branches.forEach(b => sel.add(new Option(b, b)));
  sel.addEventListener('change', e => {
    if (e.target.value) loadSucursal(e.target.value);
  });
}

function renderAllSucursalesChart() {
  const comp = Analisis.comparativaSucursales(analysisResult.porSucursal);
  const options = {
    series: [
      { name: 'Registros', data: comp.map(c => c.registros) },
      { name: 'Empleados', data: comp.map(c => c.empleados) },
      { name: 'Prom/Empleado', data: comp.map(c => c.promedio) },
      { name: 'Faltas', data: comp.map(c => c.faltas) }
    ],
    chart: { type: 'bar', height: 320, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
    colors: ['#206bc4', '#10b981', '#f59e0b', '#ef4444'],
    xaxis: { categories: comp.map(c => c.branch), labels: { style: { fontSize: '12px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  };
  createChart(document.querySelector('#chart-all-sucursales'), options);
}

function loadSucursal(branch) {
  selectedSucursal = analysisResult.porSucursal[branch];
  if (!selectedSucursal) return;
  const suc = selectedSucursal;
  const an = suc.analisis;

  document.getElementById('sucursal-info').style.display = '';
  document.getElementById('kpi-sucursal').style.display = '';
  document.getElementById('charts-sucursal').style.display = '';
  document.getElementById('table-sucursal-emp').style.display = '';
  document.getElementById('table-sucursal-reg').style.display = '';

  document.getElementById('suc-name').textContent = branch;
  document.getElementById('suc-meta').textContent = `${an.numEmpleados} empleados · ${an.totalRegistros} registros · Promedio ${an.promedioRegistros} registros/empleado`;

  document.getElementById('suc-kpi-emp').textContent = an.numEmpleados;
  document.getElementById('suc-kpi-reg').textContent = an.totalRegistros;
  document.getElementById('suc-kpi-prom').textContent = an.promedioRegistros;
  document.getElementById('suc-kpi-ent').textContent = an.entradas;
  document.getElementById('suc-kpi-sal').textContent = an.salidas;
  document.getElementById('suc-kpi-falt').textContent = an.faltas;
  document.getElementById('suc-kpi-hextra').textContent = an.horasExtra;
  document.getElementById('suc-kpi-permisos').textContent = an.eventos['permiso'] || 0;
  document.getElementById('suc-kpi-vacaciones').textContent = an.eventos['vacaciones'] || 0;
  document.getElementById('suc-kpi-incapacidades').textContent = an.eventos['incapacidad'] || 0;
  document.getElementById('suc-kpi-olvido').textContent = (an.eventos['olvido_entrada'] || 0) + (an.eventos['olvido_salida'] || 0);
  document.getElementById('suc-kpi-dias').textContent = new Set(suc.registros.map(r => r.date)).size;

  MDCharts.clear();
  renderSucTimeline(suc);
  renderSucEventos(suc);
  renderSucEmpleados(branch);
  renderSucArquetipos(branch);
  renderSucWeekday(suc);
  renderSucPuntualidad(branch);
  renderSucEmpTable(branch);
  renderSucRegTable(suc);
}

function renderSucTimeline(suc) {
  const byDate = {};
  suc.registros.forEach(r => { byDate[r.date] = (byDate[r.date] || 0) + 1; });
  const dates = Object.keys(byDate).sort();
  const series = dates.map(d => byDate[d]);

  const el = document.querySelector('#chart-suc-timeline');
  el.innerHTML = '';
  const options = {
    series: [{ name: 'Registros', data: series }],
    chart: { type: 'area', height: 280, toolbar: { show: false } },
    colors: ['#10b981'],
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
    xaxis: { categories: dates, labels: { rotate: -45, style: { fontSize: '10px' } } },
    yaxis: { labels: { formatter: v => Math.round(v) } },
    dataLabels: { enabled: false }
  };
  createChart(el, options);
}

function renderSucEventos(suc) {
  const counts = {};
  suc.registros.forEach(r => { counts[r.event_type] = (counts[r.event_type] || 0) + 1; });
  const labels = Object.keys(counts).map(k => eventTypeLabels[k] || k);
  const series = Object.values(counts);
  const colors = Object.keys(counts).map(k => eventTypeColors[k] || '#64748b');

  const el = document.querySelector('#chart-suc-eventos');
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

function renderSucEmpleados(branch) {
  const emps = Object.values(analysisResult.porEmpleado).filter(e => e.branch === branch);
  const labels = emps.map(e => e.name);
  const series = emps.map(e => e.registros.length);

  const el = document.querySelector('#chart-suc-empleados');
  el.innerHTML = '';
  const options = {
    series: [{ name: 'Registros', data: series }],
    chart: { type: 'bar', height: 280, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true } },
    colors: ['#206bc4'],
    xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    dataLabels: { enabled: false }
  };
  createChart(el, options);
}

function renderSucArquetipos(branch) {
  const emps = Object.values(analysisResult.porEmpleado).filter(e => e.branch === branch);
  const counts = {};
  emps.forEach(e => { counts[e.arquetipo] = (counts[e.arquetipo] || 0) + 1; });
  const labels = Object.keys(counts).map(k => k.replace(/_/g, ' '));
  const series = Object.values(counts);
  const colors = ['#206bc4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4'];

  const el = document.querySelector('#chart-suc-arquetipos');
  el.innerHTML = '';
  const options = {
    series,
    chart: { type: 'pie', height: 280 },
    labels,
    colors,
    legend: { position: 'bottom', fontSize: '11px' }
  };
  createChart(el, options);
}

function renderSucWeekday(suc) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const counts = [0,0,0,0,0,0,0];
  suc.registros.forEach(r => {
    const day = new Date(r.date + 'T00:00:00').getDay();
    counts[day]++;
  });

  const el = document.querySelector('#chart-suc-weekday');
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

function renderSucPuntualidad(branch) {
  const emps = Object.values(analysisResult.porEmpleado).filter(e => e.branch === branch);
  const labels = emps.map(e => e.name);
  const punt = emps.map(e => e.analisis.puntualidadRate);
  const asis = emps.map(e => e.analisis.asistenciaRate);

  const el = document.querySelector('#chart-suc-puntualidad');
  el.innerHTML = '';
  const options = {
    series: [
      { name: 'Puntualidad %', data: punt },
      { name: 'Asistencia %', data: asis }
    ],
    chart: { type: 'bar', height: 280, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, horizontal: true, columnWidth: '60%' } },
    colors: ['#10b981', '#206bc4'],
    xaxis: { categories: labels, labels: { style: { fontSize: '11px' } } },
    yaxis: { labels: { formatter: v => v + '%' }, max: 100 },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' }
  };
  createChart(el, options);
}

function renderSucEmpTable(branch) {
  const tbody = document.getElementById('suc-emp-body');
  tbody.innerHTML = '';
  const emps = Object.values(analysisResult.porEmpleado)
    .filter(e => e.branch === branch)
    .sort((a, b) => b.analisis.riesgo - a.analisis.riesgo);

  emps.forEach(emp => {
    const an = emp.analisis;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${emp.name}</td>
      <td><span class="badge badge-outline text-muted text-capitalize">${emp.arquetipo.replace(/_/g,' ')}</span></td>
      <td>${an.totalDiasLaborados}</td>
      <td>${an.promedioHoras}h</td>
      <td>${an.retardos}</td>
      <td>${an.faltas}</td>
      <td>${an.horasExtra}</td>
      <td><span class="badge bg-${an.puntualidadRate >= 90 ? 'success' : an.puntualidadRate >= 75 ? 'warning' : 'danger'}">${an.puntualidadRate}%</span></td>
      <td><span class="badge ${an.indicador.bg}">${an.indicador.label}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSucRegTable(suc) {
  const tbody = document.getElementById('suc-reg-body');
  tbody.innerHTML = '';
  const regs = [...suc.registros].sort((a, b) => b.timestamp - a.timestamp);
  regs.forEach(r => {
    const dt = new Date(r.timestamp * 1000);
    const fechaHora = dt.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
    const evLabel = eventTypeLabels[r.event_type] || r.event_type;
    const evColor = eventTypeColors[r.event_type] || '#64748b';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${fechaHora}</td>
      <td>${r.name}</td>
      <td><span class="badge" style="background-color:${evColor}; color:#fff">${evLabel}</span></td>
      <td>${r.device_name}</td>
      <td>${r.status === 'success' ? '<span class="badge bg-success">OK</span>' : '<span class="badge bg-warning">Adv</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Re-render charts on theme change
window.addEventListener('charts:themechanged', () => {
  if (selectedSucursal) {
    loadSucursal(selectedSucursal.branch);
  }
  renderAllSucursalesChart();
});

init();
