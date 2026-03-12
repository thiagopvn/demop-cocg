/**
 * Console Guard — bloqueia inspecao via DevTools em producao.
 * Importar ANTES de qualquer outro modulo (em main.jsx).
 */

if (import.meta.env.PROD) {
  const noop = () => {};

  // 1. Desabilitar TODOS os metodos do console
  const methods = [
    'log', 'debug', 'info', 'warn', 'error', 'table', 'dir', 'dirxml',
    'trace', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count',
    'countReset', 'assert', 'profile', 'profileEnd', 'time', 'timeLog',
    'timeEnd', 'timeStamp',
  ];
  methods.forEach((m) => {
    try {
      Object.defineProperty(console, m, {
        value: noop,
        writable: false,
        configurable: false,
      });
    } catch (e) {
      try { console[m] = noop; } catch (e2) { /* ignore */ }
    }
  });

  // 2. Substituir o objeto console inteiro
  try {
    const fakeConsole = {};
    methods.forEach((m) => { fakeConsole[m] = noop; });
    Object.defineProperty(window, 'console', {
      value: Object.freeze(fakeConsole),
      writable: false,
      configurable: false,
    });
  } catch (e) { /* ignore */ }

  // 3. Bloquear acesso a objetos Firebase/Firestore globais
  const blockedGlobals = [
    '__fb', 'firebase', 'firestore', '_firebaseApp',
    '_db', 'db', 'Firestore', 'Firebase',
  ];
  blockedGlobals.forEach((name) => {
    try {
      Object.defineProperty(window, name, {
        get: () => undefined,
        set: noop,
        configurable: false,
      });
    } catch (e) { /* ignore */ }
  });

  // 4. Impedir acesso a React internals e fiber
  try {
    Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      get: () => undefined,
      set: noop,
      configurable: false,
    });
  } catch (e) { /* ignore */ }

  // Detectar se é dispositivo móvel/touch (DevTools não disponíveis)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && navigator.maxTouchPoints > 1);

  // 5. Detectar DevTools aberto via debugger trap (apenas desktop)
  if (!isMobile) {
    const devtoolsDetector = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const end = performance.now();
      if (end - start > 50) {
        // DevTools provavelmente aberto (debugger causou pausa)
        try {
          localStorage.removeItem('token');
          sessionStorage.clear();
          window.location.replace('/');
        } catch (e) { /* ignore */ }
      }
    };
    setInterval(devtoolsDetector, 3000);
  }

  // 6. Detectar DevTools via tamanho da janela (apenas desktop)
  // No iOS, o teclado virtual e a barra de enderecos alteram innerHeight,
  // causando falsos positivos que disparam reload infinito.
  if (!isMobile) {
    const sizeDetector = () => {
      const threshold = 160;
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        try {
          localStorage.removeItem('token');
          sessionStorage.clear();
          window.location.replace('/');
        } catch (e) { /* ignore */ }
      }
    };
    setInterval(sizeDetector, 2000);
  }

  // 7. Bloquear TODOS os atalhos de DevTools
  document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl+Shift+I / Cmd+Option+I (Inspector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl+Shift+J / Cmd+Option+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl+Shift+C / Cmd+Option+C (Element picker)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl+Shift+K (Firefox console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl+Shift+M (Responsive mode)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'M' || e.key === 'm')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl+U / Cmd+U (View source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) { e.preventDefault(); e.stopPropagation(); return false; }
    // Ctrl+S / Cmd+S (Save page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) { e.preventDefault(); e.stopPropagation(); return false; }
  }, true);

  // 8. Bloquear menu de contexto (botao direito)
  document.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); return false; }, true);

  // 9. Bloquear selecao de texto e drag (dificulta copiar dados)
  document.addEventListener('selectstart', (e) => {
    // Permitir selecao em inputs e textareas
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    e.preventDefault();
  }, true);
  document.addEventListener('dragstart', (e) => { e.preventDefault(); }, true);

  // 10. Bloquear Function constructor (impede eval via console)
  try {
    const origFunction = Function;
    // eslint-disable-next-line no-global-assign
    window.Function = function() {
      throw new Error('Blocked');
    };
    window.Function.prototype = origFunction.prototype;
  } catch (e) { /* ignore */ }

  // 11. Bloquear eval
  try {
    window.eval = noop;
  } catch (e) { /* ignore */ }

  // 12. Remover firebaseConfig do escopo global
  try {
    Object.defineProperty(window, 'firebaseConfig', {
      get: () => undefined,
      set: noop,
      configurable: false,
    });
  } catch (e) { /* ignore */ }
}
