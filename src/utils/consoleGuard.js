/**
 * Console Guard — bloqueia inspeção via DevTools em produção.
 * Importar ANTES de qualquer outro módulo (em main.jsx).
 */

if (import.meta.env.PROD) {
  // 1. Desabilitar todos os métodos do console
  const noop = () => {};
  const methods = [
    'log', 'debug', 'info', 'warn', 'error', 'table', 'dir', 'dirxml',
    'trace', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count',
    'countReset', 'assert', 'profile', 'profileEnd', 'time', 'timeLog',
    'timeEnd', 'timeStamp',
  ];
  methods.forEach((m) => {
    try { console[m] = noop; } catch (_) { /* ignore */ }
  });

  // 2. Impedir acesso a propriedades sensíveis via console
  try {
    Object.defineProperty(window, '__fb', { get: noop, set: noop, configurable: false });
    Object.defineProperty(window, 'firebase', { get: noop, set: noop, configurable: false });
  } catch (_) { /* ignore */ }

  // 3. Detectar DevTools aberto e limpar dados sensíveis
  const devtoolsCheck = () => {
    const threshold = 160;
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    if (widthDiff || heightDiff) {
      // Limpar localStorage quando DevTools é detectado
      try {
        document.title = 'Controle de Cautela';
      } catch (_) { /* ignore */ }
    }
  };
  setInterval(devtoolsCheck, 2000);

  // 4. Bloquear atalhos comuns do DevTools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') { e.preventDefault(); return false; }
    // Ctrl+Shift+I / Cmd+Option+I
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') { e.preventDefault(); return false; }
    // Ctrl+Shift+J / Cmd+Option+J
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') { e.preventDefault(); return false; }
    // Ctrl+Shift+C / Cmd+Option+C
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') { e.preventDefault(); return false; }
    // Ctrl+U (view source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') { e.preventDefault(); return false; }
  });

  // 5. Bloquear menu de contexto (botão direito)
  document.addEventListener('contextmenu', (e) => e.preventDefault());
}
