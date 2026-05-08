// ===== UI Components =====
import { getDisplayTitle, getStatusBadgeClass, getStatusText, stripHtml } from './utils.js';
import { SEASON_NAMES } from './config.js';
import { isInUserList } from './state.js';

export function createAnimeCard(anime, rank = null) {
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

export function createSkeletonCard() {
  return `<div class="skeleton-card"><div class="skeleton-image skeleton"></div><div class="skeleton-content"><div class="skeleton-title skeleton"></div><div class="skeleton-text skeleton"></div><div class="skeleton-text skeleton"></div></div></div>`;
}

export function createAnimeDetail(anime) {
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
              <button class="btn btn--outline btn--favorite" data-action="favorite" data-anime-id="${anime.id}">
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
