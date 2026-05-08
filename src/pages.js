// ===== Page Functions =====
import { QUERIES, GENRES, GENRE_ICONS, STUDIO_LIST, YEARS, SEASONS, SEASON_ICONS, SEASON_NAMES, STATUSES, FORMATS } from './config.js';
import { fetchFromAniList } from './api.js';
import { currentUser, addToSearchHistory, selectedGenres, saveUserData } from './state.js';
import { $, $$, showError, showToast, getCurrentSeason } from './utils.js';
import { createAnimeCard, createSkeletonCard } from './components.js';

// ===== Card Event Listeners =====
export function addCardClickListeners(container, openAnimeModalFn, openListModalFn) {
  container.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn')) return;
      openAnimeModalFn(card.dataset.animeId);
    });
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') openAnimeModalFn(card.dataset.animeId);
    });
  });
  container.querySelectorAll('[data-action="add-to-list"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openListModalFn(btn.dataset.animeId);
    });
  });
}

// ===== Card Reveal Animation =====
export function animateCards(container) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = container.querySelectorAll('.anime-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, i * 50);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.4s var(--ease-standard), transform 0.4s var(--ease-standard)';
    observer.observe(card);
  });
}

// ===== Scroll Animations =====
export function initScrollAnimations() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    $$('.scroll-reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  $$('.scroll-reveal').forEach(el => observer.observe(el));
}

// ===== Home Page =====
export async function loadHomePage(openAnimeModalFn, openListModalFn) {
  initScrollAnimations();
  await Promise.all([
    loadCarouselAnime(),
    loadTrendingAnime(openAnimeModalFn, openListModalFn),
    loadSeasonalAnime(openAnimeModalFn, openListModalFn),
    loadPopularThisYear(openAnimeModalFn, openListModalFn),
    loadTop100(openAnimeModalFn, openListModalFn),
    loadRecentlyUpdated(openAnimeModalFn, openListModalFn)
  ]);
}

async function loadCarouselAnime() {
  try {
    const data = await fetchFromAniList(QUERIES.trending, { page: 1, perPage: 8 });
    const { initCarousel } = await import('./carousel.js');
    initCarousel(data.Page.media.slice(0, 6));
  } catch (e) { console.error('Failed to load carousel:', e); }
}

async function loadTrendingAnime(openAnimeModalFn, openListModalFn) {
  const container = $('#trendingGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const data = await fetchFromAniList(QUERIES.trending, { page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load trending anime.'); }
}

