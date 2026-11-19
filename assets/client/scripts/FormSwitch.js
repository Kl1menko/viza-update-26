/**
 * Форма зв'язку з вибором: "For myself" / "For agencies & partners".
 *
 * Крок 1 — великі картки [data-form-switch-choose]; крок 2 — відповідна форма
 * [data-form-switch-panel]. Стан "обрано" — клас .is-chosen на корені.
 */
class FormSwitch {
  constructor(element) {
    this.element = element;
    this.cards = [...element.querySelectorAll('[data-form-switch-choose]')];
    this.panels = [...element.querySelectorAll('[data-form-switch-panel]')];
    this.current = null;

    this.cards.forEach((card) => {
      card.addEventListener('click', () => this.choose(card.dataset.formSwitchChoose));
    });

    // у модалці — щоразу починаємо з вибору
    const modal = element.closest('[data-component="Modal"]');
    modal?.addEventListener('modal:beforeClose', () => this.reset());
  }

  choose(name) {
    this.current = name;
    this.element.classList.add('is-chosen');
    this.panels.forEach((panel) => {
      panel.hidden = panel.dataset.formSwitchPanel !== name;
    });
    this.cards.forEach((card) => {
      card.setAttribute('aria-expanded', String(card.dataset.formSwitchChoose === name));
    });

    this.refreshPhoneInputs();
    this.element.dispatchEvent(new CustomEvent('formswitch:change', { detail: { name } }));

    const panel = this.panels.find((p) => p.dataset.formSwitchPanel === name);
    if (!panel) return;
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      // комп'ютер: фокус на перше поле — одразу можна писати
      panel.querySelector('input:not([type="hidden"]), textarea')?.focus({ preventScroll: true });
    } else {
      // телефон: без автофокусу, інакше клавіатура одразу закриває половину форми.
      // Фокус на саму панель (для екранних читачів) і показуємо її початок.
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      panel.focus({ preventScroll: true });
      const modal = panel.closest('[data-component="Modal"]');
      if (modal) modal.scrollTo({ top: 0, behavior: 'smooth' }); // у модалці — з заголовка
      else panel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }

  reset() {
    this.current = null;
    this.element.classList.remove('is-chosen');
    this.panels.forEach((panel) => { panel.hidden = true; });
    this.cards.forEach((card) => card.setAttribute('aria-expanded', 'false'));
  }

  // intl-tel-input рахує відступ під код країни при ініціалізації; у прихованій
  // панелі ширина була 0, тож після показу перевстановлюємо країну, щоб перерахувати.
  refreshPhoneInputs() {
    const globals = window.intlTelInputGlobals;
    if (!globals) return;
    this.element.querySelectorAll('[data-form-switch-panel]:not([hidden]) input[type="tel"]').forEach((input) => {
      const iti = globals.getInstance(input);
      const iso2 = iti?.getSelectedCountryData()?.iso2;
      if (iso2) iti.setCountry(iso2);
    });
  }
}

export default FormSwitch;
