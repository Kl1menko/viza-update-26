class Carousel {
    constructor(selector = '[data-carousel]', config = {}) {
        this.selector = selector;
        this.config = config;
        this.swiper = null;
        this.element = document.querySelector(this.selector);

        this.init();
        this.bindEvents();
    }

    init() {
        // на сторінках без каруселі (або без Swiper) просто нічого не робимо
        if (!this.element || !window.Swiper) return;
        this.swiper = new window.Swiper(this.element, this.config);
    }

    bindEvents() {
        if (!this.swiper) return;
        this.swiper.on('slideChange', () => {
            const activeSlide = this.swiper.slides[this.swiper.activeIndex];
            const id = activeSlide?.dataset?.id;

            const event = new CustomEvent('slide:change', {
                detail: { id }
            });
            this.element.dispatchEvent(event);
        });
    }

    slideToById(id) {
        if (!this.swiper) return;
        const index = [...this.swiper.slides].findIndex(slide => slide.dataset.id === id);
        if (index !== -1) {
            this.swiper.slideTo(index);
        }
    }
}

export default Carousel;
