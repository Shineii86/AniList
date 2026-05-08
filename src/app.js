// ===== AniList Clone - Main Entry Point =====
import { $, $$, debounce } from './utils.js';
import { loadUserData, currentUser, currentPage, setCurrentPage, selectedGenres, setSelectedGenres, getSearchHistory, clearSearchHistory, saveUserData } from './state.js';
import { QUERIES } from './config.js';
import { fetchFromAniList } from './api.js';
import { loadHomePage, performSearch, loadRankings, loadUserList, initBrowsePage, initializeSearchPage, exportList, importList, addCardClickListeners, initScrollAnimations } from './pages.js';
import { openAnimeModal, openListModal, closeAnimeModal, closeListModal, saveToList } from './modal.js';
import { init3DCards, initRipple, initSectionReveal, initCounterAnimation, initParallax, initKeyboardNav } from './interactions.js';

// ===== Theme =====
function initTheme() {
  const savedTheme = currentUser.preferences.theme;
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    updateThemeIcon('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    updateThemeIcon('light');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-color-scheme');
  if (current === 'dark') {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    currentUser.preferences.theme = 'light';
    updateThemeIcon('light');
  } else {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    currentUser.preferences.theme = 'dark';
    updateThemeIcon('dark');
  }
  saveUserData();
}

function updateThemeIcon(theme) {
  const lightIcon = $('.theme-icon--light');
  const darkIcon = $('.theme-icon--dark');
  if (theme === 'dark') {
    lightIcon?.classList.add('hidden');
    darkIcon?.classList.remove('hidden');
  } else {
    lightIcon?.classList.remove('hidden');
    darkIcon?.classList.add('hidden');
  }
}

// ===== Mobile Navigation =====
function initMobileNav() {
  const hamburger = $('#hamburgerBtn');
  const drawer = $('#mobileDrawer');
  const backdrop = $('#drawerBackdrop');
  const closeBtn = $('#drawerClose');

  if (!hamburger || !drawer) return;

  const openDrawer = () => {
    drawer.classList.add('is-open');
    hamburger.classList.add('is-active');
    hamburger.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    hamburger.classList.remove('is-active');
    hamburger.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', () => {
    drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
  });

  backdrop?.addEventListener('click', closeDrawer);
  closeBtn?.addEventListener('click', closeDrawer);

  drawer.querySelectorAll('.mobile-drawer__link').forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
      switchPage(link.dataset.page);
    });
  });
}

// ===== Genre Chips =====
function initGenreChips() {
  const genreFilter = $('#genreFilter');
  const selectedContainer = $('#selectedGenres');
  if (!genreFilter || !selectedContainer) return;

  genreFilter.addEventListener('change', () => {
    const genre = genreFilter.value;
    if (genre && !selectedGenres.includes(genre)) {
      selectedGenres.push(genre);
      renderGenreChips();
    }
    genreFilter.value = '';
  });
}

function renderGenreChips() {
  const container = $('#selectedGenres');
  if (!container) return;
  container.innerHTML = selectedGenres.map(g => `
    <span class="genre-chip">
      ${g}
      <button class="genre-chip__remove" data-genre="${g}" aria-label="Remove ${g}">&times;</button>
    </span>
  `).join('');

  container.querySelectorAll('.genre-chip__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const updated = selectedGenres.filter(g => g !== btn.dataset.genre);
      setSelectedGenres(updated);
      renderGenreChips();
    });
  });
}