async function loadSeasonalAnime(openAnimeModalFn, openListModalFn) {
  const container = $('#seasonalGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const year = new Date().getFullYear();
    const season = getCurrentSeason();
    const data = await fetchFromAniList(QUERIES.seasonal, { year, season, page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load seasonal anime.'); }
}

async function loadPopularThisYear(openAnimeModalFn, openListModalFn) {
  const container = $('#popularYearGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const year = new Date().getFullYear();
    const data = await fetchFromAniList(QUERIES.popularThisYear, { year, page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load popular anime.'); }
}

async function loadTop100(openAnimeModalFn, openListModalFn) {
  const container = $('#top100Grid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const data = await fetchFromAniList(QUERIES.topRated, { page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map((a, i) => createAnimeCard(a, i + 1)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load top anime.'); }
}

async function loadRecentlyUpdated(openAnimeModalFn, openListModalFn) {
  const container = $('#recentlyUpdatedGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const data = await fetchFromAniList(QUERIES.popular, { page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load recently updated anime.'); }
}

// ===== Search =====
export async function performSearch(query, filters = {}, openAnimeModalFn, openListModalFn) {
  const container = $('#searchGrid');
  const resultsText = $('#searchResultsText');
  if (!container || !resultsText) return;

  if (!query && Object.keys(filters).length === 0) {
    container.innerHTML = '';
    resultsText.textContent = 'Enter a search term or use filters to find anime';
    return;
  }

  if (query) addToSearchHistory(query);

  container.innerHTML = Array(12).fill(0).map(createSkeletonCard).join('');
  resultsText.textContent = 'Searching...';

  try {
    const variables = {
      search: query || undefined,
      genre: filters.genres?.length === 1 ? filters.genres[0] : undefined,
      genre_in: filters.genres?.length > 1 ? filters.genres : undefined,
      year: filters.year ? parseInt(filters.year) : undefined,
      status: filters.status || undefined,
      format: filters.format || undefined,
      sort: [filters.sort || 'POPULARITY_DESC'],
      page: 1,
      perPage: 20
    };

    const data = await fetchFromAniList(QUERIES.search, variables);
    const animeList = data.Page.media;

    if (animeList.length === 0) {
      container.innerHTML = `<div class="error-message"><h3>No results found</h3><p>Try adjusting your search criteria</p></div>`;
      resultsText.textContent = 'No results found';
      return;
    }

    container.innerHTML = animeList.map(a => createAnimeCard(a)).join('');
    resultsText.textContent = `Found ${animeList.length} results`;
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) {
    showError(container, 'Failed to search anime.');
    resultsText.textContent = 'Search failed';
  }
}

// ===== Rankings =====
export async function loadRankings(type = 'all', openAnimeModalFn, openListModalFn) {
  const container = $('#rankingsGrid');
  if (!container) return;
  container.innerHTML = Array(20).fill(0).map(createSkeletonCard).join('');

  let query, variables;
  switch (type) {
    case 'popular': query = QUERIES.popular; variables = { page: 1, perPage: 20 }; break;
    case 'trending': query = QUERIES.trending; variables = { page: 1, perPage: 20 }; break;
    default: query = QUERIES.topRated; variables = { page: 1, perPage: 20 };
  }

  try {
    const data = await fetchFromAniList(query, variables);
    container.innerHTML = data.Page.media.map((a, i) => createAnimeCard(a, i + 1)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load rankings.'); }
}

// ===== Browse Page =====
export function initBrowsePage(openAnimeModalFn, openListModalFn) {
  // Genre grid
  const genreGrid = $('#genreGrid');
  if (genreGrid) {
    genreGrid.innerHTML = GENRES.map(g => `
      <div class="genre-grid__item" data-genre="${g}" tabindex="0">
        <span class="genre-grid__icon">${GENRE_ICONS[g] || '🎬'}</span>
        <span class="genre-grid__name">${g}</span>
      </div>
    `).join('');

    genreGrid.querySelectorAll('.genre-grid__item').forEach(item => {
      item.addEventListener('click', () => loadBrowseByGenre(item.dataset.genre, openAnimeModalFn, openListModalFn));
      item.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadBrowseByGenre(item.dataset.genre, openAnimeModalFn, openListModalFn); });
    });
  }

  // Year timeline
  const yearTimeline = $('#yearTimeline');
  if (yearTimeline) {
    yearTimeline.innerHTML = YEARS.slice(0, 30).map(y => `
      <button class="year-btn" data-year="${y}">${y}</button>
    `).join('');

    yearTimeline.querySelectorAll('.year-btn').forEach(btn => {
      btn.addEventListener('click', () => loadBrowseByYear(btn.dataset.year, openAnimeModalFn, openListModalFn));
    });
  }

  // Studios
  const studioGrid = $('#studioGrid');
  if (studioGrid) {
    studioGrid.innerHTML = STUDIO_LIST.map(s => `
      <div class="studio-card" data-studio="${s}" tabindex="0">
        <div class="studio-card__name">${s}</div>
      </div>
    `).join('');

    studioGrid.querySelectorAll('.studio-card').forEach(card => {
      card.addEventListener('click', () => loadBrowseByStudio(card.dataset.studio, openAnimeModalFn, openListModalFn));
    });
  }

  // Seasonal
  const seasonalGrid2 = $('#seasonalGrid2');
  if (seasonalGrid2) {
    const currentYear = new Date().getFullYear();
    const combos = [];
    for (let y = currentYear; y >= currentYear - 3; y--) {
      for (const s of SEASONS) {
        combos.push({ year: y, season: s });
      }
    }
    seasonalGrid2.innerHTML = combos.map(c => `
      <div class="seasonal-card" data-year="${c.year}" data-season="${c.season}" tabindex="0">
        <div class="seasonal-card__icon">${SEASON_ICONS[c.season]}</div>
        <div class="seasonal-card__name">${SEASON_NAMES[c.season]}</div>
        <div class="seasonal-card__year">${c.year}</div>
      </div>
    `).join('');

    seasonalGrid2.querySelectorAll('.seasonal-card').forEach(card => {
      card.addEventListener('click', () => loadBrowseBySeason(card.dataset.year, card.dataset.season, openAnimeModalFn, openListModalFn));
    });
  }

  // Tab switching
  $$('.browse-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.browse-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.browse-panel').forEach(p => p.classList.remove('active'));
      const panelId = 'browse' + tab.dataset.browseTab.charAt(0).toUpperCase() + tab.dataset.browseTab.slice(1);
      $(`#${panelId}`)?.classList.add('active');
      $('#browseResults')?.classList.add('hidden');
    });
  });

  // Back button
  $('#browseBackBtn')?.addEventListener('click', () => {
    $('#browseResults')?.classList.add('hidden');
    $$('.browse-panel.active').forEach(p => p.style.display = '');
  });
}

