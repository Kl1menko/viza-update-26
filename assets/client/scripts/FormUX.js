/**
 * Зручність форм, насамперед на телефоні:
 *  - правильна клавіатура для кожного поля (email, телефон, посилання), без автокорекції там, де вона заважає;
 *  - кнопка Enter на клавіатурі ("Next") переводить на наступне поле, на останньому — ховає клавіатуру;
 *  - тап поза полем ховає клавіатуру (свайп-прокрутка — ні, щоб не заважати гортати форму);
 *  - зрозумілі помилки під полями замість мовчання, прокрутка до першого поля з помилкою.
 *
 * Перевірка йде до будь-якої відправки: якщо форма з помилками, далі подія submit не піде.
 */

const FIELD = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]), textarea, select';
// службові поля intl-tel-input (пошук країни) — не частина форми для користувача
const isOwnField = (el) => !el.closest('.iti__dropdown-content, .iti__country-list') && !el.classList.contains('iti__search-input');

const MESSAGES = {
  required: 'Please fill in this field.',
  email: 'Enter a valid email, for example name@mail.com.',
  phone: 'Enter a valid phone number.',
  format: 'Please check the format.',
};

class FormUX {
  constructor(form) {
    this.form = form;
    this.fields = [...form.querySelectorAll(FIELD)].filter(isOwnField);
    this.prepareFields();
    this.bindEvents();
  }

  // ---------- клавіатура ----------

  prepareFields() {
    const inputs = this.fields.filter((el) => el.tagName === 'INPUT');
    const lastInput = inputs[inputs.length - 1];
    const lastField = this.fields[this.fields.length - 1];

    this.fields.forEach((el) => {
      const name = el.name || '';
      const set = (attr, value) => { if (!el.hasAttribute(attr)) el.setAttribute(attr, value); };

      if (el.type === 'email') {
        set('inputmode', 'email');
        set('autocapitalize', 'off');
        set('autocorrect', 'off');
        set('spellcheck', 'false');
      } else if (el.type === 'tel') {
        set('inputmode', 'tel');
      } else if (name === 'website') {
        set('inputmode', 'url');
        set('autocapitalize', 'off');
        set('autocorrect', 'off');
        set('spellcheck', 'false');
      } else if (name === 'contact') {
        // телефон або email: без великої літери й автокорекції
        set('autocapitalize', 'off');
        set('autocorrect', 'off');
        set('spellcheck', 'false');
      } else if (/name|person|company|country/.test(name)) {
        set('autocapitalize', 'words');
      }

      if (el.tagName === 'INPUT') {
        // на останньому полі (якщо після нього немає textarea) — "Done"
        set('enterkeyhint', el === lastInput && el === lastField ? 'done' : 'next');
      }
    });
  }

  visibleFields() {
    return this.fields.filter((el) => !el.disabled && el.getClientRects().length > 0);
  }

  onKeydown(e) {
    const el = e.target;
    if (e.key !== 'Enter' || e.isComposing || el.tagName !== 'INPUT' || !this.fields.includes(el)) return;
    // Enter у полі не відправляє форму навпіл заповненою, а веде далі
    e.preventDefault();
    const list = this.visibleFields();
    const next = list[list.indexOf(el) + 1];
    if (next) next.focus();
    else el.blur(); // останнє поле — ховаємо клавіатуру, видно кнопку відправки
  }

  // ---------- перевірка ----------

  errorFor(el) {
    const value = el.value.trim();
    if (el.required && !value) return MESSAGES.required;
    if (!value) return '';
    // браузер вважає "name@mail" коректним — вимагаємо домен із крапкою
    if (el.type === 'email' && (el.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))) return MESSAGES.email;
    if (el.type === 'tel') {
      const iti = window.intlTelInputGlobals?.getInstance(el);
      // isValidNumber() повертає null, поки не завантажились utils — тоді не блокуємо
      if (iti && iti.isValidNumber() === false) return MESSAGES.phone;
    }
    if (el.validity.patternMismatch) return el.title ? `${el.title}.` : MESSAGES.format;
    if (el.validity.typeMismatch) return MESSAGES.format;
    return '';
  }

  showError(el, message) {
    const group = el.closest('.c-form-group') || el.parentElement;
    const id = `${el.id || el.name}-error`;
    let note = group.querySelector('.c-form__error');

    el.classList.toggle('m-error', Boolean(message));
    if (message) {
      if (!note) {
        note = document.createElement('p');
        note.className = 'c-form__error';
        note.id = id;
        note.setAttribute('aria-live', 'polite');
        group.appendChild(note);
      }
      note.textContent = message;
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', id);
    } else {
      note?.remove();
      el.removeAttribute('aria-invalid');
      if (el.getAttribute('aria-describedby') === id) el.removeAttribute('aria-describedby');
    }
  }

  validate() {
    let first = null;
    this.visibleFields().forEach((el) => {
      const message = this.errorFor(el);
      this.showError(el, message);
      if (message && !first) first = el;
    });
    return first;
  }

  onSubmit(e) {
    const firstInvalid = this.validate();
    if (!firstInvalid) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
    firstInvalid.focus({ preventScroll: true });
  }

  bindEvents() {
    // capture — щоб перевірка спрацювала раніше за обробник відправки
    this.form.addEventListener('submit', (e) => this.onSubmit(e), true);
    this.form.addEventListener('keydown', (e) => this.onKeydown(e));

    // помилка зникає, щойно поле виправлене; нова з'являється лише після відправки або виходу з поля
    this.form.addEventListener('input', (e) => {
      if (e.target.classList?.contains('m-error') && !this.errorFor(e.target)) this.showError(e.target, '');
    });
    this.form.addEventListener('focusout', (e) => {
      const el = e.target;
      if (!this.fields.includes(el)) return;
      if (el.classList.contains('m-error') || (el.value.trim() && this.errorFor(el))) {
        this.showError(el, this.errorFor(el));
      }
    });
  }

  // ---------- клавіатура: сховати тапом поза полем ----------

  static enableTapToDismiss() {
    if (FormUX.tapBound) return;
    FormUX.tapBound = true;
    let start = null;
    document.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      start = e.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      const active = document.activeElement;
      if (!start || !active?.matches?.('.c-form input, .c-form textarea')) return;
      const t = e.changedTouches[0];
      const moved = Math.abs(t.clientX - start.x) > 10 || Math.abs(t.clientY - start.y) > 10;
      if (moved) return; // це прокрутка, а не тап
      if (e.target.closest('input, textarea, select, label, button, a, .iti')) return;
      active.blur();
    }, { passive: true });
  }

  static initAll(selector = 'form.c-form') {
    FormUX.enableTapToDismiss();
    return [...document.querySelectorAll(selector)].map((form) => new FormUX(form));
  }
}

export default FormUX;
