// ===== DOM Helpers =====
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);

// ===== Utility Functions =====
export function getDisplayTitle(anime) {
  return anime.title?.english || anime.title?.romaji || 'Unknown';
}

export function getStatusBadgeClass(status) {
  switch (status) {
    case 'FINISHED': return 'status-badge--finished';
    case 'RELEASING': return 'status-badge--releasing';
    case 'NOT_YET_RELEASED': return 'status-badge--not-yet-released';
    default: return 'status-badge--finished';
  }
}

export function getStatusText(status) {
  switch (status) {
    case 'FINISHED': return 'Finished';
    case 'RELEASING': return 'Ongoing';
    case 'NOT_YET_RELEASED': return 'Not Released';
    case 'CANCELLED': return 'Cancelled';
    case 'HIATUS': return 'Hiatus';
    default: return 'Unknown';
  }
}

export function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 1 && month <= 3) return 'WINTER';
  if (month >= 4 && month <= 6) return 'SPRING';
  if (month >= 7 && month <= 9) return 'SUMMER';
  return 'FALL';
}

export function showError(container, message) {
  container.innerHTML = `<div class="error-message"><h3>Oops! Something went wrong</h3><p>${message}</p></div>`;
}

// ===== Toast Notifications =====
export function showToast(message, type = 'info', duration = 3000) {
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
