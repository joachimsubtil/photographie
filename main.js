// ==========================================================
// Portfolio photo — apparition des photos et visionneuse plein écran
// ==========================================================
document.documentElement.classList.add('js');

const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// Accueil : des photos apparaissent sur le passage de la souris puis s'effacent.
// Au doigt (pas de souris), elles apparaissent toutes seules, une après l'autre.
const intro = document.querySelector('.intro');
const layer = intro.querySelector('.trail');
const trail = JSON.parse(document.getElementById('trail-data').textContent);

// ordre au hasard à chaque visite
for (let i = trail.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [trail[i], trail[j]] = [trail[j], trail[i]];
}
const srcOf = ([slug]) => `img/trail/${slug}.jpg`;
// les premières photos se chargent tout de suite, les autres dès que la page est prête
trail.slice(0, 8).forEach((t) => { new Image().src = srcOf(t); });
window.addEventListener('load', () => trail.slice(8).forEach((t) => { new Image().src = srcOf(t); }));

let next = 0;
let depth = 1;

const drop = (x, y) => {
  const t = trail[next++ % trail.length];
  const [, w, h] = t;
  const box = intro.getBoundingClientRect();
  // taille selon l'écran : les photos en largeur un peu plus grandes que celles en hauteur
  const base = Math.min(box.width, 1600) * (mouse ? 0.15 : 0.5);
  const width = w >= h ? base * 1.25 : base * 0.85;
  const img = document.createElement('img');
  img.src = srcOf(t);
  img.alt = '';
  img.style.width = `${Math.round(width)}px`;
  img.style.left = `${x}px`;
  img.style.top = `${y}px`;
  img.style.zIndex = depth++;
  layer.append(img);
  img.getBoundingClientRect(); // le navigateur place d'abord la photo, puis l'apparition se joue
  img.classList.add('in');
  setTimeout(() => {
    img.classList.add('out');
    setTimeout(() => img.remove(), 500);
  }, mouse ? 1000 : 1500);
};

if (!calm) {
  let lastX = null;
  let lastY = null;
  let moved = false;
  if (mouse) {
    intro.addEventListener('mousemove', (e) => {
      moved = true;
      const box = intro.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      // une nouvelle photo tous les ~220 px parcourus
      if (lastX === null || Math.hypot(x - lastX, y - lastY) > 220) {
        drop(x, y);
        lastX = x;
        lastY = y;
      }
    });
  }

  // au doigt, ou tant que la souris n'a pas encore bougé : les photos défilent toutes seules
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(intro);
  const auto = () => {
    if (visible && !moved && !document.hidden) {
      const box = intro.getBoundingClientRect();
      drop(box.width * (0.15 + Math.random() * 0.7), box.height * (0.18 + Math.random() * 0.64));
    }
    if (!mouse || !moved) setTimeout(auto, mouse ? 1500 : 1700);
  };
  setTimeout(auto, mouse ? 1600 : 500);
}

// Le bandeau hors terrain arrive en fondu quand il entre à l'écran
const hors = document.querySelector('.hors');
if ('IntersectionObserver' in window) {
  const horsObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { hors.classList.add('is-in'); horsObserver.disconnect(); }
  }, { rootMargin: '0px 0px -10% 0px' });
  horsObserver.observe(hors);
} else {
  hors.classList.add('is-in');
}

