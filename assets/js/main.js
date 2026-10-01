/* ==========================================================================
   ПОЛИГОН — поведение страницы
   Шапка при скролле, мобильное меню, появление блоков, фильтр работ
   ========================================================================== */
(function () {
  'use strict';

  var header = document.getElementById('header');
  var progress = document.getElementById('scrollProgress');
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Шапка и индикатор прокрутки ---------- */
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (header) header.classList.toggle('is-scrolled', y > 24);
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.width = (max > 0 ? Math.min(1, y / max) * 100 : 0) + '%';
      }
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Мобильное меню ---------- */
  function closeMenu() {
    if (!nav || !burger) return;
    nav.classList.remove('is-open');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    document.body.classList.remove('menu-open');
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      document.body.classList.toggle('menu-open', open);
    });

    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 760) closeMenu();
    });
  }

  /* ---------- Появление блоков при прокрутке ---------- */
  var revealItems = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));

  function groupDelay(items) {
    // лёгкий каскад внутри общего родителя
    var byParent = new Map();
    items.forEach(function (el) {
      var key = el.parentElement;
      var n = byParent.get(key) || 0;
      el.style.setProperty('--reveal-delay', Math.min(n, 6) * 70 + 'ms');
      byParent.set(key, n + 1);
    });
  }

  groupDelay(revealItems);

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    revealItems.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Счётчики в фактах первого экрана ---------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));

  function runCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    var duration = 1200;
    var start = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - start) / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = String(Math.round(target * eased));
      if (p < 1) window.requestAnimationFrame(tick);
    }
    el.textContent = '0';
    window.requestAnimationFrame(tick);
  }

  if (counters.length && 'IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach(function (el) { counterObserver.observe(el); });
  }

  /* ---------- Активный пункт меню по секциям ---------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute('href') || '';
      return id.charAt(0) === '#' ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            link.classList.toggle('is-active', link.getAttribute('href') === '#' + entry.target.id);
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ---------- Фильтр работ ---------- */
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll('.filters__btn'));
  var workCards = Array.prototype.slice.call(document.querySelectorAll('.work-card'));

  filterButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var filter = button.getAttribute('data-filter') || 'all';
      filterButtons.forEach(function (other) {
        other.classList.toggle('is-active', other === button);
      });
      workCards.forEach(function (card, index) {
        var match = filter === 'all' || card.getAttribute('data-category') === filter;
        card.classList.toggle('is-hidden', !match);
        if (match && !reduceMotion) {
          card.style.transition = 'none';
          card.style.opacity = '0';
          card.style.transform = 'translateY(14px)';
          window.requestAnimationFrame(function () {
            card.style.transition = 'opacity .45s ease ' + Math.min(index, 6) * 45 + 'ms, transform .45s ease ' +
              Math.min(index, 6) * 45 + 'ms';
            card.style.opacity = '1';
            card.style.transform = 'none';
          });
        }
      });
    });
  });

  /* ---------- Форма заявки (демо без отправки) ---------- */
  var form = document.getElementById('orderForm');
  var hint = document.getElementById('formHint');
  var defaultHint = hint ? hint.textContent : '';

  if (form && hint) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      hint.textContent = 'Заявка не отправлена: это визуальный каркас страницы. Подключение формы — следующий этап.';
      hint.classList.add('is-ok');
      window.setTimeout(function () {
        hint.textContent = defaultHint;
        hint.classList.remove('is-ok');
      }, 6000);
    });
  }

  /* ---------- Плавный якорь с учётом фиксированной шапки ---------- */
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="#"]');
    if (!link) return;
    var id = link.getAttribute('href');
    if (id === '#' || id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    event.preventDefault();
    var offset = (header ? header.offsetHeight : 0) + 12;
    var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();
