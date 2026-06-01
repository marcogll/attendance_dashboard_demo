/**
 * charts-theme.js - Helper para colores de ApexCharts según tema dark/light
 */

(function() {
  'use strict';

  function isDark() {
    return document.documentElement.getAttribute('data-bs-theme') === 'dark';
  }

  function getChartThemeColors() {
    const dark = isDark();
    return {
      foreColor: dark ? '#c2c2c2' : '#495057',
      labelColor: dark ? '#a0a0a0' : '#667382',
      gridColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      tooltip: { theme: dark ? 'dark' : 'light' },
      background: dark ? 'transparent' : 'transparent'
    };
  }

  function applyThemeToOptions(baseOptions) {
    const t = getChartThemeColors();
    const opts = JSON.parse(JSON.stringify(baseOptions));

    if (!opts.chart) opts.chart = {};
    opts.chart.background = t.background;
    if (!opts.chart.toolbar) opts.chart.toolbar = { show: false };

    if (!opts.theme) opts.theme = {};
    opts.theme.mode = isDark() ? 'dark' : 'light';

    if (!opts.xaxis) opts.xaxis = {};
    opts.xaxis.labels = Object.assign({}, opts.xaxis.labels, { style: Object.assign({ colors: t.foreColor }, opts.xaxis.labels?.style) });

    if (!opts.yaxis) opts.yaxis = {};
    if (Array.isArray(opts.yaxis)) {
      opts.yaxis = opts.yaxis.map(y => Object.assign({}, y, { labels: Object.assign({}, y.labels, { style: Object.assign({ colors: t.foreColor }, y.labels?.style) }) }));
    } else {
      opts.yaxis.labels = Object.assign({}, opts.yaxis.labels, { style: Object.assign({ colors: t.foreColor }, opts.yaxis.labels?.style) });
    }

    if (!opts.legend) opts.legend = {};
    opts.legend.labels = Object.assign({}, opts.legend.labels, { colors: t.foreColor });

    if (!opts.tooltip) opts.tooltip = {};
    opts.tooltip.theme = t.tooltip.theme;

    if (opts.grid) {
      opts.grid.borderColor = t.gridColor;
      if (opts.grid.xaxis) opts.grid.xaxis.lines = Object.assign({}, opts.grid.xaxis.lines, { show: true });
      if (opts.grid.yaxis) opts.grid.yaxis.lines = Object.assign({}, opts.grid.yaxis.lines, { show: true });
    } else {
      opts.grid = { borderColor: t.gridColor, strokeDashArray: 4 };
    }

    return opts;
  }

  // Store chart instances for re-render
  window.MDCharts = {
    instances: [],
    register(chart) {
      this.instances.push(chart);
    },
    clear() {
      this.instances.forEach(c => { if (c && typeof c.destroy === 'function') c.destroy(); });
      this.instances = [];
    },
    getThemeColors: getChartThemeColors,
    applyTheme: applyThemeToOptions,
    isDark
  };

  // Re-render all charts on theme change
  window.addEventListener('themechange', () => {
    // Dispatch custom event that pages can listen to
    window.dispatchEvent(new CustomEvent('charts:themechanged'));
  });
})();
