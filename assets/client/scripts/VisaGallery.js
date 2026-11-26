/**
 * Галерея фото готових віз у нативному <dialog>.
 * Відкривається кнопками [data-gallery-open="<id діалогу>"], закривається
 * хрестиком, клавішею Esc (вбудовано в <dialog>) або кліком по фону.
 * data-gallery-index="<n>" на кнопці відкриває галерею одразу на слайді n (з нуля).
 */
class VisaGallery {
  constructor(dialog) {
    this.dialog = dialog;
    this.swiperElement = dialog.querySelector('.c-visa-gallery__swiper');
    this.counter = dialog.querySelector('.c-visa-gallery__counter');
    this.swiper = null;
    this.opener = null;

    document.querySelectorAll(`[data-gallery-open="${dialog.id}"]`).forEach((button) => {
      button.addEventListener('click', () => this.open(button));
    });
    dialog.querySelector('[data-gallery-close]')?.addEventListener('click', () => this.close());

    // клік по затемненню (сам <dialog> поза внутрішнім блоком)
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) this.close();
    });

    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('is-lock');
      this.opener?.focus();
    });
  }

  open(opener) {
    this.opener = opener;
    this.dialog.showModal();
    document.documentElement.classList.add('is-lock');

    const index = Number(opener?.dataset.galleryIndex) || 0;

    // Swiper ініціалізуємо при першому відкритті: у прихованому діалозі він не знає розмірів
    if (!this.swiper && window.Swiper) {
      this.swiper = new window.Swiper(this.swiperElement, {
        slidesPerView: 1,
        initialSlide: index,
        spaceBetween: 16,
        keyboard: { enabled: true },
        navigation: {
          prevEl: this.dialog.querySelector('.c-visa-gallery__nav.m-prev'),
          nextEl: this.dialog.querySelector('.c-visa-gallery__nav.m-next'),
        },
        on: {
          init: (swiper) => this.updateCounter(swiper),
          slideChange: (swiper) => this.updateCounter(swiper),
        },
      });
    } else if (this.swiper) {
      this.swiper.update();
      this.swiper.slideTo(index, 0);
    }
  }

  close() {
    this.dialog.close();
  }

  updateCounter(swiper) {
    if (this.counter) this.counter.textContent = `${swiper.activeIndex + 1} / ${swiper.slides.length}`;
  }
}

export default VisaGallery;
