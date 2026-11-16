/** Framework-independent motion adapter; no redesign, dependencies or content rewriting.
 * Call AFTER the imported Figma layout mounts. React: return controller.destroy from useEffect.
 * Add data-np-tab to existing navigation items. Existing click handlers and hrefs stay in charge.
 */
export function installNeuroportMotion({ hero, track, activeIndex = 0, onSelect = () => {} } = {}) {
  if (!hero || !track) throw new Error('Pass existing hero and navigation track elements.');
  const tabs = [...track.querySelectorAll('[data-np-tab]')];
  if (!tabs.length) throw new Error('Mark existing navigation items with data-np-tab.');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const removers = [], saved = tabs.map(t => ({ current: t.getAttribute('aria-current'), selected: t.getAttribute('aria-selected') }));
  const hadHeroClass = hero.classList.contains('np-motion-hero'), hadTrackClass = track.classList.contains('np-motion-track');
  hero.classList.add('np-motion-hero'); track.classList.add('np-motion-track');
  const lightStage = document.createElement('div'), light = document.createElement('div');
  lightStage.className = 'np-motion-light-stage'; light.className = 'np-motion-light';
  lightStage.setAttribute('aria-hidden', 'true'); lightStage.append(light); hero.append(lightStage);
  const blob = document.createElement('div'), labels = document.createElement('div');
  blob.className = 'np-motion-blob'; labels.className = 'np-motion-labels';
  blob.setAttribute('aria-hidden', 'true'); labels.setAttribute('aria-hidden', 'true');
  track.append(blob, labels);
  const copies = tabs.map(tab => { const span = document.createElement('span'); span.className = 'np-motion-label'; span.textContent = tab.textContent; labels.append(span); return span; });
  let boxes = [], active = Math.max(0, Math.min(tabs.length - 1, activeIndex)), alive = true;
  let raf = 0, previous = 0, sweep = null, lastSweep = -Infinity, drag = null, suppressClick = false;
  let suppressTimer = 0;
  const state = { x: 0, w: 0, tx: 0, tw: 0, vx: 0, vw: 0, squash: 0, vs: 0 };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  function listen(el, type, fn, options) { el.addEventListener(type, fn, options); removers.push(() => el.removeEventListener(type, fn, options)); }
  function render() {
    const box = boxes[active]; if (!box) return;
    const stretch = clamp(Math.min(Math.abs(state.vx) / Math.max(Math.abs(state.tx-state.x),80) * .012,.06) + state.squash, -.08, .12);
    const sx = 1 + stretch, sy = 1 / Math.sqrt(sx), skew = clamp(-state.vx / Math.max(Math.abs(state.tx-state.x),80) * .18,-2.5,2.5);
    blob.style.width = `${state.w}px`; blob.style.height = `${box.h}px`; blob.style.top = `${box.y}px`;
    blob.style.transform = `translate3d(${state.x}px,0,0) scale(${sx},${sy}) skewX(${skew}deg)`;
    const left = state.x + (state.w - state.w * sx) / 2, top = box.y + (box.h - box.h * sy) / 2;
    const width = Math.max(track.scrollWidth, track.clientWidth), height = track.clientHeight;
    labels.style.clipPath = `inset(${Math.max(0, top)}px ${Math.max(0, width - left - state.w * sx)}px ${Math.max(0, height - top - box.h * sy)}px ${Math.max(0, left)}px round 999px)`;
  }
  function stopAndSnap() {
    cancelAnimationFrame(raf); raf = 0;
    state.x = state.tx; state.w = state.tw; state.vx = state.vw = state.squash = state.vs = 0; render();
  }
  function tick(now) {
    const dt = Math.min((now - previous) / 1000, .032); previous = now;
    const k = drag?.moved ? 420 : 215, damping = drag?.moved ? 26 : 22;
    state.vx += ((state.tx - state.x) * k - state.vx * damping) * dt; state.x += state.vx * dt;
    state.vw += ((state.tw - state.w) * k * 1.05 - state.vw * damping * 1.05) * dt; state.w += state.vw * dt;
    state.vs += (-state.squash * 260 - state.vs * 15) * dt; state.squash += state.vs * dt; render();
    const settled = Math.abs(state.tx - state.x) < .08 && Math.abs(state.vx) < .25 && Math.abs(state.tw - state.w) < .08 && Math.abs(state.vw) < .25 && Math.abs(state.squash) < .001 && Math.abs(state.vs) < .01;
    if (settled) { stopAndSnap(); return; }
    raf = requestAnimationFrame(tick);
  }
  function run() { if (reduced.matches) { stopAndSnap(); return; } if (!raf) { previous = performance.now(); raf = requestAnimationFrame(tick); } }
  function measure() {
    if (!alive) return;
    const base = track.getBoundingClientRect(), scale = base.width / track.offsetWidth;
    boxes = tabs.map((tab, i) => {
      const r = tab.getBoundingClientRect(), s = getComputedStyle(tab);
      const b = { x: (r.left - base.left) / scale + track.scrollLeft - track.clientLeft, y: (r.top - base.top) / scale - track.clientTop, w: r.width / scale, h: r.height / scale };
      Object.assign(copies[i].style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, font: s.font, letterSpacing: s.letterSpacing, textTransform: s.textTransform });
      return b;
    });
    labels.style.width = `${Math.max(track.scrollWidth, track.clientWidth)}px`; labels.style.height = `${track.clientHeight}px`;
    state.tx = boxes[active].x; state.tw = boxes[active].w; stopAndSnap();
  }
  function select(index, { immediate = false, source = 'external', notify = false } = {}) {
    if (!alive || !boxes[index]) return;
    const same = index === active, delta = boxes[index].x - state.x; active = index;
    tabs.forEach((t, i) => {
      if (t.getAttribute('role') === 'tab') t.setAttribute('aria-selected', String(i === index));
      else if (i === index) t.setAttribute('aria-current', 'location'); else t.removeAttribute('aria-current');
    });
    state.tx = boxes[index].x; state.tw = boxes[index].w;
    if (immediate || reduced.matches) stopAndSnap();
    else {
      const norm = 1;
      state.vx = 0; state.vw = 0; state.squash = 0; state.vs = .65; run();
    }
    if (notify) onSelect({ index, element: tabs[index], source });
  }
  function sweepHero(force = false) {
    const now = performance.now();
    if (!alive || reduced.matches || (!force && now - lastSweep < 1400)) return;
    lastSweep = now; sweep?.cancel();
    sweep = light.animate([
      { transform: 'translateX(-130%) skewX(-34deg)', opacity: 0, offset: 0 },
      { opacity: 1, offset: .18 }, { opacity: .92, offset: .78 },
      { transform: 'translateX(265%) skewX(-34deg)', opacity: 0, offset: 1 }
    ], { duration: 1300, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  function nearest(x) { return boxes.reduce((best, b, i) => Math.abs(b.x + b.w / 2 - x) < Math.abs(boxes[best].x + boxes[best].w / 2 - x) ? i : best, 0); }
  const localX = e => { const r=track.getBoundingClientRect();return (e.clientX-r.left)/(r.width/track.offsetWidth)+track.scrollLeft-track.clientLeft; };
  listen(hero, 'pointerenter', e => { if (e.pointerType === 'mouse') sweepHero(); });
  listen(track, 'pointerdown', e => {
    if (e.button !== 0 || !e.target.closest('[data-np-tab]')) return;
    drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, moved: false, grab: localX(e) >= state.x && localX(e) <= state.x + state.w ? localX(e) - state.x : state.w / 2 };
  });
  listen(window, 'pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (!drag.moved && Math.abs(dy) > 6 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    if (!drag.moved && Math.abs(dx) <= 6) return;
    drag.moved = true; if (e.cancelable) e.preventDefault();
    const x = clamp(localX(e) - drag.grab, boxes[0].x, boxes.at(-1).x + boxes.at(-1).w - state.w);
    state.tx = x; state.tw = boxes[nearest(x + state.w / 2)].w; run();
  }, { passive: false });
  function finish(e, cancelled = false) {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = drag.moved; drag = null;
    if (moved) {
      suppressClick = true; clearTimeout(suppressTimer); suppressTimer = setTimeout(() => { suppressClick = false; }, 400);
      select(cancelled ? active : nearest(state.tx + state.tw / 2), { source: 'drag', notify: !cancelled });
    }
  }
  listen(window, 'pointerup', e => finish(e)); listen(window, 'pointercancel', e => finish(e, true));
  listen(track, 'click', e => {
    const index = tabs.indexOf(e.target.closest('[data-np-tab]')); if (index < 0) return;
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopImmediatePropagation(); return; }
    select(index, { immediate: e.detail === 0, source: e.detail === 0 ? 'keyboard' : 'click', notify: true });
  }, true);
  // Native link/button keyboard semantics stay intact; do not invent tab panels.
  listen(reduced, 'change', () => { sweep?.cancel(); stopAndSnap(); });
  const observer = new ResizeObserver(measure); observer.observe(track); tabs.forEach(t => observer.observe(t));
  measure(); select(active, { immediate: true });
  document.fonts?.ready.then(() => { if (alive) measure(); });
  const startFrame = requestAnimationFrame(() => sweepHero(true));
  return {
    select,
    destroy() {
      alive = false; cancelAnimationFrame(raf); cancelAnimationFrame(startFrame); clearTimeout(suppressTimer); sweep?.cancel(); observer.disconnect(); removers.forEach(fn => fn());
      lightStage.remove(); blob.remove(); labels.remove();
      if (!hadHeroClass) hero.classList.remove('np-motion-hero'); if (!hadTrackClass) track.classList.remove('np-motion-track');
      tabs.forEach((t, i) => { for (const [attr, value] of [['aria-current', saved[i].current], ['aria-selected', saved[i].selected]]) { if (value === null) t.removeAttribute(attr); else t.setAttribute(attr, value); } });
    }
  };
}
