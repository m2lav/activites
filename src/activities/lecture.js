/* =========================================================================
   Lecture — pour Olympe.

   Trois paliers, du plus concret au plus abstrait :
   - niveaux 1-3 : une image, trois mots, retrouver le bon
   - niveaux 4-6 : reconstituer le mot avec l'image en appui
   - niveaux 7-10 : reconstituer sans image, sur des mots plus longs

   Les mots sont en capitales sans accent : c'est ce que l'école présente en
   premier, et ça évite à un lecteur débutant de buter sur la graphie avant
   de buter sur le son.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

export const meta = {
  id: 'lecture',
  nom: 'Les mots',
  type: 'lecture',
  categorie: 'effort',
  ages: [5, 10],
  duree: 85
};

const MOTS = [
  { m: 'CLE', i: '🔑' }, { m: 'FEU', i: '🔥' }, { m: 'ROI', i: '👑' },
  { m: 'CHAT', i: '🐱' }, { m: 'LUNE', i: '🌙' }, { m: 'VELO', i: '🚲' },
  { m: 'OURS', i: '🐻' }, { m: 'NUIT', i: '🌛' },
  { m: 'POMME', i: '🍎' }, { m: 'FLEUR', i: '🌸' }, { m: 'CHIEN', i: '🐶' },
  { m: 'ARBRE', i: '🌳' }, { m: 'TRAIN', i: '🚂' }, { m: 'LIVRE', i: '📖' },
  { m: 'NUAGE', i: '☁️' },
  { m: 'BATEAU', i: '⛵' }, { m: 'MAISON', i: '🏠' }, { m: 'SOLEIL', i: '☀️' },
  { m: 'GATEAU', i: '🍰' }, { m: 'ETOILE', i: '⭐' },
  { m: 'POISSON', i: '🐟' }, { m: 'CHATEAU', i: '🏰' }, { m: 'MONTAGNE', i: '⛰️' }
];

const piocher = (l) => l[Math.floor(Math.random() * l.length)];

/** Longueur maximale des mots proposés à ce niveau. */
function plafond(niveau) {
  return [4, 4, 5, 5, 5, 6, 6, 7, 8, 8][Math.min(10, Math.max(1, Math.round(niveau))) - 1];
}

function corpus(niveau) {
  const max = plafond(niveau);
  const l = MOTS.filter((x) => x.m.length <= max);
  return l.length ? l : MOTS;
}

export function apercu(niveau) {
  const n = Math.min(10, Math.max(1, Math.round(niveau)));
  if (n <= 3) return 'image → mot à reconnaître';
  if (n <= 6) return 'mot à reconstituer, avec l’image';
  return 'mot à reconstituer, sans l’image';
}

