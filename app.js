// AniList API Configuration
const ANILIST_API_URL = 'https://graphql.anilist.co';

// GraphQL Queries
const QUERIES = {
  trending: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC) {
          id
          title { romaji english }
          coverImage { large extraLarge }
          bannerImage
          averageScore
          popularity
          genres
          status
          format
          episodes
          duration
          season
          seasonYear
          studios { nodes { name } }
        }
      }
    }
  `,
  
  popular: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english }
          coverImage { large }
          averageScore
          genres
          status
          episodes
        }
      }
    }
  `,
  
  seasonal: `
    query ($year: Int, $season: MediaSeason, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(seasonYear: $year, season: $season, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english }
          coverImage { large }
          averageScore
          status
          episodes
          genres
        }
      }
    }
  `,
  
  search: `
    query ($search: String, $genre: String, $year: Int, $status: MediaStatus, $format: MediaFormat, $sort: [MediaSort], $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, genre: $genre, seasonYear: $year, status: $status, format: $format, type: ANIME, sort: $sort) {
          id
          title { romaji english }
          coverImage { large }
          averageScore
          genres
          status
          episodes
          format
        }
      }
    }
  `,
  
  details: `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        description
        coverImage { large extraLarge }
        bannerImage
        averageScore
        popularity
        favourites
        genres
        status
        format
        episodes
        duration
        source
        season
        seasonYear
        studios { nodes { name } }
        characters(sort: ROLE, perPage: 12) {
          nodes {
            id
            name { full }
            image { large }
          }
        }
        staff(sort: RELEVANCE, perPage: 8) {
          nodes {
            id
            name { full }
            image { large }
          }
        }
        recommendations(perPage: 6) {
          nodes {
            mediaRecommendation {
              id
              title { romaji }
              coverImage { large }
              averageScore
            }
          }
        }
      }
    }
  `,
  
  topRated: `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: SCORE_DESC) {
          id
          title { romaji english }
          coverImage { large }
          averageScore
          genres
          status
          episodes
        }
      }
    }
  `,
  
  genres: `
    query {
      GenreCollection
    }
  `,
  
  searchSuggestions: `
    query ($search: String) {
      Page(page: 1, perPage: 5) {
        media(search: $search, type: ANIME) {
          id
          title { romaji english }
        }
      }
    }
  `
};

// Global state
let currentPage = 'home';
let currentUser = {
  lists: {
    watching: [],
    completed: [],
    planning: [],
    paused: [],
    dropped: []
  },
  preferences: {
    theme: 'auto'
  }
};
let searchTimeout = null;
let currentAnimeId = null;
let currentFilters = {};

// Data
const GENRES = ["Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"];
const YEARS = Array.from({length: 10}, (_, i) => 2024 - i);
const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];
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

// DOM Elements
const navLinks = document.querySelectorAll('.nav__link');
const pages = document.querySelectorAll('.page');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const searchSuggestions = document.getElementById('searchSuggestions');
const themeToggle = document.getElementById('themeToggle');
const modal = document.getElementById('animeModal');
const listModal = document.getElementById('listModal');
const closeModalBtn = document.getElementById('closeModal');
const closeListModalBtn = document.getElementById('closeListModal');
const loadingOverlay = document.getElementById('loadingOverlay');
const toastContainer = document.getElementById('toastContainer');

