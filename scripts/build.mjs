#!/usr/bin/env node
/**
 * Збірка статичного сайту в dist/ для продакшну (без MODX і без збирання в браузері).
 *
 *  - вставляє всі <div include-html="..."> прямо в HTML (як робить debug/dynamicComposer.js у браузері);
 *  - переписує внутрішні шляхи на кореневі та чисті URL:
 *      index.html → /, business.html → /business/, country/<slug>.html → /opened-work/<slug>/;
 *  - кожну сторінку кладе як <url>/index.html, щоб чисті адреси працювали на будь-якому хостингу;
 *  - копіює лише потрібні для сайту файли (без SCSS, шаблонів, _unused, debug-скриптів).
 *
 * Запуск: npm run build   (перед цим збирається CSS)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

// сторінка-джерело → шлях на сайті
const pages = [
  { src: 'index.html', url: '/' },
  { src: 'business.html', url: '/business/' },
  { src: 'privacy-policy.html', url: '/privacy-policy/' },
];
for (const f of (await fs.readdir(path.join(ROOT, 'country'))).filter((f) => f.endsWith('.html')).sort()) {
  pages.push({ src: `country/${f}`, url: `/opened-work/${f.replace(/\.html$/, '')}/` });
}
pages.push({ src: '404.html', url: '/404.html', file: true }); // окремий файл, не папка
const pageUrlBySrc = new Map(pages.map((p) => [p.src, p.url]));

// файли/папки з кореня, які потрапляють у dist
const COPY = [
  'assets/static', 'assets/client/fonts', 'assets/client/styles/main.css',
  'assets/client/scripts', // нижче відфільтруємо debug/
  'favicon.ico', 'icon.svg', 'apple-touch-icon.png', 'android-chrome-192x192.png', 'android-chrome-512x512.png',
  'manifest.webmanifest', 'robots.txt', 'sitemap.xml', '.htaccess',
];

const ATTRS = /\b(src|href|srcset|poster|data-poster|include-html)="([^"]*)"/g;
const isExternal = (v) => !v || /^(#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(v);

/** відносний шлях у файлі `fromFile` → кореневий шлях сайту */
function toSiteUrl(value, fromFile) {
  if (isExternal(value)) return value;
  const [, pathPart, suffix] = value.match(/^([^?#]*)(.*)$/);
  if (pathPart === '' ) return value;
  const abs = pathPart.startsWith('/')
    ? pathPart.slice(1)
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), pathPart));
  if (pageUrlBySrc.has(abs)) return pageUrlBySrc.get(abs) + suffix;
  return '/' + abs + suffix;
}

function rewriteAttrs(html, fromFile) {
  return html.replace(ATTRS, (m, attr, value) => {
    if (attr === 'include-html') return m; // обробляє compose()
    if (attr === 'srcset') {
      const v = value.split(',').map((part) => {
        const [u, ...rest] = part.trim().split(/\s+/);
        return [toSiteUrl(u, fromFile), ...rest].join(' ');
      }).join(', ');
      return `${attr}="${v}"`;
    }
    return `${attr}="${toSiteUrl(value, fromFile)}"`;
  });
}

async function compose(file, depth = 0) {
  if (depth > 10) throw new Error(`Too deep include: ${file}`);
  let html = await fs.readFile(path.join(ROOT, file), 'utf8');
  html = rewriteAttrs(html, file);
  const re = /<div include-html="([^"]+)"><\/div>/g;
  let out = '', last = 0, m;
  while ((m = re.exec(html))) {
    const child = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
    out += html.slice(last, m.index) + (await compose(child, depth + 1)).trim();
    last = m.index + m[0].length;
  }
  return out + html.slice(last);
}

function cleanup(html) {
  return html
    // скрипт збирання в браузері більше не потрібен
    .replace(/\s*<script[^>]*debug\/dynamicComposer\.js[^>]*><\/script>/g, '')
    // маркер для Live Server у шаблоні шапки
    .replace(/<!-- Маркер для Go Live[\s\S]*?-->\s*<\/body>\s*/g, '')
    // службові HTML-коментарі (не чіпаємо умовні коментарі)
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    // порожні рядки
    .replace(/\n[ \t]*\n+/g, '\n');
}

async function copy(rel) {
  const from = path.join(ROOT, rel);
  let stat;
  try { stat = await fs.stat(from); } catch { return; }
  if (stat.isDirectory()) {
    for (const entry of await fs.readdir(from)) {
      if (entry === '.DS_Store' || (rel === 'assets/client/scripts' && entry === 'debug')) continue;
      await copy(path.posix.join(rel, entry));
    }
  } else {
    const to = path.join(DIST, rel);
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.copyFile(from, to);
  }
}

await fs.rm(DIST, { recursive: true, force: true });
for (const p of pages) {
  const html = cleanup(await compose(p.src));
  const out = p.file ? path.join(DIST, p.url) : path.join(DIST, p.url, 'index.html');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, html);
  console.log(`page  ${p.src.padEnd(28)} → ${p.url}`);
}
for (const rel of COPY) await copy(rel);
// незаповнені реквізити (data-todo) не повинні потрапити на прод непомітно
for (const p of pages) {
  const out = p.file ? path.join(DIST, p.url) : path.join(DIST, p.url, 'index.html');
  const todos = [...(await fs.readFile(out, 'utf8')).matchAll(/data-todo>([^<]*)</g)].map((m) => m[1]);
  if (todos.length) console.warn(`\n⚠️  ${p.url}: не заповнено ${todos.length} поле(-я): ${todos.join(', ')}\n`);
}
console.log(`done → ${path.relative(process.cwd(), DIST) || 'dist'}/`);
