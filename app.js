// AniList API Configuration
const ANILIST_API_URL = 'https://graphql.anilist.co';

// ===== API Cache with TTL =====
const apiCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  apiCache.delete(key);
  return null;
}

function setCache(key, data) {
  apiCache.set(key, { data, ts: Date.now() });
  // Evict old entries if cache grows too large
  if (apiCache.size > 100) {
    const oldest = apiCache.keys().next().value;
    apiCache.delete(oldest);
  }
}

// ===== GraphQL Queries =====
const QUERIES = {
  trending: `query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { romaji english } coverImage { large extraLarge }
        bannerImage averageScore popularity genres status format
        episodes duration season seasonYear studios { nodes { name } }
      }
    }
  }`,

  popular: `query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  popularThisYear: `query ($year: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, seasonYear: $year, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large extraLarge }
        bannerImage averageScore genres status episodes
      }
    }
  }`,

  seasonal: `query ($year: Int, $season: MediaSeason, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(seasonYear: $year, season: $season, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore status episodes genres
      }
    }
  }`,

  search: `query ($search: String, $genre: String, $genre_in: [String], $year: Int, $status: MediaStatus, $format: MediaFormat, $sort: [MediaSort], $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, genre: $genre, genre_in: $genre_in, seasonYear: $year, status: $status, format: $format, type: ANIME, sort: $sort) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes format
      }
    }
  }`,

  details: `query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id title { romaji english native } description
      coverImage { large extraLarge } bannerImage
      averageScore popularity favourites genres status format
      episodes duration source season seasonYear
      studios { nodes { name } }
      trailer { id site thumbnail }
      externalLinks { site url }
      characters(sort: ROLE, perPage: 12) {
        nodes { id name { full } image { large } }
      }
      staff(sort: RELEVANCE, perPage: 8) {
        edges { role node { id name { full } image { large } } }
      }
      recommendations(perPage: 6) {
        nodes {
          mediaRecommendation {
            id title { romaji } coverImage { large } averageScore
          }
        }
      }
    }
  }`,

  topRated: `query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(type: ANIME, sort: SCORE_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  genres: `query { GenreCollection }`,

  searchSuggestions: `query ($search: String) {
    Page(page: 1, perPage: 5) {
      media(search: $search, type: ANIME) {
        id title { romaji english }
      }
    }
  }`,

  byGenre: `query ($genre: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  byYear: `query ($year: Int, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`,

  byStudio: `query ($studio: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(studio: $studio, type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english } coverImage { large }
        averageScore genres status episodes
      }
    }
  }`
};

// ===== Global State =====
let currentPage = 'home';
let currentUser = {
  lists: { watching: [], completed: [], planning: [], paused: [], dropped: [] },
  preferences: { theme: 'auto' }
};
let searchTimeout = null;
let currentAnimeId = null;
let currentFilters = {};
let carouselIndex = 0;
let carouselInterval = null;
let carouselPaused = false;
let featuredAnimeList = [];
let selectedGenres = [];
const SEARCH_HISTORY_KEY = 'aniclone_search_history';
const MAX_SEARCH_HISTORY = 5;

// ===== Constants =====
const GENRES = [
  "Action","Adventure","Comedy","Drama","Romance","Fantasy","Sci-Fi","Horror",
  "Mystery","Thriller","Supernatural","Psychological","Slice of Life","Sports",
  "Mecha","Ecchi","Harem","Yaoi","Yuri","Isekai","Mahou Shoujo","Music",
  "Historical","Martial Arts","Military","School","Gore","Parody","Samurai",
  "Vampire","Demons","Magic","War","Post-Apocalyptic","Cyberpunk","Space",
  "Time Travel","Cooking","Game","Super Power","Cars","Kids","Neo-noir",
  "Philosophical","Survival","Suspense","Western","Villainess","Coming-of-age",
  "Epic","Girls with guns","Sentai","Sword and sorcery","Crossover"
];

const GENRE_ICONS = {
  "Action":"⚔️","Adventure":"🗺️","Comedy":"😂","Drama":"🎭","Romance":"💕",
  "Fantasy":"🧙","Sci-Fi":"🚀","Horror":"👻","Mystery":"🔍","Thriller":"😱",
  "Supernatural":"👻","Psychological":"🧠","Slice of Life":"🌸","Sports":"⚽",
  "Mecha":"🤖","Ecchi":"😏","Harem":"💕","Yaoi":"💙","Yuri":"💗","Isekai":"🌀",
  "Mahou Shoujo":"✨","Music":"🎵","Historical":"📜","Martial Arts":"🥋",
  "Military":"🎖️","School":"🏫","Gore":"🩸","Parody":"🤡","Samurai":"⚔️",
  "Vampire":"🧛","Demons":"😈","Magic":"🪄","War":"💥","Post-Apocalyptic":"☢️",
  "Cyberpunk":"🌃","Space":"🌌","Time Travel":"⏰","Cooking":"🍳","Game":"🎮",
  "Super Power":"💪","Cars":"🏎️","Kids":"👶","Neo-noir":"🕵️","Philosophical":"🤔",
  "Survival":"🏕️","Suspense":"😰","Western":"🤠","Villainess":"👸",
  "Coming-of-age":"🌱","Epic":"🏔️","Girls with guns":"🔫","Sentai":"🦸",
  "Sword and sorcery":"🗡️","Crossover":"🔗"
};

const STUDIO_LIST = [
  "Toei Animation","Madhouse","Bones","Kyoto Animation","Sunrise",
  "Production I.G","A-1 Pictures","MAPPA","Wit Studio","Studio Pierrot",
  "ufotable","Shaft","CloverWorks","Trigger","Lerche","White Fox",
  "J.C.Staff","David Production","Studio Deen","Silver Link",
  "OLM","TMS Entertainment","P.A. Works","8bit","C2C"
];

const YEARS = Array.from({length: 50}, (_, i) => 2025 - i);
const SEASONS = ["WINTER","SPRING","SUMMER","FALL"];
const STATUSES = [
  { value: "FINISHED", label: "Finished" },
  { value: "RELEASING", label: "Releasing" },
  { value: "NOT_YET_RELEASED", label: "Not Yet Released" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "HIATUS", label: "Hiatus" }
];
const FORMATS = [
  { value: "TV", label: "TV" },
  { value: "TV_SHORT", label: "TV Short" },
  { value: "MOVIE", label: "Movie" },
  { value: "SPECIAL", label: "Special" },
  { value: "OVA", label: "OVA" },
  { value: "ONA", label: "ONA" },
  { value: "MUSIC", label: "Music" }
];

const SEASON_ICONS = { WINTER: "❄️", SPRING: "🌸", SUMMER: "☀️", FALL: "🍂" };
const SEASON_NAMES = { WINTER: "Winter", SPRING: "Spring", SUMMER: "Summer", FALL: "Fall" };

// ===== DOM Elements =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ===== API Functions =====
async function fetchFromAniList(query, variables = {}) {
  const cacheKey = JSON.stringify({ query: query.trim().substring(0, 80), variables });
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables })
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].message);
    setCache(cacheKey, data.data);
    return data.data;
  } catch (error) {
    console.error('AniList API Error:', error);
    throw error;
  }
}

// ===== Utility Functions =====
function getDisplayTitle(anime) {
  return anime.title?.english || anime.title?.romaji || 'Unknown';
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'FINISHED': return 'status-badge--finished';
    case 'RELEASING': return 'status-badge--releasing';
    case 'NOT_YET_RELEASED': return 'status-badge--not-yet-released';
    default: return 'status-badge--finished';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'FINISHED': return 'Finished';
    case 'RELEASING': return 'Ongoing';
    case 'NOT_YET_RELEASED': return 'Not Released';
    case 'CANCELLED': return 'Cancelled';
    case 'HIATUS': return 'Hiatus';
    default: return 'Unknown';
  }
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 3) return 'WINTER';
  if (month >= 4 && month <= 6) return 'SPRING';
  if (month >= 7 && month <= 9) return 'SUMMER';
  return 'FALL';
}

// ===== Local Storage =====
function saveUserData() {
  try { localStorage.setItem('aniclone_user', JSON.stringify(currentUser)); }
  catch (e) { console.warn('Failed to save user data:', e); }
}

function loadUserData() {
  try {
    const saved = localStorage.getItem('aniclone_user');
    if (saved) currentUser = { ...currentUser, ...JSON.parse(saved) };
  } catch (e) { console.warn('Failed to load user data:', e); }
}

function isInUserList(animeId) {
  for (const listType in currentUser.lists) {
    if (currentUser.lists[listType].some(item => item.id === animeId)) return listType;
  }
  return null;
}

function addToUserList(listType, animeData) {
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
function getSearchHistory() {
  try {
    return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];
  } catch { return []; }
}

function addToSearchHistory(query) {
  if (!query || query.length < 2) return;
  let history = getSearchHistory();
  history = history.filter(h => h !== query);
  history.unshift(query);
  if (history.length > MAX_SEARCH_HISTORY) history = history.slice(0, MAX_SEARCH_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

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

// ===== Toast Notifications =====
function showToast(message, type = 'info', duration = 3000) {
  const container = $('#toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__content">
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="Dismiss">&times;</button>
    </div>
    <div class="toast__progress" style="width:100%"></div>
  `;
  container.appendChild(toast);

  const progress = toast.querySelector('.toast__progress');
  if (progress) {
    progress.style.transition = `width ${duration}ms linear`;
    requestAnimationFrame(() => { progress.style.width = '0%'; });
  }

  const dismiss = () => {
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 300);
  };

  const timer = setTimeout(dismiss, duration);
  toast.querySelector('.toast__close').addEventListener('click', () => {
    clearTimeout(timer);
    dismiss();
  });
}