// Le bandeau avance seul ; on peut aussi le faire glisser (souris, doigt, pavé tactile) ou utiliser les flèches
const horsWindow = hors.querySelector('.hors-window');
const horsTrack = hors.querySelector('.hors-track');
const horsHalf = horsTrack.firstElementChild;            // une suite complète de photos (la 2e est sa copie)
const stripCalm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let stripX = 0;          // position du bandeau, en px
let stripV = 0;          // vitesse actuelle, en px par seconde
let stripTarget = null;  // destination quand on clique sur une flèche
let stripLast = 0;
let drag = null;
let dragged = false;
const autoSpeed = () => {
  if (stripCalm || document.body.classList.contains('viewing')) return 0;   // arrêt pendant qu'une photo est ouverte
  const img = horsTrack.querySelector('img');
  return (img ? img.getBoundingClientRect().height : 200) * 0.29;
};
// boucle sans fin : quand une suite entière est passée, on revient au début sans que ça se voie
const wrapStrip = () => {
  const w = horsHalf.getBoundingClientRect().width;
  if (!w) return;
  const shift = Math.floor(stripX / w) * w;
  if (!shift) return;
  stripX -= shift;
  if (stripTarget !== null) stripTarget -= shift;
  if (drag) drag.startX -= shift;
};
const stepStrip = (t) => {
  const dt = Math.min(0.05, (t - (stripLast || t)) / 1000);
  stripLast = t;
  if (!drag) {
    if (stripTarget !== null) {
      const d = stripTarget - stripX;
      stripX += d * Math.min(1, dt * 7);
      if (Math.abs(d) < 0.5) { stripX = stripTarget; stripTarget = null; }
    } else {
      stripV += (autoSpeed() - stripV) * Math.min(1, dt * 2.5);   // l'élan d'un glisser retombe en douceur
      stripX += stripV * dt;
    }
  }
  wrapStrip();
  horsTrack.style.transform = `translate3d(${-stripX}px, 0, 0)`;
  requestAnimationFrame(stepStrip);
};
requestAnimationFrame(stepStrip);

horsWindow.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  drag = { id: e.pointerId, x: e.clientX, startX: stripX, lastX: e.clientX, lastT: e.timeStamp };
  dragged = false;
  stripTarget = null;
  stripV = 0;
});
window.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  if (!dragged && Math.abs(dx) > 6) {
    dragged = true;
    horsWindow.classList.add('is-dragging');
    try { horsWindow.setPointerCapture(e.pointerId); } catch (err) { /* rien */ }
  }
  if (!dragged) return;
  const v = -(e.clientX - drag.lastX) / Math.max(1, e.timeStamp - drag.lastT) * 1000;
  stripV = stripV * 0.3 + v * 0.7;
  drag.lastX = e.clientX;
  drag.lastT = e.timeStamp;
  stripX = drag.startX - dx;
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (e.timeStamp - drag.lastT > 100) stripV = 0;               // relâché sans mouvement : pas d'élan
  stripV = Math.max(-3000, Math.min(3000, stripV));
  drag = null;
  horsWindow.classList.remove('is-dragging');
};
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
// après un glisser, on n'ouvre pas la photo sous le doigt
horsWindow.addEventListener('click', (e) => {
  if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; }
}, true);
// glisser à deux doigts sur le pavé tactile (de gauche à droite)
horsWindow.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;          // défilement vertical : la page défile normalement
  e.preventDefault();
  stripTarget = null;
  stripV = 0;
  stripX += e.deltaX;
}, { passive: false });
// flèches : avance ou recule d'un peu plus d'une demi-largeur d'écran
const nudgeStrip = (dir) => {
  stripTarget = (stripTarget ?? stripX) + dir * horsWindow.clientWidth * 0.6;
  stripV = autoSpeed();
};
hors.querySelector('.hors-prev').addEventListener('click', () => nudgeStrip(-1));
hors.querySelector('.hors-next').addEventListener('click', () => nudgeStrip(1));
// au clavier : la photo qui reçoit le focus vient au centre
horsWindow.addEventListener('focusin', (e) => {
  horsWindow.scrollLeft = 0;
  const r = e.target.getBoundingClientRect();
  const w = horsWindow.getBoundingClientRect();
  if (r.left < w.left || r.right > w.right) stripTarget = stripX + (r.left - w.left) - (w.width - r.width) / 2;
});

// Les photos apparaissent en douceur quand elles arrivent à l'écran
const shots = [...document.querySelectorAll('.shot')];

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-in');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  shots.forEach((shot) => observer.observe(shot));
} else {
  shots.forEach((shot) => shot.classList.add('is-in'));
}