// ===== Search Suggestions =====
const debouncedSearch = debounce(async (query) => {
  const suggestions = $('#searchSuggestions');
  if (!suggestions) return;

  if (query.length < 2) {
    showSearchHistoryOrHide();
    return;
  }

  try {
    const data = await fetchFromAniList(QUERIES.searchSuggestions, { search: query });
    const results = data.Page.media;

    if (results.length > 0) {
      suggestions.innerHTML = results.map(anime => {
        const title = anime.title?.english || anime.title?.romaji || 'Unknown';
        return `<div class="suggestion-item" data-anime-id="${anime.id}" role="option">${title}</div>`;
      }).join('');
      suggestions.classList.remove('hidden');
      suggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          suggestions.classList.add('hidden');
          $('#searchInput').value = item.textContent.trim();
          openAnimeModalFn(item.dataset.animeId);
        });
      });
    } else {
      suggestions.classList.add('hidden');
    }
  } catch (e) {
    suggestions.classList.add('hidden');
  }
}, 300);

function showSearchHistoryOrHide() {
  const suggestions = $('#searchSuggestions');
  const input = $('#searchInput');
  if (!suggestions || !input) return;

  if (input.value.trim().length > 0) {
    suggestions.classList.add('hidden');
    return;
  }

  const history = getSearchHistory();
  if (history.length === 0) {
    suggestions.classList.add('hidden');
    return;
  }

  suggestions.innerHTML = `
    <div class="search-history">
      <div class="search-history__header">
        <span>Recent Searches</span>
        <button class="search-history__clear" id="clearSearchHistory">Clear</button>
      </div>
      ${history.map(q => `
        <div class="search-history__item" data-query="${q}">
          <span class="search-history__icon">🕐</span>
          <span>${q}</span>
        </div>
      `).join('')}
    </div>
  `;
  suggestions.classList.remove('hidden');

  suggestions.querySelector('#clearSearchHistory')?.addEventListener('click', (e) => {
    e.stopPropagation();
    clearSearchHistory();
    suggestions.classList.add('hidden');
  });

  suggestions.querySelectorAll('.search-history__item').forEach(item => {
    item.addEventListener('click', () => {
      const query = item.dataset.query;
      input.value = query;
      suggestions.classList.add('hidden');
      switchPage('search');
      performSearch(query, {}, openAnimeModalFn, openListModalFn);
    });
  });
}

// ===== Page Switching =====
function switchPage(pageId) {
  $$('.nav__link').forEach(link => link.classList.toggle('active', link.dataset.page === pageId));
  $$('.mobile-drawer__link').forEach(link => link.classList.toggle('active', link.dataset.page === pageId));

  $$('.page').forEach(page => {
    const isTarget = page.id === `${pageId}Page`;
    page.classList.toggle('active', isTarget);
    page.classList.toggle('hidden', !isTarget);
    if (isTarget) {
      page.classList.remove('page-transition');
      void page.offsetWidth;
      page.classList.add('page-transition');
    }
  });

  setCurrentPage(pageId);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (pageId) {
    case 'home': loadHomePage(openAnimeModalFn, openListModalFn); break;
    case 'search': initializeSearchPage(); break;
    case 'browse': initBrowsePage(openAnimeModalFn, openListModalFn); break;
    case 'rankings': loadRankings('all', openAnimeModalFn, openListModalFn); break;
    case 'lists': loadUserList('watching', openAnimeModalFn, openListModalFn); break;
  }
}

// ===== Modal Wrappers (to avoid circular deps) =====
function openAnimeModalFn(animeId) {
  openAnimeModal(animeId, openListModalFn);
}