// API Functions
async function fetchFromAniList(query, variables = {}) {
  try {
    const response = await fetch(ANILIST_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return data.data;
  } catch (error) {
    console.error('AniList API Error:', error);
    throw error;
  }
}

// Utility Functions
function getDisplayTitle(anime) {
  return anime.title.english || anime.title.romaji;
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
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Local Storage Functions
function saveUserData() {
  try {
    localStorage.setItem('aniclone_user', JSON.stringify(currentUser));
  } catch (error) {
    console.warn('Failed to save user data to localStorage:', error);
  }
}

function loadUserData() {
  try {
    const saved = localStorage.getItem('aniclone_user');
    if (saved) {
      currentUser = { ...currentUser, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.warn('Failed to load user data from localStorage:', error);
  }
}

function isInUserList(animeId) {
  for (const listType in currentUser.lists) {
    if (currentUser.lists[listType].some(item => item.id === animeId)) {
      return listType;
    }
  }
  return null;
}

function addToUserList(listType, animeData) {
  // Remove from other lists first
  for (const type in currentUser.lists) {
    currentUser.lists[type] = currentUser.lists[type].filter(item => item.id !== animeData.id);
  }
  
  // Add to new list
  currentUser.lists[listType].push({
    ...animeData,
    addedAt: new Date().toISOString(),
    progress: animeData.progress || 0,
    score: animeData.score || null,
    notes: animeData.notes || ''
  });
  
  saveUserData();
}

// Theme Functions
function initTheme() {
  const savedTheme = currentUser.preferences.theme;
  if (savedTheme === 'dark') {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    updateThemeIcon('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.setAttribute('data-color-scheme', 'light');
    updateThemeIcon('light');
  } else {
    // Auto theme based on system preference
    updateThemeIcon('auto');
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
  const lightIcon = document.querySelector('.theme-icon--light');
  const darkIcon = document.querySelector('.theme-icon--dark');
  
  if (theme === 'dark') {
    lightIcon?.classList.add('hidden');
    darkIcon?.classList.remove('hidden');
  } else {
    lightIcon?.classList.remove('hidden');
    darkIcon?.classList.add('hidden');
  }
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <div class="toast__content">
      <span class="toast__message">${message}</span>
      <button class="toast__close">×</button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
  
  // Manual close
  toast.querySelector('.toast__close').addEventListener('click', () => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  });
}

// UI Components
function createAnimeCard(anime) {
  const title = getDisplayTitle(anime);
  const score = anime.averageScore || 'N/A';
  const genres = anime.genres?.slice(0, 3) || [];
  const episodes = anime.episodes || 'TBA';
  const statusClass = getStatusBadgeClass(anime.status);
  const statusText = getStatusText(anime.status);
  const inList = isInUserList(anime.id);
  
  return `
    <div class="anime-card" data-anime-id="${anime.id}" tabindex="0">
      <div class="anime-card__image">
        <img src="${anime.coverImage.large}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
        ${score !== 'N/A' ? `<div class="anime-card__score">${score}</div>` : ''}
        <div class="anime-card__actions">
          <button class="card-action-btn" data-action="add-to-list" data-anime-id="${anime.id}" title="Add to List">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          ${inList ? `<span class="status-indicator" title="In ${inList} list">●</span>` : ''}
        </div>
      </div>
      <div class="anime-card__content">
        <h3 class="anime-card__title">${title}</h3>
        <div class="anime-card__genres">
          ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
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
  return `
    <div class="skeleton-card">
      <div class="skeleton-image skeleton"></div>
      <div class="skeleton-content">
        <div class="skeleton-title skeleton"></div>
        <div class="skeleton-text skeleton"></div>
        <div class="skeleton-text skeleton"></div>
      </div>
    </div>
  `;
}

function createFeaturedCard(anime) {
  const title = getDisplayTitle(anime);
  return `
    <div class="featured-card" data-anime-id="${anime.id}">
      <img src="${anime.coverImage.large}" alt="${title}" loading="lazy" onerror="this.style.display='none'">
    </div>
  `;
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
  const season = anime.season && anime.seasonYear ? `${anime.season} ${anime.seasonYear}` : 'N/A';
  const source = anime.source || 'N/A';
  const characters = anime.characters?.nodes?.slice(0, 12) || [];
  const recommendations = anime.recommendations?.nodes?.slice(0, 6) || [];
  const inList = isInUserList(anime.id);

  return `
    <div class="anime-detail">
      <div class="anime-detail__banner" style="background-image: url('${anime.bannerImage || anime.coverImage.extraLarge || anime.coverImage.large}')">
      </div>
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
              <button class="btn btn--outline" data-action="favorite">♥ Favorite</button>
            </div>
            <div class="anime-detail__stats">
              <div class="stat">
                <div class="stat__value">${score}</div>
                <div class="stat__label">Score</div>
              </div>
              <div class="stat">
                <div class="stat__value">${episodes}</div>
                <div class="stat__label">Episodes</div>
              </div>
              <div class="stat">
                <div class="stat__value">${duration}</div>
                <div class="stat__label">Duration</div>
              </div>
              <div class="stat">
                <div class="stat__value">${statusText}</div>
                <div class="stat__label">Status</div>
              </div>
            </div>
            <div class="anime-detail__genres">
              ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
          </div>
        </div>
        
        <div class="anime-detail__sections">
          <div class="detail-section">
            <h3>Description</h3>
            <p>${description}</p>
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

          ${characters.length > 0 ? `
            <div class="detail-section">
              <h3>Characters</h3>
              <div class="characters-grid">
                ${characters.map(character => `
                  <div class="character-card">
                    <div class="character-card__image">
                      <img src="${character.image.large}" alt="${character.name.full}" loading="lazy" onerror="this.style.display='none'">
                    </div>
                    <div class="character-card__name">${character.name.full}</div>
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
                  const recAnime = rec.mediaRecommendation;
                  return `
                    <div class="anime-card" data-anime-id="${recAnime.id}">
                      <div class="anime-card__image">
                        <img src="${recAnime.coverImage.large}" alt="${getDisplayTitle(recAnime)}" loading="lazy" onerror="this.style.display='none'">
                        ${recAnime.averageScore ? `<div class="anime-card__score">${recAnime.averageScore}</div>` : ''}
                      </div>
                      <div class="anime-card__content">
                        <h3 class="anime-card__title">${getDisplayTitle(recAnime)}</h3>
                      </div>
                    </div>
                  `;
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
  container.innerHTML = `
    <div class="error-message">
      <h3>Oops! Something went wrong</h3>
      <p>${message}</p>
    </div>
  `;
}

function addCardClickListeners(container) {
  container.querySelectorAll('.anime-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't open modal if clicking on action buttons
      if (e.target.closest('.card-action-btn')) return;
      
      const animeId = card.dataset.animeId;
      openAnimeModal(animeId);
    });
    
    card.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const animeId = card.dataset.animeId;
        openAnimeModal(animeId);
      }
    });
  });
  
  // Add listeners for action buttons
  container.querySelectorAll('[data-action="add-to-list"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const animeId = btn.dataset.animeId;
      openListModal(animeId);
    });
  });
}