export function generer(niveau) {
  return { niveau: Math.min(10, Math.max(1, Math.round(niveau))) };
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);
  const DUREE = ctx.duree ?? meta.duree * 1000;

  let reussites = 0;
  let erreurs = 0;
  let fini = false;
  let essais = 0;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const image = el('div', {
    style: { fontSize: 'clamp(52px, 9vw, 96px)', lineHeight: '1', textAlign: 'center', minHeight: '1em' }
  });

  const zone = el('div', {
    style: {
      display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', minHeight: '64px'
    }
  });

  const choix = el('div', {
    style: { display: 'flex', gap: 'clamp(10px, 2vw, 20px)', justifyContent: 'center', flexWrap: 'wrap' }
  });

  const message = el('div', {
    style: { textAlign: 'center', minHeight: '24px', fontSize: '16px', color: 'var(--u-texte-doux)' }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 'clamp(12px, 2.6vh, 28px)'
    }
  }, image, zone, message, choix));

  /* ---- Palier 1 : reconnaître le mot --------------------------------- */

  function reconnaitre(niveau) {
    const liste = corpus(niveau);
    const bon = piocher(liste);
    const options = new Set([bon.m]);
    while (options.size < 3 && options.size < liste.length) options.add(piocher(liste).m);

    image.textContent = bon.i;
    zone.replaceChildren();
    choix.replaceChildren(...[...options].sort(() => Math.random() - 0.5).map((mot) => {
      const b = el('button', {
        class: 'carte', type: 'button',
        style: {
          padding: '16px 22px', cursor: 'pointer', font: 'inherit', color: 'inherit',
          fontFamily: 'var(--u-police-titre)', fontWeight: '800',
          fontSize: 'clamp(22px, 3.2vw, 34px)', letterSpacing: '.08em'
        }
      }, mot);
      b.addEventListener('pointerdown', () => {
        if (mot === bon.m) gagne(b);
        else rate(b, () => { message.textContent = `C’était ${bon.m}.`; });
      });
      return b;
    }));

    anim.cascade(choix.children, { decalage: 70, depart: 0 });
  }

  /* ---- Palier 2 : reconstituer le mot -------------------------------- */

  function reconstituer(niveau, avecImage) {
    const bon = piocher(corpus(niveau));
    const lettres = [...bon.m].sort(() => Math.random() - 0.5);
    const saisie = [];

    image.textContent = avecImage ? bon.i : '';

    const cases = [...bon.m].map(() => el('div', {
      style: {
        width: 'clamp(38px, 5.6vw, 58px)', height: 'clamp(48px, 6.6vw, 68px)',
        borderRadius: '12px', display: 'grid', placeItems: 'center',
        border: '3px dashed color-mix(in srgb, var(--u-texte) 26%, transparent)',
        fontFamily: 'var(--u-police-titre)', fontWeight: '800',
        fontSize: 'clamp(22px, 3.2vw, 32px)'
      }
    }));
    zone.replaceChildren(...cases);

    const jetons = lettres.map((lettre) => {
      const b = el('button', {
        class: 'carte', type: 'button',
        style: {
          padding: '0', width: 'clamp(52px, 7vw, 72px)', height: 'clamp(52px, 7vw, 72px)',
          display: 'grid', placeItems: 'center', cursor: 'pointer',
          font: 'inherit', color: 'inherit',
          fontFamily: 'var(--u-police-titre)', fontWeight: '800',
          fontSize: 'clamp(24px, 3.4vw, 34px)'
        }
      }, lettre);

      b.addEventListener('pointerdown', () => {
        if (fini || b.disabled || saisie.length >= bon.m.length) return;
        b.disabled = true;
        b.style.opacity = '.28';
        saisie.push({ lettre, bouton: b });
        cases[saisie.length - 1].textContent = lettre;
        audio.son('touche');
        if (saisie.length === bon.m.length) verifier();
      });
      return b;
    });
    choix.replaceChildren(...jetons);

    // Retirer la dernière lettre posée : l'erreur doit rester réparable.
    const effacer = el('button', {
      class: 'bouton', type: 'button',
      style: { minHeight: '52px', padding: '0 18px', fontSize: '20px' }
    }, '⌫');
    effacer.addEventListener('pointerdown', () => {
      const dernier = saisie.pop();
      if (!dernier) return;
      dernier.bouton.disabled = false;
      dernier.bouton.style.opacity = '1';
      cases[saisie.length].textContent = '';
      audio.son('tap');
    });
    choix.appendChild(effacer);

    function verifier() {
      const propose = saisie.map((s) => s.lettre).join('');
      if (propose === bon.m) { gagne(zone); return; }
      rate(zone, () => {
        for (const [i, c] of cases.entries()) c.textContent = bon.m[i];
        message.textContent = `C’était ${bon.m}.`;
      });
      // On rend les lettres pour pouvoir réessayer.
      attendre(() => {
        if (fini || essais === 0) return;
        for (const s of saisie) { s.bouton.disabled = false; s.bouton.style.opacity = '1'; }
        saisie.length = 0;
        for (const c of cases) c.textContent = '';
      }, 700);
    }

    anim.cascade(choix.children, { decalage: 55, depart: 0 });
  }

  /* ---- Retours -------------------------------------------------------- */

  function gagne(cible) {
    reussites++;
    audio.son('juste');
    anim.recompense(cible);
    message.textContent = '';
    attendre(nouvelle, 850);
  }

  function rate(cible, montrerReponse) {
    essais++;
    audio.son('presque');
    anim.nonNon(cible);

    if (essais === 1) {
      message.textContent = 'Presque ! Regarde encore.';
      return;
    }
    erreurs++;
    montrerReponse();
    attendre(nouvelle, 2000);
  }

  function nouvelle() {
    if (fini) return;
    essais = 0;
    message.textContent = '';
    const n = niveauCourant();
    if (n <= 3) reconnaitre(n);
    else reconstituer(n, n <= 6);
  }

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
    ctx.surFin({ reussites, erreurs });
  }

  nouvelle();

  return function demonter() {
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
  };
}
