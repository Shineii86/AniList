// ===== Global State =====
import { SEARCH_HISTORY_KEY, MAX_SEARCH_HISTORY } from './config.js';

export let currentPage = 'home';
export let currentUser = {
  lists: { watching: [], completed: [], planning: [], paused: [], dropped: [] },
  preferences: { theme: 'auto' }
};
export let searchTimeout = null;
export let currentAnimeId = null;
export let currentFilters = {};
export let carouselIndex = 0;
export let carouselInterval = null;
export let carouselPaused = false;
export let featuredAnimeList = [];
export let selectedGenres = [];

// ===== State Setters =====
export function setCurrentPage(page) { currentPage = page; }
export function setCurrentAnimeId(id) { currentAnimeId = id; }
export function setCarouselIndex(i) { carouselIndex = i; }
export function setCarouselPaused(paused) { carouselPaused = paused; }
export function setCarouselInterval(interval) { carouselInterval = interval; }
export function setFeaturedAnimeList(list) { featuredAnimeList = list; }
export function setSelectedGenres(genres) { selectedGenres = genres; }

// ===== Local Storage =====
export function saveUserData() {
  try { localStorage.setItem('aniclone_user', JSON.stringify(currentUser)); }
  catch (e) { console.warn('Failed to save user data:', e); }
}

export function loadUserData() {
  try {
    const saved = localStorage.getItem('aniclone_user');
    if (saved) currentUser = { ...currentUser, ...JSON.parse(saved) };
  } catch (e) { console.warn('Failed to load user data:', e); }
}

export function isInUserList(animeId) {
  for (const listType in currentUser.lists) {
    if (currentUser.lists[listType].some(item => item.id === animeId)) return listType;
  }
  return null;
}

export function addToUserList(listType, animeData) {
  for (const type in currentUser.lists) {
    currentUser.lists[type] = currentUser.lists[type].filter(item => item.id !== animeData.id);
  }
  currentUser.lists[listType].push({
    ...animeData,
    addedAt: new Date().toISOString(),
    progress: animeData.progress || 0,
    score: animeData.score || null,
    notes: animeData.notes || ''
  });
  saveUserData();
}

// ===== Search History =====
export function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
  } catch { return []; }
}

export function addToSearchHistory(query) {
  if (!query || query.length < 2) return;
  let history = getSearchHistory();
  history = history.filter(h => h !== query);
  history.unshift(query);
  if (history.length > MAX_SEARCH_HISTORY) history = history.slice(0, MAX_SEARCH_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

export function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}