function addFeaturedClickListeners(container) {
  container.querySelectorAll('.featured-card').forEach(card => {
    card.addEventListener('click', () => {
      const animeId = card.dataset.animeId;
      openAnimeModal(animeId);
    });
  });
}

// Search Functions
const debouncedSearch = debounce(async (query) => {
  if (query.length < 2) {
    if (searchSuggestions) {
      searchSuggestions.classList.add('hidden');
    }
    return;
  }
  
  try {
    const data = await fetchFromAniList(QUERIES.searchSuggestions, { search: query });
    const suggestions = data.Page.media;
    
    if (suggestions.length > 0 && searchSuggestions) {
      searchSuggestions.innerHTML = suggestions.map(anime => `
        <div class="suggestion-item" data-anime-id="${anime.id}">
          ${getDisplayTitle(anime)}
        </div>
      `).join('');
      
      searchSuggestions.classList.remove('hidden');
      
      // Add click listeners to suggestions
      searchSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const animeId = item.dataset.animeId;
          searchSuggestions.classList.add('hidden');
          searchInput.value = item.textContent.trim();
          openAnimeModal(animeId);
        });
      });
    } else if (searchSuggestions) {
      searchSuggestions.classList.add('hidden');
    }
  } catch (error) {
    console.error('Search suggestions error:', error);
    if (searchSuggestions) {
      searchSuggestions.classList.add('hidden');
    }
  }
}, 300);

