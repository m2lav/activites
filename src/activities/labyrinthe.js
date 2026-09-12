/* =========================================================================
   Labyrinthe — récréation, tous les âges.

   Le labyrinthe est généré à chaque fois (parcours en profondeur), jamais
   dessiné à la main : c'est ce qui permet de couvrir du 5×5 pour Térence au
   17×17 pour Gaspard avec le même code.

   Aux deux premiers niveaux, on ne garde que le chemin solution : plus aucune
   impasse, un seul couloir qui serpente. C'est ce que demande le brief pour
   les plus jeunes — se perdre à 4 ans n'apprend rien.

   On avance au doigt, en glissant. Le trait ne recule jamais tout seul et il
   n'y a pas d'échec possible : au pire on revient sur ses pas.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

export const meta = {
  id: 'labyrinthe',
  nom: 'Le labyrinthe',
  type: 'labyrinthe',
  categorie: 'detente',
  ages: [3, 12],
  duree: 70
};

// Calé sur le brief : niveau 2 → 5×5, niveau 5 → 9×9, niveau 9 → 15×15.
const TAILLES = [5, 5, 7, 7, 9, 9, 11, 13, 15, 17];

const DIRECTIONS = [
  [0, -1, 'n', 's'],
  [1, 0, 'e', 'o'],
  [0, 1, 's', 'n'],
  [-1, 0, 'o', 'e']
];

export function apercu(niveau) {
  const t = TAILLES[Math.min(10, Math.max(1, Math.round(niveau))) - 1];
  return `${t} × ${t}${niveau <= 2 ? ' — un seul chemin' : ''}`;
}

/* ---- Génération -------------------------------------------------------- */

function creuser(taille) {
  const grille = Array.from({ length: taille }, () =>
    Array.from({ length: taille }, () => ({ n: true, e: true, s: true, o: true, vu: false })));

  const pile = [[0, 0]];
  grille[0][0].vu = true;

  while (pile.length) {
    const [x, y] = pile[pile.length - 1];
    const libres = DIRECTIONS
      .map(([dx, dy, a, b]) => [x + dx, y + dy, a, b])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < taille && ny < taille && !grille[ny][nx].vu);

    if (!libres.length) { pile.pop(); continue; }

    const [nx, ny, a, b] = libres[Math.floor(Math.random() * libres.length)];
    grille[y][x][a] = false;
    grille[ny][nx][b] = false;
    grille[ny][nx].vu = true;
    pile.push([nx, ny]);
  }
  return grille;
}

/** Chemin de l'entrée à la sortie, par parcours en profondeur. */
function resoudre(grille, taille) {
  const cible = `${taille - 1},${taille - 1}`;
  const pile = [[0, 0]];
  const vus = new Set(['0,0']);
  const parent = new Map();

  while (pile.length) {
    const [x, y] = pile.pop();
    if (`${x},${y}` === cible) break;
    for (const [dx, dy, a] of DIRECTIONS) {
      const nx = x + dx, ny = y + dy;
      const cle = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= taille || ny >= taille) continue;
      if (grille[y][x][a] || vus.has(cle)) continue;
      vus.add(cle);
      parent.set(cle, `${x},${y}`);
      pile.push([nx, ny]);
    }
  }

  const chemin = [];
  let cle = cible;
  while (cle) { chemin.unshift(cle); cle = parent.get(cle); }
  return chemin;
}

/** Ne garde que le couloir solution : plus aucune impasse. */
function simplifier(grille, taille, chemin) {
  const surChemin = new Set(chemin);
  for (let y = 0; y < taille; y++) {
    for (let x = 0; x < taille; x++) {
      if (!surChemin.has(`${x},${y}`)) {
        Object.assign(grille[y][x], { n: true, e: true, s: true, o: true });
      }
    }
  }
  // On rouvre uniquement les passages entre cases consécutives du chemin.
  for (let i = 0; i < chemin.length - 1; i++) {
    const [x, y] = chemin[i].split(',').map(Number);
    const [nx, ny] = chemin[i + 1].split(',').map(Number);
    const dir = DIRECTIONS.find(([dx, dy]) => x + dx === nx && y + dy === ny);
    if (!dir) continue;
    grille[y][x][dir[2]] = false;
    grille[ny][nx][dir[3]] = false;
  }
  return grille;
}

export function generer(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  const taille = TAILLES[n - 1];
  let grille = creuser(taille);
  const chemin = resoudre(grille, taille);
  if (n <= 2) grille = simplifier(grille, taille, chemin);
  return { niveau: n, taille, grille, longueur: chemin.length };
}

