// ===== Micro-Interactions & Effects =====
// 2026 trending: 3D tilt, magnetic buttons, ripple, parallax

import { $$ } from './utils.js';

// ===== 3D Card Tilt Effect =====
export function init3DCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if ('ontouchstart' in window) return; // Skip on touch devices

  document.addEventListener('mousemove', (e) => {
    const cards = $$('.anime-card:hover, .genre-grid__item:hover, .studio-card:hover, .seasonal-card:hover');
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
    });
  });

  document.addEventListener('mouseleave', (e) => {
    if (e.target.closest('.anime-card, .genre-grid__item, .studio-card, .seasonal-card')) {
      e.target.style.transform = '';
    }
  }, true);

  // Reset on mouse leave from cards
  $$('.anime-card, .genre-grid__item, .studio-card, .seasonal-card').forEach(card => {
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      setTimeout(() => { card.style.transition = ''; }, 400);
    });
  });
}

// ===== Button Ripple Effect =====
export function initRipple() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    btn.style.setProperty('--ripple-x', `${x}%`);
    btn.style.setProperty('--ripple-y', `${y}%`);
  });
}

// ===== Smooth Section Reveal =====
export function initSectionReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

  // Observe sections
  $$('.section, .detail-section, .list-stats__card, .browse-panel').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'opacity 0.6s cubic-bezier(0.19, 1, 0.22, 1), transform 0.6s cubic-bezier(0.19, 1, 0.22, 1)';
    observer.observe(el);
  });
}

// ===== Counter Animation for Stats =====
export function initCounterAnimation() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.textContent);
        if (isNaN(target) || target === 0) return;

        let current = 0;
        const increment = target / 30;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            el.textContent = target;
            clearInterval(timer);
          } else {
            el.textContent = Math.floor(current);
          }
        }, 30);

        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  $$('.list-stats__value').forEach(el => observer.observe(el));
}

// ===== Parallax on Hero Carousel =====
export function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const rate = scrolled * 0.3;
    const bg = carousel.querySelector('.hero-carousel__bg');
    if (bg && scrolled < 600) {
      bg.style.transform = `translateY(${rate}px)`;
    }
  }, { passive: true });
}

// ===== Keyboard Navigation Enhancement =====
export function initKeyboardNav() {
  document.addEventListener('keydown', (e) => {
    // Arrow key navigation for grids
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const focused = document.activeElement;
      if (!focused?.classList.contains('anime-card')) return;

      const cards = [...focused.closest('.anime-grid, .anime-grid--horizontal')?.querySelectorAll('.anime-card') || []];
      const index = cards.indexOf(focused);
      if (index === -1) return;

      const next = e.key === 'ArrowRight' ? index + 1 : index - 1;
      if (cards[next]) {
        e.preventDefault();
        cards[next].focus();
      }
    }
  });
}