// Page Functions
async function loadHomePage() {
  await Promise.all([
    loadFeaturedAnime(),
    loadTrendingAnime(),
    loadSeasonalAnime(),
    loadRecentlyUpdated()
  ]);
}

async function loadFeaturedAnime() {
  const container = document.getElementById('featuredCarousel');
  if (!container) return;
  
  try {
    const data = await fetchFromAniList(QUERIES.trending, { page: 1, perPage: 10 });
    const animeList = data.Page.media;
    
    container.innerHTML = animeList.slice(0, 8).map(anime => createFeaturedCard(anime)).join('');
    addFeaturedClickListeners(container);
    
  } catch (error) {
    console.error('Failed to load featured anime:', error);
  }
}

async function loadTrendingAnime() {
  const container = document.getElementById('trendingGrid');
  if (!container) return;
  
  // Show loading skeletons
  container.innerHTML = Array(10).fill(0).map(() => createSkeletonCard()).join('');
  
  try {
    const data = await fetchFromAniList(QUERIES.trending, { page: 1, perPage: 10 });
    const animeList = data.Page.media;
    
    container.innerHTML = animeList.map(anime => createAnimeCard(anime)).join('');
    addCardClickListeners(container);
    
  } catch (error) {
    showError(container, 'Failed to load trending anime. Please try again later.');
  }
}

async function loadSeasonalAnime() {
  const container = document.getElementById('seasonalGrid');
  if (!container) return;
  
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  let currentSeason = 'WINTER';
  
  const month = currentDate.getMonth() + 1;
  if (month >= 3 && month <= 5) currentSeason = 'SPRING';
  else if (month >= 6 && month <= 8) currentSeason = 'SUMMER';
  else if (month >= 9 && month <= 11) currentSeason = 'FALL';
  
  // Show loading skeletons
  container.innerHTML = Array(10).fill(0).map(() => createSkeletonCard()).join('');
  
  try {
    const data = await fetchFromAniList(QUERIES.seasonal, { 
      year: currentYear, 
      season: currentSeason, 
      page: 1, 
      perPage: 10 
    });
    const animeList = data.Page.media;
    
    container.innerHTML = animeList.map(anime => createAnimeCard(anime)).join('');
    addCardClickListeners(container);
    
  } catch (error) {
    showError(container, 'Failed to load seasonal anime. Please try again later.');
  }
}

async function loadRecentlyUpdated() {
  const container = document.getElementById('recentlyUpdatedGrid');
  if (!container) return;
  
  // Show loading skeletons
  container.innerHTML = Array(10).fill(0).map(() => createSkeletonCard()).join('');
  
  try {
    const data = await fetchFromAniList(QUERIES.popular, { 
      page: 1, 
      perPage: 10 
    });
    const animeList = data.Page.media;
    
    container.innerHTML = animeList.map(anime => createAnimeCard(anime)).join('');
    addCardClickListeners(container);
    
  } catch (error) {
    showError(container, 'Failed to load recently updated anime. Please try again later.');
  }
}

async function performSearch(query, filters = {}) {
  const container = document.getElementById('searchGrid');
  const resultsText = document.getElementById('searchResultsText');
  
  if (!container || !resultsText) return;
  
  if (!query && Object.keys(filters).length === 0) {
    container.innerHTML = '';
    resultsText.textContent = 'Enter a search term or use filters to find anime';
    return;
  }
  
  // Show loading skeletons
  container.innerHTML = Array(12).fill(0).map(() => createSkeletonCard()).join('');
  resultsText.textContent = 'Searching...';
  
  try {
    const variables = {
      search: query || undefined,
      genre: filters.genre || undefined,
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
      container.innerHTML = `
        <div class="error-message">
          <h3>No results found</h3>
          <p>Try adjusting your search criteria</p>
        </div>
      `;
      resultsText.textContent = 'No results found';
      return;
    }
    
    container.innerHTML = animeList.map(anime => createAnimeCard(anime)).join('');
    resultsText.textContent = `Found ${animeList.length} results`;
    addCardClickListeners(container);
    
  } catch (error) {
    showError(container, 'Failed to search anime. Please try again later.');
    resultsText.textContent = 'Search failed';
  }
}