// Visionneuse : clic sur une photo → elle grandit depuis sa place jusqu'au plein écran,
// flèches / clavier / glisser pour passer à la suivante, et elle retourne à sa place à la fermeture
const viewer = document.querySelector('.viewer');
const big = viewer.querySelector('img');
const title = viewer.querySelector('.viewer-title');
const count = viewer.querySelector('.viewer-count');
const ease = 'cubic-bezier(.2, .8, .2, 1)';
let current = 0;
let opener = null;
let closing = false;

// deux séries de photos : celles des sports et celles du bandeau « Hors terrain ».
// La visionneuse fait défiler la série de la photo cliquée.
const onScreen = (r) => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 0;
const sportItems = shots.map((shot) => {
  const frame = shot.querySelector('.frame');
  return {
    frames: [frame], full: frame.dataset.full,
    caption: () => `${shot.closest('.sport').querySelector('h2').textContent} · ${shot.querySelector('figcaption').textContent}`,
  };
});
const horsButtons = [...document.querySelectorAll('.hors-item')];
const horsCount = Math.ceil(horsButtons.length / 2);
const horsItems = horsButtons.slice(0, horsCount).map((btn, i) => ({
  // la photo existe deux fois dans le bandeau (pour la boucle) : on garde les deux
  frames: [btn, horsButtons[i + horsCount]].filter(Boolean), full: btn.dataset.full,
  caption: () => `Hors terrain · ${btn.querySelector('img').alt}`,
}));
let list = sportItems;

// la petite photo d'où part (et où revient) la grande : celle qui est visible à l'écran
const frameOf = (i) => list[i].frames.find((f) => onScreen(f.getBoundingClientRect())) || list[i].frames[0];
const thumb = (i) => frameOf(i).querySelector('img');

// taille de la photo en grand : la plus grande possible dans l'écran, sans la déformer
const fit = () => {
  const img = thumb(current);
  const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : img.width / img.height;
  const cs = getComputedStyle(viewer);
  const boxW = viewer.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const boxH = viewer.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const w = Math.min(boxW, boxH * ratio);
  big.style.width = `${Math.round(w)}px`;
  big.style.height = `${Math.round(w / ratio)}px`;
};

const show = (index, dir = 0) => {
  current = (index + list.length) % list.length;
  const item = list[current];
  const img = thumb(current);
  const full = item.full;
  // d'abord la version déjà chargée sur la page (instantané), puis la grande dès qu'elle est prête
  big.src = img.currentSrc || img.src;
  big.alt = img.alt;
  fit();
  const hd = new Image();
  hd.src = full;
  hd.decode().then(() => { if (list[current] === item) big.src = full; }).catch(() => {});
  title.textContent = item.caption();
  count.textContent = `${current + 1} / ${list.length}`;
  if (dir && !calm) {
    big.animate([{ opacity: 0, transform: `translateX(${dir * 60}px) scale(.97)` }, { opacity: 1, transform: 'none' }],
      { duration: 450, easing: ease });
  }
  // la photo suivante se charge à l'avance pour un passage instantané
  new Image().src = list[(current + 1) % list.length].full;
};

// décalage + échelle pour poser la grande photo exactement sur la petite
const fromThumb = () => {
  const a = thumb(current).getBoundingClientRect();
  const b = big.getBoundingClientRect();
  return `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width})`;
};