// ===== UI Components =====
function createAnimeCard(anime, rank = null) {
  const title = getDisplayTitle(anime);
  const score = anime.averageScore || 'N/A';
  const genres = anime.genres?.slice(0, 3) || [];
  const episodes = anime.episodes || 'TBA';
  const statusClass = getStatusBadgeClass(anime.status);
  const statusText = getStatusText(anime.status);
  const inList = isInUserList(anime.id);

  return `
    <div class="anime-card" data-anime-id="${anime.id}" tabindex="0" draggable="false">
      ${rank !== null ? `<div class="anime-card__rank">${rank}</div>` : ''}
      <div class="anime-card__image">
        <img src="${anime.coverImage.large}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
        ${score !== 'N/A' ? `<div class="anime-card__score">${score}</div>` : ''}
        <div class="anime-card__actions">
          <button class="card-action-btn" data-action="add-to-list" data-anime-id="${anime.id}" title="Add to List" aria-label="Add ${title} to list">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          ${inList ? `<span class="status-indicator" title="In ${inList} list">●</span>` : ''}
        </div>
      </div>
      <div class="anime-card__content">
        <h3 class="anime-card__title">${title}</h3>
        <div class="anime-card__genres">
          ${genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
        </div>
        <div class="anime-card__meta">
          <span>${episodes} eps</span>
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
      </div>
    </div>
  `;
}

