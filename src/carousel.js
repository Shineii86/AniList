// ===== Hero Carousel =====
import { $, $$, getDisplayTitle } from './utils.js';
import { carouselIndex, carouselPaused, carouselInterval, featuredAnimeList, setCarouselIndex, setCarouselPaused, setCarouselInterval, setFeaturedAnimeList } from './state.js';

export function initCarousel(animeList, openAnimeModalFn) {
  setFeaturedAnimeList(animeList);
  const track = $('#carouselTrack');
  const dots = $('#carouselDots');
  if (!track || !dots) return;

  track.innerHTML = animeList.map((anime, i) => `
    <div class="hero-carousel__slide" data-anime-id="${anime.id}" data-index="${i}">
      <div class="hero-carousel__bg" style="background-image: url('${anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large}')"></div>
      <div class="hero-carousel__info">
        <div class="hero-carousel__cover">
          <img src="${anime.coverImage.large}" alt="${getDisplayTitle(anime)}" loading="lazy">
        </div>
        <div class="hero-carousel__text">
          <h2 class="hero-carousel__title">${getDisplayTitle(anime)}</h2>
          <div class="hero-carousel__meta">
            ${anime.averageScore ? `<span class="hero-carousel__score">★ ${anime.averageScore}</span>` : ''}
            <span>${anime.episodes || '?'} episodes</span>
          </div>
          <div class="hero-carousel__genres">
            ${(anime.genres || []).slice(0, 4).map(g => `<span class="hero-carousel__genre">${g}</span>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `).join('');

  dots.innerHTML = animeList.map((_, i) => `
    <button class="hero-carousel__dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Go to slide ${i + 1}"></button>
  `).join('');

  // Click handlers
  track.querySelectorAll('.hero-carousel__slide').forEach(slide => {
    slide.addEventListener('click', () => openAnimeModalFn(slide.dataset.animeId));
  });
  dots.querySelectorAll('.hero-carousel__dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
  });

  $('#carouselPrev')?.addEventListener('click', () => goToSlide(carouselIndex - 1));
  $('#carouselNext')?.addEventListener('click', () => goToSlide(carouselIndex + 1));

  // Pause on hover
  const carousel = $('#heroCarousel');
  carousel?.addEventListener('mouseenter', () => setCarouselPaused(true));
  carousel?.addEventListener('mouseleave', () => setCarouselPaused(false));

  startCarousel();
}

export function goToSlide(index) {
  const total = featuredAnimeList.length;
  if (total === 0) return;
  const newIndex = ((index % total) + total) % total;
  setCarouselIndex(newIndex);

  const track = $('#carouselTrack');
  if (track) track.style.transform = `translateX(-${newIndex * 100}%)`;

  $$('.hero-carousel__dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === newIndex);
  });
}

export function startCarousel() {
  if (carouselInterval) clearInterval(carouselInterval);
  setCarouselInterval(setInterval(() => {
    if (!carouselPaused) goToSlide(carouselIndex + 1);
  }, 5000));
}
