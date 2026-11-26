/**
 * Відео-відгук.
 *  - жовта кнопка Play по центру — запуск / продовження після паузи;
 *  - клік по відео або кнопка паузи на панелі — пауза;
 *  - кнопка × — зупинити й повернути обкладинку.
 * Стани на <figure>: .is-started (відео запускали), .is-playing (грає зараз).
 * Одночасно грає лише одне відео на сторінці.
 */
class VideoReview {
  static instances = [];

  constructor(element) {
    this.element = element;
    this.video = element.querySelector('video');
    this.playButton = element.querySelector('.c-video-review__play');
    this.closeButton = element.querySelector('.c-video-review__close');
    if (!this.video || !this.playButton) return;

    VideoReview.instances.push(this);
    this.lazyPoster();
    this.bindEvents();
  }

  // Обкладинку ставимо, лише коли блок наближається до екрана (запас 300px, і збоку — для слайдів поза екраном),
  // щоб не вантажити її разом зі сторінкою. Саме відео — preload="none".
  lazyPoster() {
    const poster = this.video.dataset.poster;
    if (!poster) return;
    const set = () => { this.video.poster = poster; };
    if (!('IntersectionObserver' in window)) return set();
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        set();
        observer.disconnect();
      }
    }, { rootMargin: '300px' });
    observer.observe(this.element);
  }

  bindEvents() {
    this.playButton.addEventListener('click', () => this.play());
    this.closeButton?.addEventListener('click', () => this.stop());

    this.video.addEventListener('play', () => {
      this.element.classList.add('is-started', 'is-playing');
      this.video.controls = true;
      this.playButton.setAttribute('aria-label', this.playButton.dataset.labelResume || 'Resume video');
      // ставимо на паузу інші відео
      VideoReview.instances.forEach((other) => {
        if (other !== this && !other.video.paused) other.video.pause();
      });
    });

    this.video.addEventListener('pause', () => {
      this.element.classList.remove('is-playing');
    });

    this.video.addEventListener('ended', () => this.stop());

    // Esc під час перегляду — закрити відео
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.element.classList.contains('is-started')) this.stop();
    });
  }

  play() {
    this.video.play().catch((error) => {
      console.warn('[VideoReview] Не вдалося запустити відео:', error);
    });
  }

  stop() {
    this.video.pause();
    this.video.controls = false;
    this.video.currentTime = 0;
    this.video.load(); // повертаємо обкладинку
    this.element.classList.remove('is-started', 'is-playing');
    this.playButton.setAttribute('aria-label', this.playButton.dataset.labelPlay || 'Play video');
    this.playButton.focus({ preventScroll: true });
  }
}

export default VideoReview;