async function loadBrowseByGenre(genre, openAnimeModalFn, openListModalFn) {
  const container = $('#browseGrid');
  const results = $('#browseResults');
  const title = $('#browseResultsTitle');
  if (!container || !results) return;

  $$('.browse-panel').forEach(p => p.classList.remove('active'));
  results.classList.remove('hidden');
  if (title) title.textContent = `${genre} Anime`;
  container.innerHTML = Array(12).fill(0).map(createSkeletonCard).join('');

  try {
    const data = await fetchFromAniList(QUERIES.byGenre, { genre, page: 1, perPage: 20 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load ${genre} anime.`); }
}

async function loadBrowseByYear(year, openAnimeModalFn, openListModalFn) {
  const container = $('#browseGrid');
  const results = $('#browseResults');
  const title = $('#browseResultsTitle');
  if (!container || !results) return;

  $$('.browse-panel').forEach(p => p.classList.remove('active'));
  results.classList.remove('hidden');
  if (title) title.textContent = `Anime from ${year}`;
  container.innerHTML = Array(12).fill(0).map(createSkeletonCard).join('');

  try {
    const data = await fetchFromAniList(QUERIES.byYear, { year: parseInt(year), page: 1, perPage: 20 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load anime from ${year}.`); }
}

async function loadBrowseByStudio(studio, openAnimeModalFn, openListModalFn) {
  const container = $('#browseGrid');
  const results = $('#browseResults');
  const title = $('#browseResultsTitle');
  if (!container || !results) return;

  $$('.browse-panel').forEach(p => p.classList.remove('active'));
  results.classList.remove('hidden');
  if (title) title.textContent = `${studio} Anime`;
  container.innerHTML = Array(12).fill(0).map(createSkeletonCard).join('');

  try {
    const data = await fetchFromAniList(QUERIES.byStudio, { studio, page: 1, perPage: 20 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load ${studio} anime.`); }
}

async function loadBrowseBySeason(year, season, openAnimeModalFn, openListModalFn) {
  const container = $('#browseGrid');
  const results = $('#browseResults');
  const title = $('#browseResultsTitle');
  if (!container || !results) return;

  $$('.browse-panel').forEach(p => p.classList.remove('active'));
  results.classList.remove('hidden');
  if (title) title.textContent = `${SEASON_NAMES[season]} ${year} Anime`;
  container.innerHTML = Array(12).fill(0).map(createSkeletonCard).join('');

  try {
    const data = await fetchFromAniList(QUERIES.seasonal, { year: parseInt(year), season, page: 1, perPage: 20 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container, openAnimeModalFn, openListModalFn);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load seasonal anime.`); }
}

// ===== User Lists =====
export function loadUserList(listType, openAnimeModalFn, openListModalFn) {
  const container = $('#listsGrid');
  const emptyState = $('#emptyList');
  if (!container || !emptyState) return;

  const list = currentUser.lists[listType] || [];
  if (list.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    updateListStats();
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = list.map(anime => {
    let card = createAnimeCard(anime);
    card = card.replace('</div>\n    </div>', `
      <div class="list-progress">
        Progress: ${anime.progress || 0}/${anime.episodes || '?'}
        ${anime.score ? ` | Score: ${anime.score}/10` : ''}
      </div>
    </div>`);
    return card;
  }).join('');

  addCardClickListeners(container, openAnimeModalFn, openListModalFn);
  initDragAndDrop(container, listType, openAnimeModalFn, openListModalFn);
  updateListStats();
}

function initDragAndDrop(container, listType, openAnimeModalFn, openListModalFn) {
  const cards = container.querySelectorAll('.anime-card');
  let draggedCard = null;

  cards.forEach(card => {
    card.setAttribute('draggable', 'true');

    card.addEventListener('dragstart', (e) => {
      draggedCard = card;
      card.classList.add('is-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', card.dataset.animeId);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('is-dragging');
      container.querySelectorAll('.anime-card').forEach(c => c.classList.remove('drag-over'));
      draggedCard = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (!draggedCard || draggedCard === card) return;

      const fromId = parseInt(draggedCard.dataset.animeId);
      const toId = parseInt(card.dataset.animeId);
      const list = currentUser.lists[listType];
      const fromIdx = list.findIndex(a => a.id === fromId);
      const toIdx = list.findIndex(a => a.id === toId);

      if (fromIdx !== -1 && toIdx !== -1) {
        const [item] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, item);
        saveUserData();
        loadUserList(listType, openAnimeModalFn, openListModalFn);
        showToast('List reordered!', 'success');
      }
    });
  });
}

function updateListStats() {
  let totalAnime = 0, totalEpisodes = 0, totalScore = 0, scoredCount = 0, totalMinutes = 0;

  for (const listType in currentUser.lists) {
    const list = currentUser.lists[listType];
    totalAnime += list.length;
    list.forEach(a => {
      totalEpisodes += a.progress || 0;
      if (a.score) { totalScore += a.score; scoredCount++; }
      totalMinutes += (a.progress || 0) * (a.duration || 24);
    });
  }

  const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : '0';
  const hours = Math.round(totalMinutes / 60);

  const el = (id, val) => { const e = $(id); if (e) e.textContent = val; };
  el('#statTotalAnime', totalAnime);
  el('#statTotalEpisodes', totalEpisodes);
  el('#statAvgScore', avgScore);
  el('#statTimeSpent', `${hours}h`);
}

// ===== Export/Import =====
export function exportList() {
  const data = JSON.stringify(currentUser.lists, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anilist-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('List exported successfully!', 'success');
}

export function importList(file, openAnimeModalFn, openListModalFn) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      const validKeys = ['watching', 'completed', 'planning', 'paused', 'dropped'];
      const isValid = validKeys.some(k => Array.isArray(imported[k]));
      if (!isValid) throw new Error('Invalid format');

      for (const key of validKeys) {
        if (Array.isArray(imported[key])) {
          const existingIds = new Set(currentUser.lists[key].map(a => a.id));
          imported[key].forEach(item => {
            if (!existingIds.has(item.id)) {
              currentUser.lists[key].push(item);
            }
          });
        }
      }
      saveUserData();
      showToast('List imported successfully!', 'success');
      const activeListBtn = $('.lists-nav .btn.active');
      if (activeListBtn) loadUserList(activeListBtn.dataset.list, openAnimeModalFn, openListModalFn);
    } catch (err) {
      showToast('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

// ===== Search Page Init =====
export function initializeSearchPage() {
  const genreFilter = $('#genreFilter');
  const yearFilter = $('#yearFilter');
  const statusFilter = $('#statusFilter');
  const formatFilter = $('#formatFilter');

  if (genreFilter && genreFilter.children.length === 1) {
    GENRES.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      genreFilter.appendChild(opt);
    });
  }
  if (yearFilter && yearFilter.children.length === 1) {
    YEARS.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearFilter.appendChild(opt);
    });
  }
  if (statusFilter && statusFilter.children.length === 1) {
    STATUSES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.value;
      opt.textContent = s.label;
      statusFilter.appendChild(opt);
    });
  }
  if (formatFilter && formatFilter.children.length === 1) {
    FORMATS.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.value;
      opt.textContent = f.label;
      formatFilter.appendChild(opt);
    });
  }
}
