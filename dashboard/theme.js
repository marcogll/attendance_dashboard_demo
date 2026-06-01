/**
 * theme.js - Toggle Dark/Light con persistencia localStorage
 */

(function() {
  'use strict';

  const THEME_KEY = 'md-theme';
  const html = document.documentElement;

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  function setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'dark') {
      html.setAttribute('data-bs-theme', 'dark');
      html.classList.add('theme-dark');
      html.classList.remove('theme-light');
    } else {
      html.setAttribute('data-bs-theme', 'light');
      html.classList.remove('theme-dark');
      html.classList.add('theme-light');
    }
    document.querySelectorAll('.theme-toggle-btn i').forEach(icon => {
      icon.className = theme === 'dark' ? 'ti ti-moon' : 'ti ti-sun';
    });
    // Dispatch event for charts to update
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  }

  function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
  }

  // Init
  const saved = getTheme();
  setTheme(saved);

  // Expose globally
  window.ThemeToggle = { toggleTheme, getTheme, setTheme };

  // Bind buttons when DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.addEventListener('click', toggleTheme);
    });
  });
})();
