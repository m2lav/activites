/* =========================================================================
   La balance — de la pré-algèbre, sans une seule lettre.

   On montre un équilibre : trois ronds pèsent comme un carré. On demande
   ensuite combien de ronds équilibrent deux carrés. L'enfant manipule une
   égalité et une proportionnalité sans jamais voir d'inconnue écrite.

   Aux niveaux élevés, deux équilibres s'enchaînent — trois ronds pour un
   carré, deux carrés pour un triangle — et il faut composer les deux. C'est
   le premier raisonnement en deux étapes du catalogue.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as retour from '../ui/retour.js';
import { creerMinuterie } from './minuterie.js';

export const meta = {
  id: 'balance',
  nom: 'La balance',
  type: 'logique',
  categorie: 'effort',
  ages: [6, 12],
  duree: 85,
  consigne: 'Équilibre la balance : combien en faut-il ?'
};

const OBJETS = ['🍎', '🍋', '🍇', '🥕', '🌰'];

const hasard = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const piocher = (l) => l[Math.floor(Math.random() * l.length)];

export function apercu(niveau) {
  return niveau >= 7 ? 'deux équilibres à enchaîner' : 'un équilibre';
}

export function generer(niveau) {
  return { niveau: Math.min(10, Math.max(1, Math.round(niveau))) };
}

/**
 * Une question, en une ou deux étapes.
 * Les nombres restent petits : l'intérêt est le raisonnement, pas le calcul.
 */
function construire(niveau) {
  const [a, b, c] = [...OBJETS].sort(() => Math.random() - 0.5);
  const deuxEtapes = niveau >= 7;

  // a × rapport1 = b
  const rapport1 = hasard(2, niveau <= 4 ? 3 : 4);

  if (!deuxEtapes) {
    const combien = hasard(2, niveau <= 4 ? 2 : 3);
    const reponse = rapport1 * combien;
    return {
      equilibres: [{ gauche: { objet: a, nombre: rapport1 }, droite: { objet: b, nombre: 1 } }],
      question: { objet: b, nombre: combien, cherche: a },
      reponse
    };
  }

  const rapport2 = hasard(2, 3);
  return {
    equilibres: [
      { gauche: { objet: a, nombre: rapport1 }, droite: { objet: b, nombre: 1 } },
      { gauche: { objet: b, nombre: rapport2 }, droite: { objet: c, nombre: 1 } }
    ],
    question: { objet: c, nombre: 1, cherche: a },
    reponse: rapport1 * rapport2
  };
}

function rangee(objet, nombre, taille) {
  return el('div', {
    style: {
      display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center',
      alignItems: 'center', maxWidth: '46%'
    }
  }, ...Array.from({ length: nombre }, () => el('span', {
    style: { fontSize: `${taille}px`, lineHeight: '1' }
  }, objet)));
}

function balance(gauche, droite, taille) {
  return el('div', {
    style: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 'clamp(10px, 2vw, 22px)', width: '100%',
      padding: '10px 14px', borderRadius: '16px',
      background: 'color-mix(in srgb, var(--u-carte) 45%, transparent)'
    }
  },
    rangee(gauche.objet, gauche.nombre, taille),
    el('span', {
      style: { fontSize: `${Math.round(taille * 0.9)}px`, opacity: '.8' }
    }, '⚖️'),
    rangee(droite.objet, droite.nombre, taille)
  );
}

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let reussites = 0;
  let erreurs = 0;
  let fini = false;
  let essais = 0;
  let q = null;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  const enonce = el('div', {
    style: { display: 'grid', gap: '10px', width: 'min(620px, 92vw)' }
  });

  const demande = el('div', {
    style: {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: '12px', flexWrap: 'wrap', textAlign: 'center',
      fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: 'clamp(20px, 3vw, 30px)'
    }
  });

  const options = el('div', {
    style: {
      display: 'flex', gap: 'clamp(10px, 2vw, 20px)', justifyContent: 'center',
      flexWrap: 'wrap'
    }
  });

  conteneur.append(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center',
      gap: 'clamp(14px, 3.5vh, 32px)', position: 'relative'
    }
  }, enonce, demande, options));

  function nouvelle() {
    if (fini) return;
    // Point de rupture : jamais au milieu d'une question.
    if (minuterie.doitFinir()) { terminer(); return; }

    q = construire(niveauCourant());
    essais = 0;

    const taille = q.equilibres.length > 1 ? 30 : 38;
    enonce.replaceChildren(...q.equilibres.map((e) => balance(e.gauche, e.droite, taille)));

    demande.replaceChildren(
      ...Array.from({ length: q.question.nombre }, () => el('span', {
        style: { fontSize: `${taille + 6}px`, lineHeight: '1' }
      }, q.question.objet)),
      el('span', { style: { fontSize: `${taille}px` } }, '⚖️'),
      el('span', { style: { fontSize: `${taille}px`, opacity: '.55' } }, '?'),
      el('span', { style: { fontSize: `${taille + 6}px`, lineHeight: '1' } }, q.question.cherche)
    );

    // Propositions encadrant la bonne réponse : on ne devine pas au hasard.
    const propositions = new Set([q.reponse]);
    let ecart = 1;
    while (propositions.size < 4) {
      if (q.reponse - ecart > 0) propositions.add(q.reponse - ecart);
      if (propositions.size < 4) propositions.add(q.reponse + ecart);
      ecart++;
    }

    options.replaceChildren(...[...propositions].sort(() => Math.random() - 0.5).map((n) => {
      const b = el('button', {
        class: 'carte', type: 'button',
        style: {
          padding: '14px 24px', cursor: 'pointer', font: 'inherit', color: 'inherit',
          fontFamily: 'var(--u-police-titre)', fontWeight: '800',
          fontSize: 'clamp(26px, 3.6vw, 38px)', minWidth: '84px'
        }
      }, String(n));
      b.addEventListener('pointerdown', () => choisir(n, b));
      return b;
    }));

    anim.cascade([...enonce.children, ...options.children], { decalage: 70, depart: 0 });
  }

  function choisir(n, bouton) {
    if (fini || !q) return;

    if (n === q.reponse) {
      reussites++;
      audio.son('juste');
      anim.recompense(bouton);
      retour.reussite(conteneur);
      attendre(nouvelle, 1000);
      return;
    }

    essais++;
    audio.son('presque');
    anim.nonNon(bouton);

    if (essais === 1) { retour.echec(conteneur, 'Regarde la première balance'); return; }

    erreurs++;
    retour.reponseMontree(conteneur, `C’était ${q.reponse}`);
    attendre(nouvelle, 2200);
  }

  const minuterie = creerMinuterie({
    duree: ctx.duree ?? meta.duree * 1000,
    terminer: () => terminer()
  });

  function terminer() {
    if (fini) return;
    fini = true;
    minuterie.arreter();
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    ctx.surFin({ reussites, erreurs });
  }

  nouvelle();

  return function demonter() {
    fini = true;
    minuterie.arreter();
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
  };
}
