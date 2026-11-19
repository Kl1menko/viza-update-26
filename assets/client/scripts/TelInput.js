class TelInput {
  constructor(element) {
    this.element = element;
    this.init();
    this.bindEvents();
  }

  init() {
    this.iti = window.intlTelInput(this.element, {
        initialCountry: 'auto',
        geoIpLookup: cb => fetch('https://ipapi.co/country/')
          .then(r => r.text()).then(code => cb(code)).catch(() => cb('PL')),
        separateDialCode: true,
        nationalMode: false, 
        autoPlaceholder: 'polite',
        preferredCountries: ['pl','de'],
        // utils (форматування/перевірка номера, ~260 КБ) вантажиться після сторінки, а не блокує її
        utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.5.6/build/js/utils.js',
      });

      const id = this.element.getAttribute('id');
      this.hiddenInput = document.getElementById(`${id}_e164`);
  }

  bindEvents() {
      this.element.addEventListener('input', (event) => this.onInputHandle(event));
      this.element.addEventListener('blur', (event) => this.onInputErrorHandle(event));
      this.element.addEventListener('countrychange', (event) => this.onCountryChangeHandle(event));
  }

  onInputHandle(event) {
    this.hiddenInput.value = this.iti.getNumber();
  }

  onInputErrorHandle(event) {
    this.hiddenInput.value = this.iti.getNumber();
    this.element.classList.toggle('m-error', this.element.value && !this.iti.isValidNumber());
  }

  onCountryChangeHandle(event) {
    this.hiddenInput.value = this.iti.getNumber();
  }
}

export default TelInput;