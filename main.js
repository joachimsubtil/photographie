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

// Visionneuse : clic sur une photo → plein écran, flèches / clavier / glisser pour passer à la suivante
const viewer = document.querySelector('.viewer');
const big = viewer.querySelector('img');
const title = viewer.querySelector('.viewer-title');
const count = viewer.querySelector('.viewer-count');
let current = 0;
let opener = null;

const show = (index) => {
  current = (index + shots.length) % shots.length;
  const shot = shots[current];
  const img = shot.querySelector('img');
  big.src = shot.querySelector('.frame').dataset.full;
  big.alt = img.alt;
  title.textContent = `${shot.closest('.sport').querySelector('h2').textContent} · ${shot.querySelector('figcaption').textContent}`;
  count.textContent = `${current + 1} / ${shots.length}`;
  // la photo suivante se charge à l'avance pour un passage instantané
  new Image().src = shots[(current + 1) % shots.length].querySelector('.frame').dataset.full;
};

const open = (index) => {
  opener = document.activeElement;
  show(index);
  viewer.hidden = false;
  document.body.style.overflow = 'hidden';
  viewer.querySelector('.viewer-close').focus();
};

const close = () => {
  viewer.hidden = true;
  document.body.style.overflow = '';
  big.src = '';
  if (opener) opener.focus();
};

shots.forEach((shot, index) => shot.querySelector('.frame').addEventListener('click', () => open(index)));
viewer.querySelector('.viewer-prev').addEventListener('click', () => show(current - 1));
viewer.querySelector('.viewer-next').addEventListener('click', () => show(current + 1));
viewer.querySelector('.viewer-close').addEventListener('click', close);
// un clic à côté de la photo referme
viewer.addEventListener('click', (e) => { if (e.target === viewer) close(); });

document.addEventListener('keydown', (e) => {
  if (viewer.hidden) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') show(current - 1);
  if (e.key === 'ArrowRight') show(current + 1);
});

// téléphone : glisser à gauche ou à droite
let startX = null;
viewer.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
viewer.addEventListener('touchend', (e) => {
  if (startX === null) return;
  const dx = e.changedTouches[0].clientX - startX;
  if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
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
  if (e.propertyName === 'clip-path') shot.classList.add('done');
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

  const titles = document.querySelectorAll('.sport h2');
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
      const angle = frame.closest('.main') ? 5 : 8; // les grandes photos s'inclinent un peu moins
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
