// Прості сторінки (404, Privacy Policy): лише шапка (меню) і рік у футері — без модалок і каруселей.
import Header from "./Header.js";

const ready = () =>
  new Promise((resolve) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", resolve, { once: true });
    } else {
      resolve();
    }
  }).then(() => window.includesReady);

ready().then(() => {
  new Header();
  // тут немає модалки з формою — "Contact us" веде до форми на головній
  document.querySelectorAll(".js-contact-us-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/#contact";
    });
  });
  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-current-year]").forEach((el) => {
    el.textContent = year;
    el.setAttribute("datetime", year);
  });
});
