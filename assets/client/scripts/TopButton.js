class TopButton {
    constructor(element) {
        this.element = element;
        this.class = {
            active: 'm-active'
        }

        this.bindEvents();
    }

    bindEvents(){
        this.element.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('scroll', (e) => this.onScroll(e));
    }

    onClick(e) {
        e.preventDefault();

        window.scrollTo(0, 0);
    }

    onScroll(e) {
        if (window.scrollY > window.innerHeight) {
            this.element.classList.add(this.class.active);
        } else if (this.element.classList.contains(this.class.active)) {
            this.element.classList.remove(this.class.active);
        }
    }
}

export default TopButton;