const open = (index, from = sportItems) => {
  list = from;
  opener = document.activeElement;
  document.body.classList.add('viewing');
  closing = false;
  big.style.translate = '';
  viewer.hidden = false;
  document.body.style.overflow = 'hidden';
  show(index);
  viewer.querySelector('.viewer-close').focus({ preventScroll: true });
  void viewer.offsetWidth;            // force le navigateur à poser l'état de départ avant le fondu
  viewer.classList.add('is-open');
  if (calm) return;
  const frame = frameOf(current);
  if (!onScreen(thumb(current).getBoundingClientRect())) {
    big.animate([{ opacity: 0, transform: 'scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: ease });
    return;
  }
  frame.style.visibility = 'hidden';   // la petite « décolle » de la page
  big.animate([{ transform: fromThumb() }, { transform: 'none' }], { duration: 650, easing: ease })
    .finished.then(() => { frame.style.visibility = ''; }).catch(() => { frame.style.visibility = ''; });
  setTimeout(() => { frame.style.visibility = ''; }, 900);
};

const finishClose = () => {
  viewer.hidden = true;
  viewer.classList.remove('is-open');
  document.body.style.overflow = '';
  document.body.classList.remove('viewing');
  big.removeAttribute('src');
  big.style.translate = '';
  closing = false;
  if (opener) opener.focus({ preventScroll: true });
};

const close = () => {
  if (closing || viewer.hidden) return;
  closing = true;
  viewer.classList.remove('is-open');
  if (calm) return finishClose();
  const frame = frameOf(current);
  const back = onScreen(thumb(current).getBoundingClientRect());
  const anim = back
    ? big.animate([{ transform: 'none' }, { transform: fromThumb() }], { duration: 500, easing: ease, fill: 'forwards' })
    : big.animate([{ opacity: 1 }, { opacity: 0, transform: 'scale(.92)' }], { duration: 300, easing: 'ease', fill: 'forwards' });
  if (back) frame.style.visibility = 'hidden';
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    frame.style.visibility = '';
    anim.cancel();
    finishClose();
  };
  anim.finished.then(end).catch(end);
  setTimeout(end, 800);   // sécurité : la visionneuse se ferme même si l'animation est interrompue
};

shots.forEach((shot, index) => shot.querySelector('.frame').addEventListener('click', () => open(index)));
horsButtons.forEach((btn, index) => btn.addEventListener('click', () => open(index % horsCount, horsItems)));
viewer.querySelector('.viewer-prev').addEventListener('click', () => show(current - 1, -1));
viewer.querySelector('.viewer-next').addEventListener('click', () => show(current + 1, 1));
viewer.querySelector('.viewer-close').addEventListener('click', close);
// un clic à côté de la photo referme
viewer.addEventListener('click', (e) => { if (e.target === viewer) close(); });
addEventListener('resize', () => { if (!viewer.hidden) fit(); });

// photo ouverte : elle suit légèrement la souris (ordinateur seulement)
if (!calm && window.matchMedia('(pointer: fine)').matches) {
  viewer.addEventListener('mousemove', (e) => {
    if (closing) return;
    const x = e.clientX / innerWidth - 0.5;
    const y = e.clientY / innerHeight - 0.5;
    big.style.translate = `${(x * 28).toFixed(1)}px ${(y * 20).toFixed(1)}px`;
  });
  viewer.addEventListener('mouseleave', () => { big.style.translate = ''; });
}

document.addEventListener('keydown', (e) => {
  if (viewer.hidden) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') show(current - 1, -1);
  if (e.key === 'ArrowRight') show(current + 1, 1);
});

// téléphone : glisser à gauche ou à droite
let startX = null;
viewer.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
viewer.addEventListener('touchend', (e) => {
  if (startX === null) return;
  const dx = e.changedTouches[0].clientX - startX;
  if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  startX = null;
});

// ==========================================================
// Animations reprises du portfolio global
// ==========================================================

// Fine barre de défilement en haut de l'écran
const scrub = document.createElement('div');
scrub.className = 'scrub';
scrub.setAttribute('aria-hidden', 'true');
scrub.innerHTML = '<span></span>';
document.body.append(scrub);
const updateScrub = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrub.style.setProperty('--p', max > 0 ? Math.min(window.scrollY / max, 1) : 0);
};
window.addEventListener('scroll', updateScrub, { passive: true });
window.addEventListener('resize', updateScrub);
updateScrub();

// Une fois dévoilée, la photo n'attend plus son petit retard d'apparition
shots.forEach((shot) => shot.addEventListener('transitionend', (e) => {
  if (e.target === shot && e.propertyName === 'opacity') shot.classList.add('done');
}));

if (!calm) {
  // Titres lettre par lettre : le nom au chargement, le nom de chaque sport quand il arrive à l'écran
  const split = (el) => {
    el.setAttribute('aria-label', el.textContent.trim());
    let i = 0;
    const words = el.textContent.trim().split(/\s+/).map((word) => {
      const w = document.createElement('span');
      w.className = 'word';
      w.setAttribute('aria-hidden', 'true');
      [...word].forEach((char) => {
        const letter = document.createElement('span');
        letter.className = 'letter';
        letter.style.setProperty('--i', i++);
        letter.textContent = char;
        w.append(letter);
      });
      return w;
    });
    el.textContent = '';
    words.forEach((w, n) => { if (n) el.append(' '); el.append(w); });
    el.classList.add('split');
  };
  const name = intro.querySelector('h1');
  split(name);
  setTimeout(() => name.classList.add('is-on'), 150);

  const titles = document.querySelectorAll('.sport h2, .hors h2');
  titles.forEach(split);
  const titleObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-on');
      titleObserver.unobserve(entry.target);
    });
  }, { threshold: 0.4 });
  titles.forEach((t) => titleObserver.observe(t));

  // Chiffres qui défilent : « +10 », « 4 », « 82K » partent de 0
  document.querySelectorAll('.figures b').forEach((el) => {
    const match = el.textContent.trim().match(/^([^\d]*)(\d+)(.*)$/);
    if (!match) return;
    const [, before, digits, after] = match;
    const target = Number(digits);
    new IntersectionObserver(([entry], obs) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const t0 = performance.now();
      const frame = (now) => {
        const t = Math.min((now - t0) / 1400, 1);
        el.textContent = before + Math.round(target * (1 - Math.pow(1 - t, 3))) + after;
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    }, { threshold: 0.6 }).observe(el);
  });
}