function openListModalFn(animeId) {
  openListModal(animeId);
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  initTheme();
  initMobileNav();
  initGenreChips();

  // Navigation
  $$('.nav__link').forEach(link => {
    link.addEventListener('click', () => switchPage(link.dataset.page));
  });

  // Theme toggle
  $('#themeToggle')?.addEventListener('click', toggleTheme);

  // Search
  const searchInput = $('#searchInput');
  const searchButton = $('#searchButton');
  const searchSuggestions = $('#searchSuggestions');

  searchButton?.addEventListener('click', () => {
    const query = searchInput?.value?.trim();
    if (query) { switchPage('search'); performSearch(query, {}, openAnimeModalFn, openListModalFn); }
  });

  searchInput?.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length >= 2) debouncedSearch(query);
    else showSearchHistoryOrHide();
  });

  searchInput?.addEventListener('focus', () => {
    if (!searchInput.value.trim()) showSearchHistoryOrHide();
  });

  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = searchInput.value.trim();
      if (query) { switchPage('search'); performSearch(query, {}, openAnimeModalFn, openListModalFn); searchSuggestions?.classList.add('hidden'); }
    }
  });

  document.addEventListener('click', (e) => {
    if (searchSuggestions && !searchInput?.contains(e.target) && !searchSuggestions.contains(e.target)) {
      searchSuggestions.classList.add('hidden');
    }
  });

  // Search filters
  $('#applyFilters')?.addEventListener('click', () => {
    const filters = {
      genres: selectedGenres.length > 0 ? [...selectedGenres] : undefined,
      year: $('#yearFilter')?.value || '',
      status: $('#statusFilter')?.value || '',
      format: $('#formatFilter')?.value || '',
      sort: $('#sortFilter')?.value || 'POPULARITY_DESC'
    };
    performSearch(searchInput?.value?.trim() || '', filters, openAnimeModalFn, openListModalFn);
  });

  // Rankings
  $$('[data-ranking]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-ranking]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadRankings(btn.dataset.ranking, openAnimeModalFn, openListModalFn);
    });
  });

  // Lists
  $$('[data-list]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-list]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadUserList(btn.dataset.list, openAnimeModalFn, openListModalFn);
    });
  });

  // Export/Import
  $('#exportListBtn')?.addEventListener('click', exportList);
  $('#importListInput')?.addEventListener('change', (e) => {
    if (e.target.files[0]) importList(e.target.files[0], openAnimeModalFn, openListModalFn);
    e.target.value = '';
  });

  // Hero actions
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    switch (action) {
      case 'start-search':
        switchPage('search');
        searchInput?.focus();
        break;
      case 'view-trending':
        switchPage('rankings');
        loadRankings('trending', openAnimeModalFn, openListModalFn);
        break;
      case 'view-all-trending':
        switchPage('rankings');
        loadRankings('trending', openAnimeModalFn, openListModalFn);
        break;
      case 'view-seasonal':
        switchPage('browse');
        break;
      case 'view-popular-year':
        switchPage('rankings');
        loadRankings('popular', openAnimeModalFn, openListModalFn);
        break;
      case 'view-top100':
        switchPage('rankings');
        loadRankings('all', openAnimeModalFn, openListModalFn);
        break;
    }
  });

  // Browse categories (legacy support)
  $$('[data-browse]').forEach(card => {
    card.addEventListener('click', () => switchPage('browse'));
  });

  // Modals
  $('#closeModal')?.addEventListener('click', closeAnimeModal);
  $('#closeListModal')?.addEventListener('click', closeListModal);

  $('#animeModal')?.addEventListener('click', (e) => {
    if (e.target === $('#animeModal') || e.target.classList.contains('modal__backdrop')) closeAnimeModal();
  });
  $('#listModal')?.addEventListener('click', (e) => {
    if (e.target === $('#listModal') || e.target.classList.contains('modal__backdrop')) closeListModal();
  });

  $('#saveToList')?.addEventListener('click', () => saveToList(currentPage, openAnimeModalFn, openListModalFn));
  $('#cancelList')?.addEventListener('click', closeListModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#animeModal')?.classList.contains('hidden')) closeAnimeModal();
      else if (!$('#listModal')?.classList.contains('hidden')) closeListModal();
    }
  });

  // Initialize
  loadHomePage(openAnimeModalFn, openListModalFn);

  // Micro-interactions & Effects
  init3DCards();
  initRipple();
  initSectionReveal();
  initCounterAnimation();
  initParallax();
  initKeyboardNav();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => console.log('AniClone loaded successfully!'));
}