function createSkeletonCard() {
  return `<div class="skeleton-card"><div class="skeleton-image skeleton"></div><div class="skeleton-content"><div class="skeleton-title skeleton"></div><div class="skeleton-text skeleton"></div><div class="skeleton-text skeleton"></div></div></div>`;
}

function createAnimeDetail(anime) {
  const title = getDisplayTitle(anime);
  const nativeTitle = anime.title.native;
  const description = stripHtml(anime.description) || 'No description available.';
  const score = anime.averageScore || 'N/A';
  const popularity = anime.popularity || 'N/A';
  const episodes = anime.episodes || 'TBA';
  const duration = anime.duration ? `${anime.duration} min` : 'N/A';
  const statusText = getStatusText(anime.status);
  const genres = anime.genres || [];
  const studios = anime.studios?.nodes?.map(s => s.name).join(', ') || 'N/A';
  const season = anime.season && anime.seasonYear ? `${SEASON_NAMES[anime.season] || anime.season} ${anime.seasonYear}` : 'N/A';
  const source = anime.source || 'N/A';
  const characters = anime.characters?.nodes?.slice(0, 12) || [];
  const staff = anime.staff?.edges?.slice(0, 8) || [];
  const recommendations = anime.recommendations?.nodes?.slice(0, 6) || [];
  const trailer = anime.trailer;
  const externalLinks = anime.externalLinks || [];
  const inList = isInUserList(anime.id);
  const isFav = false;

  // Trailer embed
  let trailerHtml = '';
  if (trailer && trailer.site === 'youtube') {
    trailerHtml = `
      <div class="detail-section trailer-section">
        <h3>Trailer</h3>
        <div class="trailer-embed">
          <iframe src="https://www.youtube.com/embed/${trailer.id}" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen loading="lazy" title="Anime trailer"></iframe>
        </div>
      </div>`;
  } else if (trailer && trailer.site === 'dailymotion') {
    trailerHtml = `
      <div class="detail-section trailer-section">
        <h3>Trailer</h3>
        <div class="trailer-embed">
          <iframe src="https://www.dailymotion.com/embed/video/${trailer.id}" 
                  allowfullscreen loading="lazy" title="Anime trailer"></iframe>
        </div>
      </div>`;
  }

  // Staff section
  let staffHtml = '';
  if (staff.length > 0) {
    staffHtml = `
      <div class="detail-section">
        <h3>Staff</h3>
        <div class="staff-grid">
          ${staff.map(e => {
            const s = e.node;
            return `
            <div class="staff-card">
              <div class="staff-card__image">
                <img src="${s.image?.large || ''}" alt="${s.name.full}" loading="lazy" onerror="this.style.display='none'">
              </div>
              <div class="staff-card__name">${s.name.full}</div>
              ${e.role ? `<div class="staff-card__role">${e.role}</div>` : ''}
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // External links
  let linksHtml = '';
  if (externalLinks.length > 0) {
    linksHtml = `
      <div class="detail-section">
        <h3>External Links</h3>
        <div class="external-links">
          ${externalLinks.map(l => `
            <a href="${l.url}" target="_blank" rel="noopener" class="external-link">${l.site}</a>
          `).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="anime-detail">
      <div class="anime-detail__banner" style="background-image: url('${anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large}')"></div>
      <div class="anime-detail__content">
        <div class="anime-detail__header">
          <div class="anime-detail__cover">
            <img src="${anime.coverImage.extraLarge || anime.coverImage.large}" alt="${title}" onerror="this.style.display='none'">
          </div>
          <div class="anime-detail__info">
            <h2 class="anime-detail__title">${title}</h2>
            ${nativeTitle ? `<p class="anime-detail__subtitle">${nativeTitle}</p>` : ''}
            <div class="anime-detail__actions">
              <button class="btn btn--primary" data-action="add-to-list" data-anime-id="${anime.id}">
                ${inList ? `In ${inList} List` : 'Add to List'}
              </button>
              <button class="btn btn--outline btn--favorite ${isFav ? 'is-favorited' : ''}" data-action="favorite" data-anime-id="${anime.id}">
                <span class="heart-icon">♥</span> Favorite
              </button>
            </div>
            <div class="anime-detail__stats">
              <div class="stat"><div class="stat__value">${score}</div><div class="stat__label">Score</div></div>
              <div class="stat"><div class="stat__value">${episodes}</div><div class="stat__label">Episodes</div></div>
              <div class="stat"><div class="stat__value">${duration}</div><div class="stat__label">Duration</div></div>
              <div class="stat"><div class="stat__value">${statusText}</div><div class="stat__label">Status</div></div>
            </div>
            <div class="anime-detail__genres">
              ${genres.map(g => `<span class="genre-tag">${g}</span>`).join('')}
            </div>
          </div>
        </div>
        
        <div class="anime-detail__sections">
          ${trailerHtml}

          <div class="detail-section">
            <h3>Description</h3>
            <button class="spoiler-toggle" data-action="toggle-spoiler">Show Spoiler</button>
            <p class="spoiler-text">${description}</p>
          </div>

          <div class="detail-section">
            <h3>Information</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-16);">
              <div><strong>Studios:</strong> ${studios}</div>
              <div><strong>Season:</strong> ${season}</div>
              <div><strong>Source:</strong> ${source}</div>
              <div><strong>Format:</strong> ${anime.format || 'N/A'}</div>
              <div><strong>Popularity:</strong> #${popularity}</div>
              <div><strong>Favorites:</strong> ${anime.favourites || 'N/A'}</div>
            </div>
          </div>

          ${staffHtml}
          ${linksHtml}

          ${characters.length > 0 ? `
            <div class="detail-section">
              <h3>Characters</h3>
              <div class="characters-grid">
                ${characters.map(c => `
                  <div class="character-card">
                    <div class="character-card__image">
                      <img src="${c.image.large}" alt="${c.name.full}" loading="lazy" onerror="this.style.display='none'">
                    </div>
                    <div class="character-card__name">${c.name.full}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${recommendations.length > 0 ? `
            <div class="detail-section">
              <h3>Recommendations</h3>
              <div class="recommendations-grid">
                ${recommendations.map(rec => {
                  const r = rec.mediaRecommendation;
                  return `
                    <div class="anime-card" data-anime-id="${r.id}">
                      <div class="anime-card__image">
                        <img src="${r.coverImage.large}" alt="${getDisplayTitle(r)}" loading="lazy" onerror="this.style.display='none'">
                        ${r.averageScore ? `<div class="anime-card__score">${r.averageScore}</div>` : ''}
                      </div>
                      <div class="anime-card__content">
                        <h3 class="anime-card__title">${getDisplayTitle(r)}</h3>
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

function showError(container, message) {
  container.innerHTML = `<div class="error-message"><h3>Oops! Something went wrong</h3><p>${message}</p></div>`;
}

// ===== Event Listeners for Cards =====
function addCardClickListeners(container) {
  container.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn')) return;
      openAnimeModal(card.dataset.animeId);
    });
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') openAnimeModal(card.dataset.animeId);
    });
  });
  container.querySelectorAll('[data-action="add-to-list"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openListModal(btn.dataset.animeId);
    });
  });
}

// ===== Hero Carousel =====
function initCarousel(animeList) {
  featuredAnimeList = animeList;
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
    slide.addEventListener('click', () => openAnimeModal(slide.dataset.animeId));
  });
  dots.querySelectorAll('.hero-carousel__dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.index)));
  });

  $('#carouselPrev')?.addEventListener('click', () => goToSlide(carouselIndex - 1));
  $('#carouselNext')?.addEventListener('click', () => goToSlide(carouselIndex + 1));

  // Pause on hover
  const carousel = $('#heroCarousel');
  carousel?.addEventListener('mouseenter', () => { carouselPaused = true; });
  carousel?.addEventListener('mouseleave', () => { carouselPaused = false; });

  startCarousel();
}

function goToSlide(index) {
  const total = featuredAnimeList.length;
  if (total === 0) return;
  carouselIndex = ((index % total) + total) % total;

  const track = $('#carouselTrack');
  if (track) track.style.transform = `translateX(-${carouselIndex * 100}%)`;

  $$('.hero-carousel__dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === carouselIndex);
  });
}

function startCarousel() {
  if (carouselInterval) clearInterval(carouselInterval);
  carouselInterval = setInterval(() => {
    if (!carouselPaused) goToSlide(carouselIndex + 1);
  }, 5000);
}

// ===== Scroll Animations =====
function initScrollAnimations() {
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

// ===== Card Reveal Animation =====
function animateCards(container) {
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

  // Close on link click
  drawer.querySelectorAll('.mobile-drawer__link').forEach(link => {
    link.addEventListener('click', () => {
      closeDrawer();
      switchPage(link.dataset.page);
    });
  });
}

// ===== Search Functions =====
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
      suggestions.innerHTML = results.map(anime => `
        <div class="suggestion-item" data-anime-id="${anime.id}" role="option">${getDisplayTitle(anime)}</div>
      `).join('');
      suggestions.classList.remove('hidden');
      suggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          suggestions.classList.add('hidden');
          $('#searchInput').value = item.textContent.trim();
          openAnimeModal(item.dataset.animeId);
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
      performSearch(query);
    });
  });
}

// ===== Page Functions =====
async function loadHomePage() {
  initScrollAnimations();
  await Promise.all([
    loadCarouselAnime(),
    loadTrendingAnime(),
    loadSeasonalAnime(),
    loadPopularThisYear(),
    loadTop100(),
    loadRecentlyUpdated()
  ]);
}

async function loadCarouselAnime() {
  try {
    const data = await fetchFromAniList(QUERIES.trending, { page: 1, perPage: 8 });
    initCarousel(data.Page.media.slice(0, 6));
  } catch (e) { console.error('Failed to load carousel:', e); }
}

async function loadTrendingAnime() {
  const container = $('#trendingGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const data = await fetchFromAniList(QUERIES.trending, { page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load trending anime.'); }
}

async function loadSeasonalAnime() {
  const container = $('#seasonalGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const year = new Date().getFullYear();
    const season = getCurrentSeason();
    const data = await fetchFromAniList(QUERIES.seasonal, { year, season, page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load seasonal anime.'); }
}

async function loadPopularThisYear() {
  const container = $('#popularYearGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const year = new Date().getFullYear();
    const data = await fetchFromAniList(QUERIES.popularThisYear, { year, page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load popular anime.'); }
}

async function loadTop100() {
  const container = $('#top100Grid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const data = await fetchFromAniList(QUERIES.topRated, { page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map((a, i) => createAnimeCard(a, i + 1)).join('');
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load top anime.'); }
}

async function loadRecentlyUpdated() {
  const container = $('#recentlyUpdatedGrid');
  if (!container) return;
  container.innerHTML = Array(10).fill(0).map(createSkeletonCard).join('');
  try {
    const data = await fetchFromAniList(QUERIES.popular, { page: 1, perPage: 10 });
    container.innerHTML = data.Page.media.map(a => createAnimeCard(a)).join('');
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load recently updated anime.'); }
}

async function performSearch(query, filters = {}) {
  const container = $('#searchGrid');
  const resultsText = $('#searchResultsText');
  if (!container || !resultsText) return;

  if (!query && Object.keys(filters).length === 0) {
    container.innerHTML = '';
    resultsText.textContent = 'Enter a search term or use filters to find anime';
    return;
  }

  // Save to history
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
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) {
    showError(container, 'Failed to search anime.');
    resultsText.textContent = 'Search failed';
  }
}

async function loadRankings(type = 'all') {
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
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, 'Failed to load rankings.'); }
}

// ===== Browse Page =====
function initBrowsePage() {
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
      item.addEventListener('click', () => loadBrowseByGenre(item.dataset.genre));
      item.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadBrowseByGenre(item.dataset.genre); });
    });
  }

  // Year timeline
  const yearTimeline = $('#yearTimeline');
  if (yearTimeline) {
    yearTimeline.innerHTML = YEARS.slice(0, 30).map(y => `
      <button class="year-btn" data-year="${y}">${y}</button>
    `).join('');

    yearTimeline.querySelectorAll('.year-btn').forEach(btn => {
      btn.addEventListener('click', () => loadBrowseByYear(btn.dataset.year));
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
      card.addEventListener('click', () => loadBrowseByStudio(card.dataset.studio));
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
      card.addEventListener('click', () => loadBrowseBySeason(card.dataset.year, card.dataset.season));
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

async function loadBrowseByGenre(genre) {
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
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load ${genre} anime.`); }
}

async function loadBrowseByYear(year) {
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
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load anime from ${year}.`); }
}

async function loadBrowseByStudio(studio) {
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
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load ${studio} anime.`); }
}

async function loadBrowseBySeason(year, season) {
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
    addCardClickListeners(container);
    animateCards(container);
  } catch (e) { showError(container, `Failed to load seasonal anime.`); }
}

// ===== User Lists =====
function loadUserList(listType) {
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

  addCardClickListeners(container);
  initDragAndDrop(container, listType);
  updateListStats();
}

function initDragAndDrop(container, listType) {
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
        loadUserList(listType);
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
function exportList() {
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

function importList(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      // Validate structure
      const validKeys = ['watching', 'completed', 'planning', 'paused', 'dropped'];
      const isValid = validKeys.some(k => Array.isArray(imported[k]));
      if (!isValid) throw new Error('Invalid format');

      for (const key of validKeys) {
        if (Array.isArray(imported[key])) {
          // Merge: avoid duplicates
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
      if (activeListBtn) loadUserList(activeListBtn.dataset.list);
    } catch (err) {
      showToast('Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

// ===== Modal Functions =====
async function openAnimeModal(animeId) {
  const modalBody = $('#animeDetails');
  const modal = $('#animeModal');
  const loadingOverlay = $('#loadingOverlay');
  if (!modal || !modalBody) return;

  currentAnimeId = animeId;
  modal.classList.remove('hidden');
  loadingOverlay?.classList.remove('hidden');

  try {
    const data = await fetchFromAniList(QUERIES.details, { id: parseInt(animeId) });
    const anime = data.Media;
    modalBody.innerHTML = createAnimeDetail(anime);
    loadingOverlay?.classList.add('hidden');

    // Favorite button
    modalBody.querySelector('[data-action="favorite"]')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      btn.classList.toggle('is-favorited');
      showToast(btn.classList.contains('is-favorited') ? 'Added to favorites!' : 'Removed from favorites', 'success');
    });

    // Spoiler toggle
    modalBody.querySelector('[data-action="toggle-spoiler"]')?.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const text = modalBody.querySelector('.spoiler-text');
      if (text) {
        text.classList.toggle('revealed');
        btn.textContent = text.classList.contains('revealed') ? 'Hide Spoiler' : 'Show Spoiler';
      }
    });

    // Add to list
    modalBody.querySelectorAll('[data-action="add-to-list"]').forEach(btn => {
      btn.addEventListener('click', () => openListModal(animeId));
    });

    // Recommendation cards
    addCardClickListeners(modalBody);

  } catch (e) {
    modalBody.innerHTML = `<div class="error-message"><h3>Failed to load anime details</h3><p>Please try again later.</p></div>`;
    loadingOverlay?.classList.add('hidden');
  }
}

function openListModal(animeId) {
  const listModal = $('#listModal');
  if (!listModal) return;

  currentAnimeId = animeId;
  listModal.classList.remove('hidden');

  const existingListType = isInUserList(animeId);
  if (existingListType) {
    const animeData = currentUser.lists[existingListType].find(item => item.id === animeId);
    if (animeData) {
      const el = (id) => $(id);
      if (el('#listStatus')) el('#listStatus').value = existingListType;
      if (el('#listProgress')) el('#listProgress').value = animeData.progress || 0;
      if (el('#listScore')) el('#listScore').value = animeData.score || '';
      if (el('#listNotes')) el('#listNotes').value = animeData.notes || '';
    }
  }
}

function closeAnimeModal() {
  const modal = $('#animeModal');
  if (!modal) return;
  modal.classList.add('hidden');
  const details = $('#animeDetails');
  if (details) details.innerHTML = '';
  currentAnimeId = null;
}

function closeListModal() {
  const listModal = $('#listModal');
  if (!listModal) return;
  listModal.classList.add('hidden');
  ['listStatus','listProgress','listScore','listNotes'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.value = '';
  });
  currentAnimeId = null;
}

async function saveToList() {
  const status = $('#listStatus')?.value;
  const progress = parseInt($('#listProgress')?.value) || 0;
  const score = parseInt($('#listScore')?.value) || null;
  const notes = $('#listNotes')?.value || '';

  if (!status) { showToast('Please select a status', 'error'); return; }
  if (!currentAnimeId) return;

  try {
    const data = await fetchFromAniList(QUERIES.details, { id: parseInt(currentAnimeId) });
    const anime = data.Media;
    addToUserList(status, {
      id: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      averageScore: anime.averageScore,
      genres: anime.genres,
      status: anime.status,
      episodes: anime.episodes,
      duration: anime.duration,
      progress,
      score,
      notes
    });
    closeListModal();
    showToast(`Added to ${status} list!`, 'success');

    if (currentPage === 'lists') {
      const activeBtn = $('.lists-nav .btn.active');
      if (activeBtn) loadUserList(activeBtn.dataset.list);
    }
  } catch (e) {
    showToast('Failed to save to list', 'error');
  }
}

// ===== Page Switching =====
function switchPage(pageId) {
  // Update nav links (both desktop and mobile)
  $$('.nav__link').forEach(link => link.classList.toggle('active', link.dataset.page === pageId));
  $$('.mobile-drawer__link').forEach(link => link.classList.toggle('active', link.dataset.page === pageId));

  // Update pages with transition
  $$('.page').forEach(page => {
    const isTarget = page.id === `${pageId}Page`;
    page.classList.toggle('active', isTarget);
    page.classList.toggle('hidden', !isTarget);
    if (isTarget) {
      page.classList.remove('page-transition');
      void page.offsetWidth; // trigger reflow
      page.classList.add('page-transition');
    }
  });

  currentPage = pageId;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (pageId) {
    case 'home': loadHomePage(); break;
    case 'search': initializeSearchPage(); break;
    case 'browse': initBrowsePage(); break;
    case 'rankings': loadRankings(); break;
    case 'lists': loadUserList('watching'); break;
  }
}

function initializeSearchPage() {
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
      selectedGenres = selectedGenres.filter(g => g !== btn.dataset.genre);
      renderGenreChips();
    });
  });
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
    if (query) { switchPage('search'); performSearch(query); }
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
      if (query) { switchPage('search'); performSearch(query); searchSuggestions?.classList.add('hidden'); }
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
      genres: selectedGenres.length > 0 ? selectedGenres : undefined,
      year: $('#yearFilter')?.value || '',
      status: $('#statusFilter')?.value || '',
      format: $('#formatFilter')?.value || '',
      sort: $('#sortFilter')?.value || 'POPULARITY_DESC'
    };
    performSearch(searchInput?.value?.trim() || '', filters);
  });

  // Rankings
  $$('[data-ranking]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-ranking]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadRankings(btn.dataset.ranking);
    });
  });

  // Lists
  $$('[data-list]').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('[data-list]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadUserList(btn.dataset.list);
    });
  });

  // Export/Import
  $('#exportListBtn')?.addEventListener('click', exportList);
  $('#importListInput')?.addEventListener('change', (e) => {
    if (e.target.files[0]) importList(e.target.files[0]);
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
        loadRankings('trending');
        break;
      case 'view-all-trending':
        switchPage('rankings');
        loadRankings('trending');
        break;
      case 'view-seasonal':
        switchPage('browse');
        break;
      case 'view-popular-year':
        switchPage('rankings');
        loadRankings('popular');
        break;
      case 'view-top100':
        switchPage('rankings');
        loadRankings('all');
        break;
    }
  });

  // Browse categories (legacy support)
  $$('[data-browse]').forEach(card => {
    card.addEventListener('click', () => {
      switchPage('browse');
    });
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

  $('#saveToList')?.addEventListener('click', saveToList);
  $('#cancelList')?.addEventListener('click', closeListModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!$('#animeModal')?.classList.contains('hidden')) closeAnimeModal();
      else if (!$('#listModal')?.classList.contains('hidden')) closeListModal();
    }
  });

  // Initialize
  loadHomePage();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => console.log('AniClone loaded successfully!'));
}