// Ordinateur seulement : curseur viseur et photos qui s'inclinent vers la souris
if (mouse) {
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span class="cursor-frame"></span><span class="cursor-dot"></span><span class="cursor-label"></span>';
  document.body.append(cursor);
  document.documentElement.classList.add('has-cursor');
  const frameEl = cursor.querySelector('.cursor-frame');
  const dot = cursor.querySelector('.cursor-dot');
  const label = cursor.querySelector('.cursor-label');
  document.querySelectorAll('.frame').forEach((el) => { el.dataset.cursor = 'Voir'; });

  let x = -100, y = -100, cx = -100, cy = -100;
  window.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    cursor.classList.add('is-on');
    const target = e.target.closest('[data-cursor]');
    const text = target ? target.dataset.cursor : '';
    if (label.textContent !== text) label.textContent = text;
    cursor.classList.toggle('has-label', !!text);
    cursor.classList.toggle('is-link', !text && !!e.target.closest('a, button'));
  }, { passive: true });
  document.addEventListener('mouseleave', () => cursor.classList.remove('is-on'));
  window.addEventListener('mousedown', () => cursor.classList.add('is-pressed'));
  window.addEventListener('mouseup', () => cursor.classList.remove('is-pressed'));

  const follow = () => {
    const ease = calm ? 1 : 0.28; // le cadre suit le point avec un léger retard
    cx += (x - cx) * ease;
    cy += (y - cy) * ease;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    frameEl.style.transform = `translate(${cx}px, ${cy}px)`;
    label.style.transform = `translate(${cx}px, ${cy}px)`;
    requestAnimationFrame(follow);
  };
  follow();

  if (!calm) {
    document.querySelectorAll('.shot .frame').forEach((frame) => {
      const angle = frame.closest('.main, .feature') ? 5 : 8; // les grandes photos s'inclinent un peu moins
      frame.classList.add('tilt');
      frame.addEventListener('mousemove', (e) => {
        const box = frame.getBoundingClientRect();
        const px = (e.clientX - box.left) / box.width - 0.5;
        const py = (e.clientY - box.top) / box.height - 0.5;
        frame.style.setProperty('--ry', `${px * angle}deg`);
        frame.style.setProperty('--rx', `${py * -angle}deg`);
        frame.classList.add('is-tilting');
      });
      frame.addEventListener('mouseleave', () => {
        frame.classList.remove('is-tilting');
        frame.style.setProperty('--rx', '0deg');
        frame.style.setProperty('--ry', '0deg');
      });
    });
  }
}
