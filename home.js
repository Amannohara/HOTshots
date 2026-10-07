/* HotShotz demo layer. Loads after app.js. Real voting/feed/submit logic stays in app.js. */
(function () {
  /* Motion: one scroll reveal for demo sections, runs even without demo data. */
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!calm && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: 0.12 });
    document.querySelectorAll('.demo-wrap').forEach((el) => { el.classList.add('reveal'); io.observe(el); });
  }
  if (!window.DEMO_MODE || !window.DEMO) return;
  const D = window.DEMO;
  const $ = (s) => document.querySelector(s);
  const e = window.esc || ((s) => String(s));
  const av = (u, size = '') => `<span class="av ${size}" style="background:${u.color}">${e(u.initials)}</span>`;
  const put = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; };

  /* app.js calls countUp() with real numbers; show demo numbers for the hero stats instead. */
  const realCountUp = window.countUp;
  window.countUp = (el, target, ms) => realCountUp(el, (el && D.statMap[el.id]) || target, ms);

  /* Hero side panel */
  const top = D.submissions[0], win = D.submissions[3];
  put('#demo-hero-panel', `
    <div class="live-row"><span class="live-dot"></span>LIVE <span class="dim">· ${D.stats.weeklyActive} creators online · updated 3 mins ago</span></div>
    <div class="note note-theme"><small>Current theme</small><b>${e(D.theme)}</b><span class="hand">write about it, shoot it, draw it</span></div>
    <div class="note note-top"><small>Most voted today</small><b>${e(top.title)}</b>
      <span>${av(top.user, 'sm')} ${e(top.user.name)} · ${top.votes} votes <em class="up">↑12%</em></span></div>
    <div class="note note-win"><small>Recent winner · Week ${D.week - 1}</small><b>${e(win.title)}</b><span>${e(win.user.college)}</span></div>`);

  /* Trending masonry (typographic tiles, since demo entries have no images) */
  const catName = { photo: 'Photography', poetry: 'Poetry', story: 'Story', sketch: 'Sketch', art: 'Digital art', meme: 'Meme', music: 'Music' };
  put('#demo-masonry', D.submissions.map((s, i) => `
    <article class="tile t${i % 5} ${s.tall ? 'tall' : ''}">
      <div class="tile-art"><span>${e(s.title)}</span></div>
      <div class="tile-body">
        <h3>${e(s.title)}</h3>
        <p class="cap">${e(s.caption)}</p>
        <div class="by">${av(s.user, 'sm')}<span>${e(s.user.name)}<br><small>${e(s.user.college)} · ${catName[s.cat]}</small></span></div>
        <div class="meta"><button class="bm" aria-label="Bookmark ${e(s.title)}">♡ ${s.votes}</button><span>💬 ${s.comments}</span><span>${s.views.toLocaleString()} views</span><span>${s.time}</span></div>
      </div>
    </article>`).join(''));

  /* College leaderboard: top 3 as big cards, the rest as a plain list */
  const [a, b, c] = D.colleges;
  const big = (col, i) => `<article class="lb lb${i}"><span class="crown">${['👑', '', ''][i] || ''}</span><small>#${i + 1} ${col.city}</small>
      <h3>${e(col.name)}</h3><div class="pts" data-to="${col.points}">0</div><span>weekly points</span>
      <em class="${col.growth < 0 ? 'down' : 'up'}">${col.growth < 0 ? '↓' : '↑'}${Math.abs(col.growth)}%</em></article>`;
  put('#demo-lb-top', [a, b, c].map(big).join(''));
  put('#demo-lb-rest', D.colleges.slice(3).map((col, i) => `
    <li><span class="rk">${i + 4}</span><span class="nm">${e(col.name)}${col.growth > 15 ? ' <mark>Hot this week</mark>' : ''}</span>
      <span class="pt">${col.points.toLocaleString()}</span><em class="${col.growth < 0 ? 'down' : 'up'}">${col.growth < 0 ? '↓' : '↑'}${Math.abs(col.growth)}%</em></li>`).join(''));
  document.querySelectorAll('.pts').forEach((el) => {
    const to = +el.dataset.to, t0 = performance.now();
    const tick = (t) => { const p = Math.min((t - t0) / 900, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString(); if (p < 1) requestAnimationFrame(tick); };
    matchMedia('(prefers-reduced-motion: reduce)').matches ? (el.textContent = to.toLocaleString()) : requestAnimationFrame(tick);
  });

  /* Spotlight */
  const sp = D.spotlight, u = sp.user;
  put('#demo-spotlight', `${av(u, 'lg')}<div><small>Creator of the week</small><h3>${e(u.name)}</h3>
    <p>${e(sp.note)}</p><p class="dim">${e(u.college)} · Joined ${u.joined} · <b>${sp.followers.toLocaleString()}</b> followers · <b>${sp.wins}</b> wins</p>
    <span class="badge">${e(u.badge)}</span> <span class="badge">Verified college</span></div>`);

  /* Activity, themes, testimonials, stats line */
  put('#demo-activity', D.activity.map(([t, when]) => `<li>${e(t)}<time>${when}</time></li>`).join(''));
  put('#demo-themes', D.themes.map(([t, w], i) => `<li class="th${i % 3}">${e(t)}<small>${w}</small></li>`).join(''));
  put('#demo-quotes', D.testimonials.map(([q, u2], i) => `<figure class="q q${i}"><blockquote>${e(q)}</blockquote>
    <figcaption>${av(u2, 'sm')} ${e(u2.name)}, ${e(u2.college)}</figcaption></figure>`).join(''));
  put('#demo-extra-stats', `<span><b>${D.stats.creators.toLocaleString()}</b> creators</span><span><b>${D.stats.weeklyActive}</b> active this week</span><span><b>${D.stats.returning}%</b> come back</span>`);

  /* Ticker strip under the hero (content doubled for a seamless loop) */
  const tick = D.activity.map(([t, w]) => `<span>${e(t)} <i>${w}</i></span>`).join('') + D.themes.map(([t]) => `<span class="tk-theme">${e(t)}</span>`).join('');
  put('#demo-ticker', tick + tick);

  /* If the backend has no trending/winners (empty DB, cold start, offline), show sample entries. */
  const catMap = { photo: 'photography', poetry: 'poetry', story: 'story', sketch: 'art', art: 'art', meme: 'other', music: 'music' };
  const asReal = (s, i) => ({ _id: 'demo-' + i, title: s.title, category: catMap[s.cat], authorName: s.user.name, authorCollege: s.user.college,
    voteCount: s.votes, content: s.caption + ' (Sample entry.)', imageUrl: '', hasVoted: false });
  const realBoot = window.bootHomepage;
  window.bootHomepage = async function () {
    /* Don't wait on a slow/sleeping API: after 3s show sample entries; real data replaces them if it arrives. */
    await Promise.race([realBoot(), new Promise((r) => setTimeout(r, 3000))]);
    const badge = $('#current-week-badge');
    if (badge && badge.textContent.trim() === '—') badge.textContent = `W${D.week} · 2026`;
    if (!state.trendingData.length) {
      state.trendingData = D.submissions.slice(0, 6).map(asReal);
      const sec = $('#trending-section'); if (sec) sec.style.display = '';
      const grid = $('#trending-grid'); if (grid) grid.innerHTML = '';
      renderTrending(state.trendingData);
    }
    if (!document.querySelector('#winners-grid .winner-card')) {
      const sec = $('#winners-section'); if (sec) sec.style.display = '';
      renderWinners(state.trendingData.slice(0, 3).map((s, i) => ({ ...s, isWinner: true, rank: i + 1 })));
    }
  };
  /* Sample entries toggle votes locally; real ones still go through app.js. */
  const realVote = window.handleVote;
  window.handleVote = function (btn) {
    if (!String(btn.dataset.id).startsWith('demo-')) return realVote(btn);
    const id = btn.dataset.id, on = !btn.classList.contains('voted');
    document.querySelectorAll(`[data-id="${id}"].vote-btn`).forEach((b) => {
      b.classList.toggle('voted', on);
      const c = b.querySelector('.vote-count');
      if (c) c.textContent = (parseInt(c.textContent.replace(/,/g, ''), 10) + (on ? 1 : -1)).toLocaleString();
      b.querySelector('svg')?.setAttribute('fill', on ? 'currentColor' : 'none');
    });
    showToast(on ? '🔥 Voted! (sample entry)' : '↩️ Vote removed', on ? 'success' : 'info');
  };

  document.addEventListener('click', (ev) => {
    const bm = ev.target.closest('.bm');
    if (bm) bm.classList.toggle('on');
  });
})();
