import Header from "./Header.js";
import TextAnimation from "./TextAnimation.js";
import QuickFilter from "./QuickFilter.js";
import Carousel from "./Carousel.js";
import TelInput from "./TelInput.js";
import TextArea from "./TextArea.js";
import defineScrollBarWidthCSSVar from "./utils/defineScrollBarWidthCSSVar.js";
import Overlay from "./Overlay.js";
import Modal from "./Modal.js";
import TopButton from "./TopButton.js";
import FormSwitch from "./FormSwitch.js";
import FormUX from "./FormUX.js";
import VideoReview from "./VideoReview.js";
import VisaGallery from "./VisaGallery.js";

// Локально сторінка збирається з шаблонів (debug/dynamicComposer.js),
// тому ініціалізуємо компоненти лише після вставки всіх include-html.
const ready = () =>
  new Promise((resolve) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    } else {
      resolve();
    }
  }).then(() => window.includesReady);

ready().then(async () => {
    const overlayElement = document.querySelector('[data-component="Overlay"]');
    const overlay = new Overlay(overlayElement, {
      activeClass: 'm-show',
      closeOnEsc: true,
      closeOnOverlay: false,
      lockScroll: true
    });

    const modalElement = document.querySelector('[data-component="Modal"]');
    const modal = new Modal(modalElement);
    modalElement.addEventListener('modal:beforeClose', (e) => {
      overlay.close();
    });
    
    const topButtonElement = document.querySelector('[data-component="TopButton"]');
    const topButton = new TopButton(topButtonElement); 

    // Кнопка "вгору" закріплена в правому нижньому куті і на телефоні лягала
    // на стрілки слайдерів (Offices, країни, команда). Ховаємо її, поки стрілки
    // будь-якого слайдера знаходяться в нижній частині екрана.
    if (topButtonElement && 'IntersectionObserver' in window) {
      const visibleControls = new Set();
      const controlsObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleControls.add(entry.target);
          else visibleControls.delete(entry.target);
        });
        topButtonElement.classList.toggle('m-yield', visibleControls.size > 0);
      }, { rootMargin: '-70% 0px 0px 0px' }); // лише нижні 30% екрана
      // + форми: кнопка не має лягати на поля, поки їх заповнюють
      document.querySelectorAll('.swiper-controls, .c-outer-swiper, form.c-form').forEach((el) => controlsObserver.observe(el));
    }

    let quickFilterElement = document.querySelector('[data-component="QuickFilter"]');
    if (quickFilterElement) {
        let quickFilter = new QuickFilter(quickFilterElement);
        if (quickFilter?.cache?.links?.length && ![...quickFilter.cache.links].some(l => l.classList.contains(quickFilter.selector.activeClass))) {
            quickFilter.setActive(quickFilter.cache.links[0]);
        }

        // вакансії в каруселі: на телефоні всі згорнуті (в HTML без open),
        // на ПК перша вакансія кожної країни відкрита. До ініціалізації Swiper,
        // щоб autoHeight одразу порахував правильну висоту
        if (window.matchMedia('(min-width: 768px)').matches) {
          document.querySelectorAll('[data-carousel="CountryCarousel"] .swiper-slide').forEach((slide) => {
            slide.querySelector('.c-job__details')?.setAttribute('open', '');
          });
        }

            let carousel = new Carousel('[data-carousel="CountryCarousel"]', {
      slidesPerView: 1,
      spaceBetween: 10,
      // висота під поточну країну, а не під найвищий слайд (інакше на телефоні — порожнеча)
      autoHeight: true,
      // свайп лише на явно горизонтальний рух — не плутається з прокруткою сторінки
      touchAngle: 30,
      threshold: 8,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      breakpoints: {
        1025: {
          pagination: false,
        },
      },
    });

    if (carousel && carousel.element) {
        // 🔁 Slide → Filter
        carousel.element.addEventListener("slide:change", (e) => {
        quickFilter.activateById(e.detail.id);
        // на телефоні після переходу показуємо початок нової країни,
        // якщо користувач був унизу довгого слайда
        if (window.innerWidth < 768) {
          const header = document.querySelector('[data-js-header]');
          const offset = (header ? header.getBoundingClientRect().height : 0) + 8;
          const top = quickFilter.element.getBoundingClientRect().top;
          if (top < offset) {
            // після зміни висоти слайда (autoHeight), щоб позиція не з'їхала
            setTimeout(() => {
              const y = quickFilter.element.getBoundingClientRect().top + window.scrollY - offset;
              window.scrollTo({ top: y, behavior: 'smooth' });
            }, 50);
          }
        }
        });
        
        // вакансія розкрилась/згорнулась — перерахувати висоту слайда (autoHeight).
        // toggle не спливає, тому слухаємо у фазі захоплення
        carousel.element.addEventListener("toggle", () => {
          carousel.swiper?.updateAutoHeight(200);
        }, true);

        // 🔁 Filter → Slide
        quickFilter.element.addEventListener("filter:change", (e) => {
          carousel.slideToById(e.detail.id);
        });
    }

    }
    
    let countryQuickFilterElement = document.querySelector('[data-component="CountryQuickFilter"]');
    if (countryQuickFilterElement) {
       new QuickFilter(countryQuickFilterElement, { filterMode: true }); 
    }

    new Carousel('[data-carousel="OfficeCarousel"]', {
      slidesPerView: 1,
      spaceBetween: 24,
      navigation: {
        nextEl: ".swiper-button-next",
        prevEl: ".swiper-button-prev",
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      grabCursor: true,
      breakpoints: {
        // слайдер виходить за контейнер (overflow: visible у _section.scss),
        // тож край сусіднього офісу видно у полі екрана, а кожен слайд стає рівно
        0: {
          slidesPerView: 1,
          spaceBetween: 12,
        },
        768: {
          slidesPerView: 2,
          spaceBetween: 24,
        },
        1025: {
          pagination: false,
          navigation: false,
          slidesPerView: 3,
        },
      },
    });

    new Header();
    new TextAnimation("[data-animation-text]");

    let coverImage = document.querySelectorAll(".cover-image");
    let paperImage = document.querySelectorAll(".paper-image");
    let contactUsButton = document.querySelectorAll(".js-contact-us-btn");
    if (contactUsButton && contactUsButton.length) {
      contactUsButton.forEach((button) => {
        button.addEventListener("mouseenter", (e) => {
          coverImage.forEach((el) => {
            el.classList.add("m-animation");
          });
          paperImage.forEach((el) => {
            el.classList.add("m-animation");
          });
        });
  
        button.addEventListener("mouseleave", (e) => {
          coverImage.forEach((el) => {
            el.classList.remove("m-animation");
          });
          paperImage.forEach((el) => {
            el.classList.remove("m-animation");
          });
        });
  
        button.addEventListener("click", (e) => {
          e.preventDefault();
          overlay.open();
          modal.open(button);
          
          let location = button.getAttribute('data-location');
          // у модалці дві форми (для себе / для партнерів) — передаємо location в обидві
          modal.el.querySelectorAll('form').forEach((form) => {
            let input = form.querySelector('input[name="location"]');
            if (!input) {
              input = document.createElement('input');
              input.type = 'hidden';
              input.name = 'location';
              form.appendChild(input);
            }
            if (location) input.value = location;
          });
        });
      });
    }


    let phone = document.querySelectorAll(".js-phone");
    phone.forEach((element) => {
      new TelInput(element);
    });
    
    let phoneModal = document.querySelectorAll(".js-phone-modal");
    phoneModal.forEach((element) => {
      new TelInput(element);
    });

    document.querySelectorAll('[data-component="FormSwitch"]').forEach((element) => {
      new FormSwitch(element);
    });

    // клавіатура на телефоні, Enter → наступне поле, помилки під полями
    FormUX.initAll('form.c-form');

    let textAreas = document.querySelectorAll(".c-textarea");
    textAreas.forEach((element) => {
      new TextArea(element);
    });

    const NAV_SIZE = 48;   // діаметр
    const NAV_GAP  = 16;   // відступ від краю
    const NAV_SPACE = NAV_SIZE + NAV_GAP;
    
     const section = document.querySelector('.l-section.m-team');
     if (section) {
        const innerPrev = section.querySelector('.c-swiper .swiper-button-prev');
        const innerNext = section.querySelector('.c-swiper .swiper-button-next');
        const outerPrev = section.querySelector('.c-outer-swiper .swiper-button-prev');
        const outerNext = section.querySelector('.c-outer-swiper .swiper-button-next');
    
        const prevEls = [innerPrev, outerPrev].filter(Boolean);
        const nextEls = [innerNext, outerNext].filter(Boolean); 
        
        new Carousel('[data-carousel="TeamCarousel"]', {
          slidesPerView: 1,
          spaceBetween: 10,
          navigation: { prevEl: prevEls, nextEl: nextEls },
          pagination: { el: ".swiper-pagination", clickable: true },
          breakpoints: {
            0:    { slidesPerView: 1,   spaceBetween: 10 },
            375:  { slidesPerView: 1.2, spaceBetween: 24 },
            499:  { slidesPerView: 1.5, spaceBetween: 10 },
            767:  { slidesPerView: 2.8, spaceBetween: 10,  slidesOffsetBefore: NAV_SPACE, slidesOffsetAfter: NAV_SPACE },
            1025: { slidesPerView: 3,                    slidesOffsetBefore: NAV_SPACE, slidesOffsetAfter: NAV_SPACE },
            1400: { slidesPerView: 4,   spaceBetween: 5,   slidesOffsetBefore: NAV_SPACE, slidesOffsetAfter: NAV_SPACE },
          },
        }); 
     }
    
    // Відгуки: відео + галерея фото віз
    document.querySelectorAll('[data-component="VideoReview"]').forEach((element) => {
      new VideoReview(element);
    });

    // Слайдер відгуків: усі картки однакового розміру в один рядок
    const reviewsSlider = document.querySelector('[data-component="ReviewsSlider"]');
    if (reviewsSlider && window.Swiper) {
      const controls = reviewsSlider.nextElementSibling;
      new window.Swiper(reviewsSlider, {
        slidesPerView: 1.25,
        spaceBetween: 16,
        grabCursor: true,
        watchSlidesProgress: true,
        navigation: {
          prevEl: controls?.querySelector('.c-reviews-slider__nav.m-prev'),
          nextEl: controls?.querySelector('.c-reviews-slider__nav.m-next'),
        },
        pagination: { el: controls?.querySelector('.c-reviews-slider__pagination'), clickable: true },
        breakpoints: {
          500:  { slidesPerView: 2.2, spaceBetween: 16 },
          768:  { slidesPerView: 3,   spaceBetween: 24 },
          1025: { slidesPerView: 4,   spaceBetween: 24 },
        },
        on: {
          // відео, що виїхало за межі слайдера, ставимо на паузу
          slideChangeTransitionEnd: (swiper) => {
            swiper.slides.forEach((slide) => {
              if (slide.classList.contains('swiper-slide-visible')) return;
              slide.querySelector('video')?.pause();
            });
          },
        },
      });
    }
    document.querySelectorAll('[data-component="VisaGallery"]').forEach((element) => {
      new VisaGallery(element);
    });
    
    document.addEventListener('fetchit:success', (e) => {
        const { response, form } = e.detail;
        
        if (response && response.success) {
            form.classList.add('d-none');
            let formName = form.getAttribute('name');
            let successMessage = document.querySelector(`[data-form="${formName}"]`);
            successMessage?.classList.remove('d-none');

            let closeButton = document.querySelector('[data-component="CloseButton"]');
            // once: true — інакше після кожної відправки додавався б ще один слухач
            closeButton?.addEventListener('click', () => {
                form.classList.remove('d-none');
                successMessage?.classList.add('d-none');
            }, { once: true });
        }
    });

    // Поки не підключено бекенд форм: не даємо формі робити POST на статичну
    // сторінку (це дає помилку 405). Поля вже перевірив FormUX.
    if (!window.FetchIt) {
        document.querySelectorAll('form.c-form').forEach((form) => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.warn(`[forms] "${form.name || 'form'}": FetchIt не підключено — локально форма не відправляється.`);
            });
        });
    }

    // Актуальний рік у футері ("© <рік> All rights reserved")
    const currentYear = String(new Date().getFullYear());
    document.querySelectorAll('[data-current-year]').forEach((el) => {
      el.textContent = currentYear;
      el.setAttribute('datetime', currentYear);
    });

    defineScrollBarWidthCSSVar();

    // перехід за якорем з іншої сторінки (напр. /#contact): сторінка збирається й
    // підвантажує картинки вже після того, як браузер прокрутив — докручуємо ще раз
    if (location.hash.length > 1) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) {
        const go = () => target.scrollIntoView({ block: 'start' });
        go();
        if (document.readyState === 'complete') setTimeout(go, 300);
        else window.addEventListener('load', go, { once: true });
      }
    }
});
