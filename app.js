/**
 * HotShotz — Frontend v3.1
 * Performance: single /api/submissions/homepage call on load.
 * All sections hydrate from one response. Zero fake data.
 */

/* ═══════════════════════ STATE ═══════════════════════ */
const API_BASE = '/api';

const state = {
  submissions:    [],
  trendingData:   [],
  currentPage:    1,
  totalPages:     1,
  activeCategory: '',
  activeSort:     'votes',
  isLoading:      false,
  currentWeek:    '',
};

/* ═══════════════════════ API ═══════════════════════ */
async function apiFetch(path, opts = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...opts, headers });
  let data;
  try   { data = await res.json(); }
  catch { throw new Error('Bad server response'); }
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

/* ═══════════════════════ DOM ═══════════════════════ */
const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function catLabel(cat) {
  return ({poetry:'✍️ Poetry',photography:'🖼️ Photo',story:'📖 Story',art:'🎨 Art',music:'🎵 Music',other:'✨ Other'})[cat] || cat;
}

function skel(n = 3) {
  return Array(n).fill('<div class="skeleton-card"></div>').join('');
}

/* Count-up animation */
function countUp(el, target, ms = 800) {
  if (!el) return;
  const start = performance.now();
  const tick  = now => {
    const p = Math.min((now - start) / ms, 1);
    const e = 1 - Math.pow(1 - p, 3); // ease-out-cubic
    el.textContent = Math.round(target * e).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ═══════════════════════ LOADER ═══════════════════════ */
function hideLoader() {
  const loader = $('#loader');
  if (!loader) return;
  loader.classList.add('fade-out');
  setTimeout(() => loader.remove(), 500);
}

/* ═══════════════════════ NAV SCROLL ═══════════════════════ */
window.addEventListener('scroll', () => {
  $('#nav')?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ═══════════════════════ SCROLL ANIMATIONS ═══════════════════════ */
function initScrollAnimations() {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
    { threshold: 0.1 }
  );
  $$('[data-animate]').forEach(el => io.observe(el));
}

/* ═══════════════════════ TOAST ═══════════════════════ */
let _toastTimer;
function showToast(msg, type = 'info') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast toast-${type}`;
  t.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ═══════════════════════════════════════════════════════
   HOMEPAGE BOOT — single network call
   Returns: stats, trending, leaderboard, submissions[page1]
   ═══════════════════════════════════════════════════════ */
async function bootHomepage() {
  try {
    const data = await apiFetch('/submissions/homepage');

    /* --- Week label --- */
    if (data.weekId) {
      const [yr, wk] = data.weekId.split('-');
      const label = `W${wk} · ${yr}`;
      const badge  = $('#current-week-badge');
      const footer = $('#footer-week');
      if (badge)  badge.textContent  = label;
      if (footer) footer.textContent = `Week ${label}`;
      state.currentWeek = data.weekId;
    }

    /* --- Stats strip --- */
    if (data.stats) {
      countUp($('#stat-week-subs'),    data.stats.weekSubmissions || 0);
      countUp($('#stat-total-votes'),  data.stats.totalVotes      || 0);
      countUp($('#stat-colleges'),     data.stats.collegeCount    || 1);
    }

    /* --- Winners --- */
    renderWinners(data.leaderboard || []);

    /* --- Trending --- */
    state.trendingData = data.trending || [];
    renderTrending(state.trendingData);

    /* --- Submissions feed (page 1) --- */
    state.submissions = data.data || [];
    state.totalPages  = data.pagination?.pages || 1;
    renderFeed(state.submissions, true);

  } catch (err) {
    console.warn('Homepage boot failed:', err.message);
    // Graceful degradation: hide sections, show message in feed
    ['#winners-section','#trending-section'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'none';
    });
    const grid = $('#submissions-grid');
    if (grid) grid.innerHTML = `<p class="feed-error">Could not reach the server. Please check your connection.</p>`;
  }
}

/* ═══════════════════════ WINNERS ═══════════════════════ */
function renderWinners(data) {
  const grid = $('#winners-grid');
  if (!grid) return;

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="winners-empty"><span class="winners-empty-icon">⏳</span><p>Winners are crowned at week's end — keep voting!</p></div>`;
    return;
  }

  const medals  = ['🥇','🥈','🥉'];
  const classes = ['rank-gold','rank-silver','rank-bronze'];
  const labels  = ['1st Place','2nd Place','3rd Place'];

  grid.innerHTML = data.map((s, i) => `
    <article class="winner-card ${classes[i]}" data-id="${s._id}" role="button" tabindex="0">
      <div class="winner-glow" aria-hidden="true"></div>
      <div class="winner-medal" style="animation-delay:${i*0.1}s">${medals[i]}</div>
      <div class="winner-rank-label">${labels[i]}</div>
      ${s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.title)}" class="winner-img" loading="lazy">` : ''}
      <div class="winner-category">${catLabel(s.category)}</div>
      <h3 class="winner-title">${esc(s.title)}</h3>
      <div class="winner-author">
        <span class="winner-author-name">👤 ${esc(s.authorName)}</span>
        <span class="winner-author-college">🎓 ${esc(s.authorCollege || 'Unknown College')}</span>
      </div>
      <div class="winner-footer">
        <span class="winner-votes">🔥 ${(s.voteCount||0).toLocaleString()} votes</span>
      </div>
    </article>
  `).join('');

  $$('.winner-card', grid).forEach(c => {
    c.addEventListener('click',   () => openModal(c.dataset.id));
    c.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(c.dataset.id); });
  });
}

/* ═══════════════════════ TRENDING ═══════════════════════ */
function renderTrending(data) {
  const grid = $('#trending-grid');
  if (!grid) return;

  if (!data || data.length === 0) {
    $('#trending-section') && ($('#trending-section').style.display = 'none');
    return;
  }

  grid.innerHTML = '';
  data.forEach((s, i) => grid.appendChild(buildCard(s, i)));
  attachCardHandlers(grid);
}

/* ═══════════════════════ FEED ═══════════════════════ */
function renderFeed(data, reset) {
  const grid         = $('#submissions-grid');
  const emptyState   = $('#empty-state');
  const loadMoreWrap = $('#load-more-wrap');
  if (!grid) return;

  if (reset) grid.innerHTML = '';

  if (state.submissions.length === 0) {
    emptyState?.classList.remove('hidden');
    loadMoreWrap?.classList.add('hidden');
    return;
  }

  emptyState?.classList.add('hidden');
  data.forEach((s, i) => grid.appendChild(buildCard(s, i)));
  attachCardHandlers(grid);
  loadMoreWrap?.classList.toggle('hidden', state.currentPage >= state.totalPages);
}

/* ═══════════════════════ CARD BUILDER ═══════════════════════ */
function buildCard(s, idx) {
  const card = document.createElement('article');
  card.className = `card${s.isWinner ? ' card-winner' : ''}`;
  card.dataset.id = s._id;
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.style.animationDelay = `${Math.min(idx, 8) * 0.05}s`;
  card.classList.add('animate-in');

  const excerpt = esc(s.content || '').slice(0, 180) + ((s.content || '').length > 180 ? '…' : '');

  card.innerHTML = `
    ${s.imageUrl ? `
      <div class="card-img-wrap">
        <img src="${esc(s.imageUrl)}" alt="${esc(s.title)}" class="card-img" loading="lazy">
        <div class="card-img-overlay"></div>
      </div>` : ''}
    <div class="card-body">
      <div class="card-top-row">
        <span class="card-category">${catLabel(s.category)}</span>
        ${s.isWinner ? `<span class="card-crown">${['🥇','🥈','🥉'][s.rank-1]||'🏆'}</span>` : ''}
      </div>
      <h3 class="card-title">${esc(s.title)}</h3>
      <div class="card-author-row">
        <span class="card-author-name">👤 ${esc(s.authorName)}</span>
        <span class="card-author-college">🎓 ${esc(s.authorCollege || 'Unknown')}</span>
      </div>
      ${!s.imageUrl ? `<p class="card-excerpt">${excerpt}</p>` : ''}
      <div class="card-footer">
        <button class="vote-btn${s.hasVoted ? ' voted' : ''}" data-id="${s._id}" aria-pressed="${!!s.hasVoted}">
          <svg width="14" height="14" fill="${s.hasVoted ? 'currentColor' : 'none'}"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span class="vote-count">${(s.voteCount||0).toLocaleString()}</span>
        </button>
        <button class="read-btn" data-id="${s._id}">Read →</button>
      </div>
    </div>
  `;
  return card;
}

function attachCardHandlers(ctx) {
  $$('.card', ctx).forEach(card => {
    card.addEventListener('click', e => {
      if (!e.target.closest('.vote-btn') && !e.target.closest('.read-btn')) openModal(card.dataset.id);
    });
    card.addEventListener('keydown', e => { if (e.key === 'Enter') openModal(card.dataset.id); });
  });
  $$('.vote-btn', ctx).forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); handleVote(btn); }));
  $$('.read-btn', ctx).forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); openModal(btn.dataset.id); }));
}

/* ═══════════════════════ LOAD MORE (page 2+) ═══════════════════════ */
async function loadMore() {
  if (state.isLoading) return;
  state.isLoading = true;
  const btn = $('#load-more-btn');
  if (btn) btn.textContent = 'Loading…';

  try {
    const params = new URLSearchParams({ sort: state.activeSort, page: state.currentPage + 1, limit: 9 });
    if (state.activeCategory) params.set('category', state.activeCategory);

    const { data, pagination } = await apiFetch(`/submissions?${params}`);
    state.currentPage = pagination.page;
    state.totalPages  = pagination.pages;
    state.submissions = [...state.submissions, ...data];
    renderFeed(data, false);
  } catch (err) {
    showToast('Could not load more submissions.', 'error');
  } finally {
    state.isLoading = false;
    if (btn) btn.textContent = 'Load More';
  }
}

/* ═══════════════════════ FILTER / SORT ═══════════════════════ */
async function reloadFeed() {
  if (state.isLoading) return;
  state.isLoading   = true;
  state.currentPage = 1;
  state.submissions = [];

  const grid = $('#submissions-grid');
  if (grid) grid.innerHTML = skel(6);

  try {
    const params = new URLSearchParams({ sort: state.activeSort, page: 1, limit: 9 });
    if (state.activeCategory) params.set('category', state.activeCategory);

    const { data, pagination } = await apiFetch(`/submissions?${params}`);
    state.submissions = data;
    state.totalPages  = pagination.pages;
    if (grid) grid.innerHTML = '';
    renderFeed(data, true);
  } catch {
    if (grid) grid.innerHTML = `<p class="feed-error">Failed to load submissions.</p>`;
  } finally {
    state.isLoading = false;
  }
}

$('#category-filters')?.addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  $$('.chip').forEach(c => c.classList.remove('chip-active'));
  chip.classList.add('chip-active');
  state.activeCategory = chip.dataset.category;
  reloadFeed();
});

$('#sort-select')?.addEventListener('change', function() {
  state.activeSort = this.value;
  reloadFeed();
});

$('#load-more-btn')?.addEventListener('click', loadMore);
$('#empty-submit-btn')?.addEventListener('click', () => $('#submit-section')?.scrollIntoView({ behavior: 'smooth' }));

/* ═══════════════════════ VOTING ═══════════════════════ */
async function handleVote(btn) {
  const id = btn.dataset.id;
  btn.disabled = true;
  try {
    const { action, voteCount } = await apiFetch('/vote', {
      method: 'POST',
      body:   JSON.stringify({ submissionId: id }),
    });
    const voted = action === 'voted';

    // Sync all buttons with this ID across entire page
    $$(`[data-id="${id}"].vote-btn`).forEach(b => {
      b.classList.toggle('voted', voted);
      b.setAttribute('aria-pressed', String(voted));
      const ct = b.querySelector('.vote-count');
      if (ct) ct.textContent = voteCount.toLocaleString();
      const svg = b.querySelector('svg');
      if (svg) svg.setAttribute('fill', voted ? 'currentColor' : 'none');
    });

    // Sync state arrays
    [state.submissions, state.trendingData].forEach(arr => {
      const s = arr.find(x => x._id === id || x._id?.toString() === id);
      if (s) { s.voteCount = voteCount; s.hasVoted = voted; }
    });

    showToast(voted ? '🔥 Voted!' : '↩️ Vote removed', voted ? 'success' : 'info');
  } catch (err) {
    showToast(err.message || 'Vote failed.', 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ═══════════════════════ MODAL ═══════════════════════ */
function findSub(id) {
  return state.submissions.find(s => s._id === id || s._id?.toString() === id)
      || state.trendingData.find(s => s._id === id || s._id?.toString() === id);
}

function openModal(id) {
  const s = findSub(id);
  if (!s) return;

  const backdrop = $('#modal-backdrop');
  const body     = $('#modal-body');
  if (!backdrop || !body) return;

  body.innerHTML = `
    ${s.imageUrl ? `<img src="${esc(s.imageUrl)}" alt="${esc(s.title)}" class="modal-img">` : ''}
    <div class="modal-meta-top">
      <span class="modal-category">${catLabel(s.category)}</span>
      ${s.isWinner ? `<span class="modal-crown">${['🥇','🥈','🥉'][s.rank-1]||'🏆'} Winner</span>` : ''}
    </div>
    <h2 class="modal-title">${esc(s.title)}</h2>
    <div class="modal-author">
      <span>👤 <strong>${esc(s.authorName)}</strong></span>
      <span>🎓 ${esc(s.authorCollege || 'Unknown College')}</span>
    </div>
    <div class="modal-divider"></div>
    <div class="modal-content">${esc(s.content||'').replace(/\n/g,'<br>')}</div>
    <div class="modal-actions">
      <button class="vote-btn modal-vote-btn${s.hasVoted ? ' voted' : ''}" data-id="${s._id}" aria-pressed="${!!s.hasVoted}">
        <svg width="15" height="15" fill="${s.hasVoted ? 'currentColor' : 'none'}" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
        ${s.hasVoted ? 'Remove Vote' : '🔥 Vote for this'}
        &nbsp;<span class="modal-vote-count">${(s.voteCount||0).toLocaleString()} votes</span>
      </button>
    </div>
  `;

  backdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  body.querySelector('.modal-vote-btn')?.addEventListener('click', function() {
    handleVote(this);
  });
}

function closeModal() {
  $('#modal-backdrop')?.classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('click', e => {
  const bd = $('#modal-backdrop');
  if (bd && !bd.classList.contains('hidden') &&
      (e.target === bd || e.target.closest('#modal-close'))) closeModal();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ═══════════════════════ IMAGE UPLOAD ═══════════════════════ */
let uploadedImageUrl = null;

const uploadArea    = $('#upload-area');
const imageFileEl   = $('#f-image-file');
const imagePreview  = $('#image-preview');
const uploadStatus  = $('#upload-status');

if (imageFileEl) {
  ['dragenter','dragover'].forEach(ev =>
    uploadArea?.addEventListener(ev, e => { e.preventDefault(); uploadArea.classList.add('drag-over'); }));
  ['dragleave','drop'].forEach(ev =>
    uploadArea?.addEventListener(ev, e => { e.preventDefault(); uploadArea.classList.remove('drag-over'); }));
  uploadArea?.addEventListener('drop', e => { const f = e.dataTransfer?.files[0]; if (f) handleFile(f); });
  imageFileEl.addEventListener('change', e => { const f = e.target.files[0]; if (f) handleFile(f); });
}

async function handleFile(file) {
  if (!file.type.startsWith('image/')) { showFormAlert('Select an image file.', 'error'); return; }
  if (file.size > 5 * 1024 * 1024)    { showFormAlert('Image must be under 5MB.', 'error'); return; }

  if (uploadStatus) { uploadStatus.textContent = '⏳ Uploading…'; uploadStatus.style.color = ''; }

  const reader = new FileReader();
  reader.onload = async ev => {
    const b64 = ev.target.result;
    if (imagePreview) { imagePreview.src = b64; imagePreview.classList.remove('hidden'); }

    try {
      const token = getToken();
      if (!token) { uploadedImageUrl = null; if (uploadStatus) uploadStatus.textContent = 'Sign in to attach images'; return; }

      const res  = await fetch('/api/upload', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ data: b64 }),
      });
      const data = await res.json();
      if (data.success) {
        uploadedImageUrl = data.url;
        if (uploadStatus) { uploadStatus.textContent = '✅ Image ready'; uploadStatus.style.color = '#10b981'; }
      } else throw new Error(data.message);
    } catch {
      uploadedImageUrl = null;
      if (uploadStatus) { uploadStatus.textContent = '⚠️ Upload failed — text only'; uploadStatus.style.color = '#f59e0b'; }
    }
  };
  reader.readAsDataURL(file);
}

/* ═══════════════════════ SUBMIT FORM ═══════════════════════ */
const charCountEl = $('#char-count');
$('#f-content')?.addEventListener('input', function() {
  if (charCountEl) charCountEl.textContent = this.value.length;
});

$('#submit-form')?.addEventListener('submit', async e => {
  e.preventDefault();

  const title         = $('#f-title')?.value.trim();
  const category      = $('#f-category')?.value;
  const content       = $('#f-content')?.value.trim();
  const authorName    = $('#f-author')?.value.trim();
  const authorCollege = $('#f-college')?.value.trim();

  if (!title || !category || !content || !authorName || !authorCollege) {
    showFormAlert('Please fill all required fields.', 'error'); return;
  }

  const btn  = $('#submit-btn');
  const text = $('#submit-btn-text');
  const spin = $('#submit-spinner');

  if (text) text.textContent = 'Submitting…';
  spin?.classList.remove('hidden');
  if (btn) btn.disabled = true;

  try {
    await apiFetch('/submissions', {
      method: 'POST',
      body:   JSON.stringify({ title, category, content, authorName, authorCollege, imageUrl: uploadedImageUrl }),
    });
    showFormAlert('🔥 Your shot is in! It will appear after review.', 'success');
    $('#submit-form')?.reset();
    if (charCountEl)  charCountEl.textContent = '0';
    if (imagePreview) imagePreview.classList.add('hidden');
    if (uploadStatus) uploadStatus.textContent = '';
    uploadedImageUrl = null;
  } catch (err) {
    showFormAlert(err.message || 'Something went wrong.', 'error');
  } finally {
    if (text) text.textContent = 'Submit My Shot';
    spin?.classList.add('hidden');
    if (btn) btn.disabled = false;
  }
});

function showFormAlert(msg, type) {
  const el = $('#form-alert');
  if (!el) return;
  el.textContent = msg;
  el.className   = `form-alert ${type}`;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ═══════════════════════ AUTH ═══════════════════════ */
function getToken()   { return localStorage.getItem('hs_token'); }
function getUser()    { try { return JSON.parse(localStorage.getItem('hs_user')); } catch { return null; } }
function isLoggedIn() { return !!(getToken() && getUser()); }

const GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#4f46e5)','linear-gradient(135deg,#0891b2,#0e7490)',
  'linear-gradient(135deg,#d97706,#b45309)','linear-gradient(135deg,#dc2626,#b91c1c)',
  'linear-gradient(135deg,#059669,#047857)','linear-gradient(135deg,#db2777,#be185d)',
  'linear-gradient(135deg,#7c3aed,#db2777)','linear-gradient(135deg,#0891b2,#059669)',
];

function renderNavAuth() {
  const guest = $('#nav-guest');
  const user  = $('#nav-user');
  if (!guest || !user) return;

  if (isLoggedIn()) {
    const u = getUser();
    guest.classList.add('hidden');
    user.classList.remove('hidden');

    const av = $('#nav-avatar-display');
    if (av) { av.textContent = (u.username||'U').slice(0,2).toUpperCase(); av.style.background = GRADIENTS[(u.avatar||0)%8]; }
    const nm = $('#nav-username-display');
    if (nm) nm.textContent = u.username;

    const ddh = $('#nav-dropdown-header');
    if (ddh) ddh.innerHTML = `
      <span class="dd-name">@${esc(u.username)}</span>
      <span class="dd-email">${esc(u.email)}</span>
      ${u.college ? `<span class="dd-college">🎓 ${esc(u.college)}</span>` : ''}`;

    const fa = $('#f-author'),  fc = $('#f-college');
    if (fa && !fa.value) fa.value = u.username;
    if (fc && !fc.value) fc.value = u.college || '';
  } else {
    guest.classList.remove('hidden');
    user.classList.add('hidden');
  }
}

function renderSubmitSection() {
  const form   = $('#submit-form');
  const prompt = $('#submit-login-prompt');
  if (!form || !prompt) return;
  if (isLoggedIn()) { form.classList.remove('hidden'); prompt.classList.add('hidden'); }
  else              { form.classList.add('hidden');    prompt.classList.remove('hidden'); }
}

function logout() {
  localStorage.removeItem('hs_token');
  localStorage.removeItem('hs_user');
  renderNavAuth();
  renderSubmitSection();
  showToast('👋 Signed out!', 'info');
  $('#nav-dropdown')?.classList.add('hidden');
}

/* Dropdown */
const navAvatarBtn = $('#nav-avatar-btn');
const navDropdown  = $('#nav-dropdown');

navAvatarBtn?.addEventListener('click', e => {
  e.stopPropagation();
  const open = !navDropdown.classList.contains('hidden');
  navDropdown.classList.toggle('hidden', open);
  navAvatarBtn.setAttribute('aria-expanded', String(!open));
});
document.addEventListener('click', () => {
  navDropdown?.classList.add('hidden');
  navAvatarBtn?.setAttribute('aria-expanded','false');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { navDropdown?.classList.add('hidden'); closeModal(); } });

$('#logout-btn')?.addEventListener('click', logout);
$('#dropdown-submit-link')?.addEventListener('click', () => navDropdown?.classList.add('hidden'));

/* CTA buttons */
$('#nav-submit-btn')?.addEventListener('click', () => {
  isLoggedIn() ? $('#submit-section')?.scrollIntoView({ behavior: 'smooth' })
               : (window.location.href = 'login.html?from=index.html');
});
$('#hero-submit-btn')?.addEventListener('click', () => {
  isLoggedIn() ? $('#submit-section')?.scrollIntoView({ behavior: 'smooth' })
               : (window.location.href = 'register.html');
});

/* ═══════════════════════ INIT ═══════════════════════ */
async function init() {
  initScrollAnimations();
  renderNavAuth();
  renderSubmitSection();

  // Single network call — all homepage data in one shot
  await bootHomepage();

  hideLoader();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
