(() => {
  const cache = new Map();

  async function fetchText(url) {
    if (cache.has(url)) return cache.get(url);
    // no-cache: браузер завжди перевіряє, чи змінився шаблон (інакше правки в template/ не видно)
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const text = await res.text();
    cache.set(url, text);
    return text;
  }

  const URL_ATTRS = ['src', 'href', 'poster', 'include-html', 'xlink:href'];
  const isRelative = (value) => value && !/^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(value.trim());

  function rewriteRelativeUrls(container, baseUrl) {
    for (const el of container.querySelectorAll('*')) {
      for (const attr of URL_ATTRS) {
        const value = el.getAttribute(attr);
        if (isRelative(value)) el.setAttribute(attr, new URL(value, baseUrl).href);
      }
      const srcset = el.getAttribute('srcset');
      if (srcset) {
        el.setAttribute(
          'srcset',
          srcset
            .split(',')
            .map((item) => {
              const [u, ...rest] = item.trim().split(/\s+/);
              return [isRelative(u) ? new URL(u, baseUrl).href : u, ...rest].join(' ');
            })
            .join(', ')
        );
      }
    }
  }

  async function processIncludes(root = document, base = document.baseURI, depth = 0) {
    if (depth > 10) throw new Error('Max include depth exceeded (circular include?)');

    const nodes = Array.from(root.querySelectorAll('[include-html]'));
    if (!nodes.length) return;

    for (const el of nodes) {
      const fileAttr = el.getAttribute('include-html');
      const url = new URL(fileAttr, base).href;

      try {
        let html = await fetchText(url);
        // прибрати будь-які <script> з фрагмента
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

        // <template> не завантажує ресурси, доки ми не виправимо шляхи
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const tmp = tpl.content;

        // Шляхи в шаблонах пишуться відносно самого файлу шаблону —
        // перетворюємо їх на абсолютні, щоб вони працювали на будь-якій сторінці
        rewriteRelativeUrls(tmp, url);

        const parent = el.parentNode;
        while (tmp.firstChild) parent.insertBefore(tmp.firstChild, el);
        parent.removeChild(el);
      } catch (err) {
        el.outerHTML = `<div style="color:red">Помилка завантаження "${fileAttr}": ${err.message}</div>`;
      }
    }

    // опрацьовуємо наступний рівень вкладеності
    await processIncludes(root, base, depth + 1);

    // корисно кинути подію, щоб ініціалізувати JS у вставлених блоках
    document.dispatchEvent(new CustomEvent('includes:loaded', { detail: { depth } }));
  }

  // Якщо сторінку відкрили з якорем (index.html#about), браузер не знайшов елемент,
  // бо секції ще не були вставлені. Прокручуємо вручну, коли все на місці.
  function scrollToHash() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
  }

  // main.js чекає на цей проміс, перш ніж ініціалізувати компоненти
  window.includesReady = new Promise((resolve) => {
    const run = () =>
      processIncludes()
        .catch(console.error)
        .finally(() => {
          resolve();
          scrollToHash();
        });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  });
})();