async function loadRankings(type = 'all') {
  const container = document.getElementById('rankingsGrid');
  if (!container) return;
  
  // Show loading skeletons
  container.innerHTML = Array(20).fill(0).map(() => createSkeletonCard()).join('');
  
  let query, variables;
  
  switch (type) {
    case 'popular':
      query = QUERIES.popular;
      variables = { page: 1, perPage: 20 };
      break;
    case 'trending':
      query = QUERIES.trending;
      variables = { page: 1, perPage: 20 };
      break;
    default:
      query = QUERIES.topRated;
      variables = { page: 1, perPage: 20 };
  }
  
  try {
    const data = await fetchFromAniList(query, variables);
    const animeList = data.Page.media;
    
    container.innerHTML = animeList.map((anime, index) => {
      const card = createAnimeCard(anime);
      return card.replace('<div class="anime-card"', `<div class="anime-card" data-rank="${index + 1}"`);
    }).join('');
    addCardClickListeners(container);
    
  } catch (error) {
    showError(container, 'Failed to load rankings. Please try again later.');
  }
}

function loadUserList(listType) {
  const container = document.getElementById('listsGrid');
  const emptyState = document.getElementById('emptyList');
  
  if (!container || !emptyState) return;
  
  const list = currentUser.lists[listType] || [];
  
  if (list.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  container.innerHTML = list.map(anime => {
    const card = createAnimeCard(anime);
    // Add progress info for user lists
    return card.replace('</div>', `
      <div class="list-progress">
        Progress: ${anime.progress || 0}/${anime.episodes || '?'}
        ${anime.score ? `| Score: ${anime.score}/10` : ''}
      </div>
    </div>`);
  }).join('');
  addCardClickListeners(container);
}

// Modal Functions
async function openAnimeModal(animeId) {
  const modalBody = document.getElementById('animeDetails');
  if (!modal || !modalBody) return;
  
  currentAnimeId = animeId;
  
  // Show modal with loading state
  modal.classList.remove('hidden');
  if (loadingOverlay) {
    loadingOverlay.classList.remove('hidden');
  }
  
  try {
    const data = await fetchFromAniList(QUERIES.details, { id: parseInt(animeId) });
    const anime = data.Media;
    
    modalBody.innerHTML = createAnimeDetail(anime);
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
    
    // Add listeners for modal actions
    modalBody.querySelectorAll('[data-action="add-to-list"]').forEach(btn => {
      btn.addEventListener('click', () => {
        openListModal(animeId);
      });
    });
    
    // Add listeners for recommendation cards
    addCardClickListeners(modalBody);
    
  } catch (error) {
    modalBody.innerHTML = `
      <div class="error-message">
        <h3>Failed to load anime details</h3>
        <p>Please try again later.</p>
      </div>
    `;
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }
}

function openListModal(animeId) {
  if (!listModal) return;
  
  currentAnimeId = animeId;
  listModal.classList.remove('hidden');
  
  // Pre-fill form if anime is already in a list
  const existingListType = isInUserList(animeId);
  if (existingListType) {
    const animeData = currentUser.lists[existingListType].find(item => item.id === animeId);
    if (animeData) {
      const statusSelect = document.getElementById('listStatus');
      const progressInput = document.getElementById('listProgress');
      const scoreInput = document.getElementById('listScore');
      const notesInput = document.getElementById('listNotes');
      
      if (statusSelect) statusSelect.value = existingListType;
      if (progressInput) progressInput.value = animeData.progress || 0;
      if (scoreInput) scoreInput.value = animeData.score || '';
      if (notesInput) notesInput.value = animeData.notes || '';
    }
  }
}

function closeAnimeModal() {
  if (!modal) return;
  
  modal.classList.add('hidden');
  const detailsContainer = document.getElementById('animeDetails');
  if (detailsContainer) {
    detailsContainer.innerHTML = '';
  }
  currentAnimeId = null;
}

function closeListModal() {
  if (!listModal) return;
  
  listModal.classList.add('hidden');
  
  const statusSelect = document.getElementById('listStatus');
  const progressInput = document.getElementById('listProgress');
  const scoreInput = document.getElementById('listScore');
  const notesInput = document.getElementById('listNotes');
  
  if (statusSelect) statusSelect.value = '';
  if (progressInput) progressInput.value = '';
  if (scoreInput) scoreInput.value = '';
  if (notesInput) notesInput.value = '';
  
  currentAnimeId = null;
}

async function saveToList() {
  const statusSelect = document.getElementById('listStatus');
  const progressInput = document.getElementById('listProgress');
  const scoreInput = document.getElementById('listScore');
  const notesInput = document.getElementById('listNotes');
  
  if (!statusSelect || !currentAnimeId) {
    showToast('Please select a status', 'error');
    return;
  }
  
  const status = statusSelect.value;
  const progress = parseInt(progressInput?.value) || 0;
  const score = parseInt(scoreInput?.value) || null;
  const notes = notesInput?.value || '';
  
  if (!status) {
    showToast('Please select a status', 'error');
    return;
  }
  
  try {
    // Get anime details for storage
    const data = await fetchFromAniList(QUERIES.details, { id: parseInt(currentAnimeId) });
    const anime = data.Media;
    
    const animeData = {
      id: anime.id,
      title: anime.title,
      coverImage: anime.coverImage,
      averageScore: anime.averageScore,
      genres: anime.genres,
      status: anime.status,
      episodes: anime.episodes,
      progress,
      score,
      notes
    };
    
    addToUserList(status, animeData);
    closeListModal();
    showToast(`Added to ${status} list!`, 'success');
    
    // Refresh current page if viewing lists
    if (currentPage === 'lists') {
      const activeListBtn = document.querySelector('.lists-nav .btn.active');
      if (activeListBtn) {
        loadUserList(activeListBtn.dataset.list);
      }
    }
    
  } catch (error) {
    console.error('Failed to save to list:', error);
    showToast('Failed to save to list', 'error');
  }
}

function switchPage(pageId) {
  // Update navigation
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.page === pageId);
  });
  
  // Update pages
  pages.forEach(page => {
    page.classList.toggle('active', page.id === `${pageId}Page`);
    page.classList.toggle('hidden', page.id !== `${pageId}Page`);
  });
  
  currentPage = pageId;
  
  // Load page data
  switch (pageId) {
    case 'home':
      loadHomePage();
      break;
    case 'search':
      initializeSearchPage();
      break;
    case 'browse':
      // Browse page is static, no loading needed
      break;
    case 'rankings':
      loadRankings();
      break;
    case 'lists':
      loadUserList('watching');
      break;
  }
}