/* ---- Montage ----------------------------------------------------------- */

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let reussites = 0;
  let fini = false;
  let courant = exercice;
  let x = 0, y = 0;
  let cellules = [];

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const grilleEl = el('div', {
    style: {
      display: 'grid', gap: '0', margin: 'auto',
      background: 'color-mix(in srgb, var(--u-carte) 55%, transparent)',
      borderRadius: '10px', padding: '6px',
      touchAction: 'none'          // le glissement pilote le pion, pas la page
    }
  });

  const compteur = el('div', {
    style: {
      textAlign: 'center', fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: 'clamp(20px, 3vw, 30px)', color: 'var(--u-secondaire)', minHeight: '1.2em'
    }
  }, '');

  conteneur.append(compteur, el('div', {
    style: { flex: '1', minHeight: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }, grilleEl));

  function dessiner() {
    const t = courant.taille;
    // Le labyrinthe doit tenir en entier : on calcule la case d'après la
    // place disponible, jamais l'inverse.
    const dispo = Math.min(
      conteneur.clientHeight - 70 || 320,
      conteneur.clientWidth - 20 || 320
    );
    const cote = Math.max(20, Math.floor((dispo - 12) / t));

    grilleEl.style.gridTemplateColumns = `repeat(${t}, ${cote}px)`;
    grilleEl.replaceChildren();
    cellules = [];

    for (let j = 0; j < t; j++) {
      for (let i = 0; i < t; i++) {
        const c = courant.grille[j][i];
        const mur = '3px solid var(--u-texte)';
        const rien = '3px solid transparent';
        const arrivee = i === t - 1 && j === t - 1;

        const cel = el('div', {
          style: {
            width: `${cote}px`, height: `${cote}px`,
            borderTop: c.n ? mur : rien,
            borderRight: c.e ? mur : rien,
            borderBottom: c.s ? mur : rien,
            borderLeft: c.o ? mur : rien,
            display: 'grid', placeItems: 'center',
            fontSize: `${Math.round(cote * 0.6)}px`, lineHeight: '1',
            boxSizing: 'border-box'
          }
        }, arrivee ? '🏁' : null);

        cellules.push(cel);
        grilleEl.appendChild(cel);
      }
    }
    placerPion();
  }

  const pion = el('div', {
    style: {
      position: 'absolute', borderRadius: '50%',
      background: 'var(--u-secondaire)',
      boxShadow: '0 0 14px var(--u-secondaire)',
      pointerEvents: 'none', transition: 'transform .11s linear', zIndex: '2'
    }
  });
  grilleEl.style.position = 'relative';
  grilleEl.appendChild(pion);

  function placerPion() {
    const cel = cellules[y * courant.taille + x];
    if (!cel) return;
    const r = cel.getBoundingClientRect();
    const g = grilleEl.getBoundingClientRect();
    const d = Math.max(10, r.width * 0.5);
    Object.assign(pion.style, {
      width: `${d}px`, height: `${d}px`,
      left: '0', top: '0',
      transform: `translate(${r.left - g.left + (r.width - d) / 2}px, ${r.top - g.top + (r.height - d) / 2}px)`
    });
    if (!pion.isConnected) grilleEl.appendChild(pion);
  }

  function marquer(i, j) {
    const cel = cellules[j * courant.taille + i];
    if (cel) cel.style.background = 'color-mix(in srgb, var(--u-secondaire) 22%, transparent)';
  }

  /* -- Déplacement -- */

  function deplacer(nx, ny) {
    if (fini) return;
    const t = courant.taille;
    if (nx < 0 || ny < 0 || nx >= t || ny >= t) return;

    const dir = DIRECTIONS.find(([dx, dy]) => x + dx === nx && y + dy === ny);
    if (!dir) return;                          // pas une case voisine
    if (courant.grille[y][x][dir[2]]) return;  // un mur : on ne force pas

    marquer(x, y);
    x = nx; y = ny;
    placerPion();
    audio.son('tic');

    if (x === t - 1 && y === t - 1) gagne();
  }

  function caseSous(clientX, clientY) {
    const g = grilleEl.getBoundingClientRect();
    const cote = (g.width - 12) / courant.taille;
    return [
      Math.floor((clientX - g.left - 6) / cote),
      Math.floor((clientY - g.top - 6) / cote)
    ];
  }

  let glisse = false;
  const surDebut = (e) => { glisse = true; const [i, j] = caseSous(e.clientX, e.clientY); deplacer(i, j); };
  const surGlisse = (e) => { if (!glisse) return; const [i, j] = caseSous(e.clientX, e.clientY); deplacer(i, j); };
  const surFin = () => { glisse = false; };

  grilleEl.addEventListener('pointerdown', surDebut);
  grilleEl.addEventListener('pointermove', surGlisse);
  grilleEl.addEventListener('pointerup', surFin);
  grilleEl.addEventListener('pointercancel', surFin);

  function gagne() {
    reussites++;
    compteur.textContent = `${reussites} ✓`;
    audio.son('recompense');
    anim.recompense(pion);
    attendre(() => {
      if (fini) return;
      courant = generer(niveauCourant());   // niveau relu : la roue agit ici
      x = 0; y = 0;
      dessiner();
      anim.apparition(grilleEl);
    }, 900);
  }

  /* -- Durée -- */

  // La durée est fixée par la séance, pas par l'activité (mode test = raccourci).
  const DUREE = ctx.duree ?? meta.duree * 1000;
  const debut = Date.now();
  const battement = setInterval(() => {
    if (fini) return;
    if (Date.now() - debut >= DUREE) terminer();
  }, 500);

  function terminer() {
    if (fini) return;
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    ctx.surFin({ reussites, erreurs: 0 });   // se perdre n'est pas une faute
  }

  // Premier dessin immédiat, avec les dimensions de repli : requestAnimationFrame
  // ne se déclenche pas si la page n'est pas visible, et le labyrinthe resterait
  // invisible. Le second passage mesure réellement le conteneur.
  dessiner();
  requestAnimationFrame(() => {
    if (fini) return;
    dessiner();
    anim.apparition(grilleEl);
  });

  const surRedimension = () => { if (!fini) dessiner(); };
  window.addEventListener('resize', surRedimension);

  return function demonter() {
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    window.removeEventListener('resize', surRedimension);
  };
}
