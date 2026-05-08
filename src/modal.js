// ===== Modal Functions =====
import { QUERIES } from './config.js';
import { fetchFromAniList } from './api.js';
import { currentUser, currentAnimeId, setCurrentAnimeId, isInUserList, addToUserList, saveUserData } from './state.js';
import { $, showToast } from './utils.js';
import { createAnimeDetail } from './components.js';
import { addCardClickListeners } from './pages.js';

export async function openAnimeModal(animeId, openListModalFn) {
  const modalBody = $('#animeDetails');
  const modal = $('#animeModal');
  const loadingOverlay = $('#loadingOverlay');
  if (!modal || !modalBody) return;

  setCurrentAnimeId(animeId);
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
      btn.addEventListener('click', () => openListModalFn(animeId));
    });

    // Recommendation cards
    addCardClickListeners(modalBody, (id) => openAnimeModal(id, openListModalFn), openListModalFn);

  } catch (e) {
    modalBody.innerHTML = `<div class="error-message"><h3>Failed to load anime details</h3><p>Please try again later.</p></div>`;
    loadingOverlay?.classList.add('hidden');
  }
}

export function openListModal(animeId) {
  const listModal = $('#listModal');
  if (!listModal) return;

  setCurrentAnimeId(animeId);
  listModal.classList.remove('hidden');

  const existingListType = isInUserList(animeId);
  if (existingListType) {
    const animeData = currentUser.lists[existingListType].find(item => item.id == animeId);
    if (animeData) {
      const el = (id) => $(id);
      if (el('#listStatus')) el('#listStatus').value = existingListType;
      if (el('#listProgress')) el('#listProgress').value = animeData.progress || 0;
      if (el('#listScore')) el('#listScore').value = animeData.score || '';
      if (el('#listNotes')) el('#listNotes').value = animeData.notes || '';
    }
  }
}

export function closeAnimeModal() {
  const modal = $('#animeModal');
  if (!modal) return;
  modal.classList.add('hidden');
  const details = $('#animeDetails');
  if (details) details.innerHTML = '';
  setCurrentAnimeId(null);
}

export function closeListModal() {
  const listModal = $('#listModal');
  if (!listModal) return;
  listModal.classList.add('hidden');
  ['listStatus','listProgress','listScore','listNotes'].forEach(id => {
    const el = $(`#${id}`);
    if (el) el.value = '';
  });
  setCurrentAnimeId(null);
}

export async function saveToList(currentPage, openAnimeModalFn, openListModalFn) {
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
      if (activeBtn) {
        const { loadUserList } = await import('./pages.js');
        loadUserList(activeBtn.dataset.list, openAnimeModalFn, openListModalFn);
      }
    }
  } catch (e) {
    showToast('Failed to save to list', 'error');
  }
}