function initializeSearchPage() {
  // Populate filter dropdowns
  const genreFilter = document.getElementById('genreFilter');
  const yearFilter = document.getElementById('yearFilter');
  const statusFilter = document.getElementById('statusFilter');
  const formatFilter = document.getElementById('formatFilter');
  
  // Only populate if empty
  if (genreFilter && genreFilter.children.length === 1) {
    GENRES.forEach(genre => {
      const option = document.createElement('option');
      option.value = genre;
      option.textContent = genre;
      genreFilter.appendChild(option);
    });
  }
  
  if (yearFilter && yearFilter.children.length === 1) {
    YEARS.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      yearFilter.appendChild(option);
    });
  }
  
  if (statusFilter && statusFilter.children.length === 1) {
    STATUSES.forEach(status => {
      const option = document.createElement('option');
      option.value = status.value;
      option.textContent = status.label;
      statusFilter.appendChild(option);
    });
  }
  
  if (formatFilter && formatFilter.children.length === 1) {
    FORMATS.forEach(format => {
      const option = document.createElement('option');
      option.value = format.value;
      option.textContent = format.label;
      formatFilter.appendChild(option);
    });
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Load user data
  loadUserData();
  initTheme();
  
  // Navigation
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const pageId = link.dataset.page;
      switchPage(pageId);
    });
  });
  
  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Search functionality
  if (searchButton) {
    searchButton.addEventListener('click', () => {
      const query = searchInput?.value?.trim();
      if (query) {
        switchPage('search');
        performSearch(query);
      }
    });
  }
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      debouncedSearch(query);
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
          switchPage('search');
          performSearch(query);
        }
      }
    });
  }
  
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (searchSuggestions && 
        !searchInput?.contains(e.target) && 
        !searchSuggestions.contains(e.target)) {
      searchSuggestions.classList.add('hidden');
    }
  });
  
  // Search filters
  const applyFiltersBtn = document.getElementById('applyFilters');
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', () => {
      const genreFilter = document.getElementById('genreFilter');
      const yearFilter = document.getElementById('yearFilter');
      const statusFilter = document.getElementById('statusFilter');
      const formatFilter = document.getElementById('formatFilter');
      const sortFilter = document.getElementById('sortFilter');
      
      const filters = {
        genre: genreFilter?.value || '',
        year: yearFilter?.value || '',
        status: statusFilter?.value || '',
        format: formatFilter?.value || '',
        sort: sortFilter?.value || 'POPULARITY_DESC'
      };
      
      const query = searchInput?.value?.trim() || '';
      performSearch(query, filters);
    });
  }
  
  // Rankings filters
  document.querySelectorAll('[data-ranking]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-ranking]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadRankings(btn.dataset.ranking);
    });
  });
  
  // Lists navigation
  document.querySelectorAll('[data-list]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-list]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadUserList(btn.dataset.list);
    });
  });
  
  // Browse categories
  document.querySelectorAll('[data-browse]').forEach(card => {
    card.addEventListener('click', () => {
      const browseType = card.dataset.browse;
      // For now, redirect to search page with appropriate filters
      switchPage('search');
      showToast(`Browse by ${browseType} - Use filters to narrow down results`, 'info');
    });
  });
  
  // Hero actions
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-action="start-search"]')) {
      switchPage('search');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    if (e.target.matches('[data-action="view-trending"]')) {
      switchPage('rankings');
      loadRankings('trending');
    }
    
    if (e.target.matches('[data-action="view-all-trending"]')) {
      switchPage('rankings');
      loadRankings('trending');
    }
    
    if (e.target.matches('[data-action="view-seasonal"]')) {
      switchPage('browse');
    }
  });
  
  // Modal functionality
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeAnimeModal);
  }
  
  if (closeListModalBtn) {
    closeListModalBtn.addEventListener('click', closeListModal);
  }
  
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('modal__backdrop')) {
        closeAnimeModal();
      }
    });
  }
  
  if (listModal) {
    listModal.addEventListener('click', (e) => {
      if (e.target === listModal || e.target.classList.contains('modal__backdrop')) {
        closeListModal();
      }
    });
  }
  
  // List management
  const saveToListBtn = document.getElementById('saveToList');
  const cancelListBtn = document.getElementById('cancelList');
  
  if (saveToListBtn) {
    saveToListBtn.addEventListener('click', saveToList);
  }
  
  if (cancelListBtn) {
    cancelListBtn.addEventListener('click', closeListModal);
  }
  
  // Close modals with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal && !modal.classList.contains('hidden')) {
        closeAnimeModal();
      } else if (listModal && !listModal.classList.contains('hidden')) {
        closeListModal();
      }
    }
  });
  
  // Initialize app
  loadHomePage();
});

// Service Worker for PWA features (if needed)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service worker registration would go here
    console.log('AniClone loaded successfully!');
  });
}
