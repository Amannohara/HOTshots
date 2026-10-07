/* HotShotz showcase layer: bento grid, dock, spotlight, tilt, marquee. Loads after home.js. */
(function () {
  const D = window.DEMO, $ = (s) => document.querySelector(s);
  const e = window.esc || ((s) => String(s));
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!D || !window.DEMO_MODE) return;

  /* Bento grid */
  const heat = Array.from({ length: 7 * 22 }, (_, i) => { const v = (i * 37 + (i >> 3) * 11) % 10; return v > 8 ? 4 : v > 6 ? 3 : v > 4 ? 2 : v > 2 ? 1 : 0; });
  const race = D.colleges.slice(0, 4), max = race[0].points, tu = D.spotlight.user;
  const bento = $('#demo-bento');
  if (bento) bento.innerHTML = `
    <div class="cell c-theme"><div class="rain" aria-hidden="true"></div><small>Week ${D.week} theme</small><h3>${e(D.theme)}</h3>
      <p class="hand">shoot it, write it, draw it</p><div class="cd">ends in <b id="cd">2d 06h 14m</b></div></div>
    <div class="cell c-votes"><small>Votes cast</small><div class="big" id="live-votes">${D.stats.votes.toLocaleString()}</div><span class="up">↑ 12% vs last week</span></div>
    <div class="cell c-top"><small>Creator of the week</small><span class="av lg" style="background:${tu.color}">${e(tu.initials)}</span><b>${e(tu.name)}</b><span class="dim">${D.spotlight.wins} wins</span></div>
    <div class="cell c-race"><small>College race</small>${race.map((c, i) => `<div class="bar"><span>${e(c.name.split(' ')[0])}</span><i style="--w:${Math.round(c.points / max * 100)}%;--d:${i * .12}s"></i><em>${c.points.toLocaleString()}</em></div>`).join('')}</div>
    <div class="cell c-heat"><small>Posts this term, by day</small><div class="heat">${heat.map((v) => `<i class="h${v}"></i>`).join('')}</div></div>`;

  /* Live vote counter + countdown */
  const lv = $('#live-votes'); let votes = D.stats.votes;
  if (lv) setInterval(() => { votes += 1 + Math.floor(Math.random() * 4); lv.textContent = votes.toLocaleString(); }, 2600);
  const end = Date.now() + (2 * 864e5 + 6 * 36e5 + 14 * 6e4), cd = $('#cd');
  if (cd) setInterval(() => { const s = Math.max(0, end - Date.now()) / 1000; cd.textContent = `${Math.floor(s / 86400)}d ${String(Math.floor(s % 86400 / 3600)).padStart(2, '0')}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m`; }, 15000);

  /* Rain inside the theme cell */
  const rain = $('.rain');
  if (rain && !calm) rain.innerHTML = Array.from({ length: 26 }, () => `<i style="left:${Math.random() * 100}%;animation-delay:${-Math.random() * 3}s;animation-duration:${.9 + Math.random() * 1.2}s"></i>`).join('');

  /* Category dock */
  const cats = [['📷', 'Photography'], ['✍️', 'Poetry'], ['📖', 'Stories'], ['✏️', 'Sketches'], ['🎨', 'Digital art'], ['😂', 'Memes'], ['🎵', 'Music'], ['🎬', 'Film'], ['🌀', 'Animation']];
  const dock = $('#demo-dock');
  if (dock) {
    dock.innerHTML = cats.map(([i, n]) => `<a href="#submissions" class="dk"><span>${i}</span><em>${n}</em></a>`).join('');
    const items = [...dock.children];
    if (!calm) {
      dock.addEventListener('pointermove', (ev) => items.forEach((it) => { const r = it.getBoundingClientRect(), d = Math.abs(ev.clientX - (r.left + r.width / 2)); it.style.setProperty('--s', Math.max(1, 1.55 - d / 120)); }));
      dock.addEventListener('pointerleave', () => items.forEach((it) => it.style.setProperty('--s', 1)));
    }
  }

  /* Testimonials as a two-way marquee */
  const U = D.users, more = [['Posted a bad sketch. Got 40 votes anyway. Best feeling.', U[21]], ['My hostel mates now check the leaderboard before dinner.', U[30]], ['Never thought my college would show up on a ranking.', U[17]], ...D.testimonials];
  const card = ([q, u], i) => `<figure class="q mq"><blockquote>${e(q)}</blockquote><figcaption><span class="av sm" style="background:${u.color}">${e(u.initials)}</span> ${e(u.name)}, ${e(u.college)}</figcaption></figure>`;
  const q = $('#demo-quotes');
  if (q) { const a = more.slice(0, 4).map(card).join(''), b = more.slice(3).map(card).join('');
    q.className = 'marq'; q.innerHTML = `<div class="mrow"><div>${a}${a}</div></div><div class="mrow rev"><div>${b}${b}</div></div>`; }

  if (calm) return;

  /* Cursor spotlight on cells and hero, magnetic CTA, 3D tilt on tiles */
  const hero = $('#hero');
  hero?.addEventListener('pointermove', (ev) => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--sx', ev.clientX - r.left + 'px'); hero.style.setProperty('--sy', ev.clientY - r.top + 'px'); });
  document.addEventListener('pointermove', (ev) => {
    const c = ev.target.closest?.('.cell, .lb'); if (c) { const r = c.getBoundingClientRect(); c.style.setProperty('--mx', ev.clientX - r.left + 'px'); c.style.setProperty('--my', ev.clientY - r.top + 'px'); }
    const t = ev.target.closest?.('.tile, .winner-card'); if (t && matchMedia('(hover:hover)').matches) { const r = t.getBoundingClientRect(); t.style.transform = `perspective(700px) rotateY(${((ev.clientX - r.left) / r.width - .5) * 7}deg) rotateX(${-((ev.clientY - r.top) / r.height - .5) * 7}deg) translateY(-3px)`; }
  });
  document.addEventListener('pointerout', (ev) => { const t = ev.target.closest?.('.tile, .winner-card'); if (t && !t.contains(ev.relatedTarget)) t.style.transform = ''; });
  const cta = $('#hero-submit-btn');
  cta?.addEventListener('pointermove', (ev) => { const r = cta.getBoundingClientRect(); cta.style.transform = `translate(${(ev.clientX - r.left - r.width / 2) * .12}px,${(ev.clientY - r.top - r.height / 2) * .2}px)`; });
  cta?.addEventListener('pointerleave', () => { cta.style.transform = ''; });
})();
