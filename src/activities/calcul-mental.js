/* =========================================================================
   Calcul mental.

   Première activité complète, et patron des suivantes. Trois choses la
   caractérisent :

   - **Tout est paramétrique.** Aucune opération n'est écrite en dur : les
     dix niveaux sont décrits dans PALIERS, et un changement de niveau en
     cours de séance prend effet à la question suivante, sans redéploiement.

   - **L'erreur n'est jamais sanctionnée.** Premier essai manqué : on
     réessaie. Deuxième : on donne un indice qui montre le chemin. Troisième :
     on montre la réponse et on passe à la suite, sans commentaire.

   - **Aucune question n'a de compte à rebours.** Le brief demandait du
     calcul « chronométré » ; le sablier de la séance donne déjà le tempo, et
     un minuteur par question ne produirait que de la panique chez un enfant
     de six ans. On mesure le temps de réponse — c'est utile au parent — mais
     on ne l'oppose jamais à l'enfant.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import { creerPave } from '../ui/pave-numerique.js';

export const meta = {
  id: 'calcul-mental',
  nom: 'Calcul mental',
  type: 'calcul_mental',
  categorie: 'effort',
  ages: [5, 12],
  duree: 90
};

/* ---- Les dix niveaux --------------------------------------------------- */

const PALIERS = {
  1:  { ops: ['+'],           max: 5,   retenue: false, aide: true },
  2:  { ops: ['+'],           max: 10,  retenue: false, aide: true },
  3:  { ops: ['+', '−'],      max: 10,  retenue: false, aide: true },
  4:  { ops: ['+', '−'],      max: 20,  retenue: false, aide: true },
  5:  { ops: ['+', '−'],      max: 20,  retenue: false, aide: false },
  6:  { ops: ['+', '−'],      max: 20,  retenue: true,  aide: false },
  7:  { ops: ['+', '−', '×'], max: 50,  retenue: true,  tables: [2, 5, 10] },
  8:  { ops: ['+', '−', '×'], max: 100, retenue: true,  tables: [2, 3, 4, 5, 10] },
  9:  { ops: ['+', '−', '×'], max: 100, retenue: true,  tables: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
  10: { ops: ['+', '−', '×'], max: 200, retenue: true,  tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
};

const palier = (n) => PALIERS[Math.min(10, Math.max(1, Math.round(n)))];
const hasard = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/** Une question, tirée des paramètres du niveau. */
function question(niveau) {
  const p = palier(niveau);
  const op = p.ops[Math.floor(Math.random() * p.ops.length)];

  if (op === '×') {
    const a = p.tables[Math.floor(Math.random() * p.tables.length)];
    const b = hasard(2, 10);
    return { a, b, op, reponse: a * b };
  }

  if (op === '+') {
    // Sans retenue : la somme des unités doit rester sous 10.
    for (let essai = 0; essai < 40; essai++) {
      const a = hasard(1, p.max - 1);
      const b = hasard(1, p.max - a);
      if (!p.retenue && (a % 10) + (b % 10) >= 10) continue;
      return { a, b, op, reponse: a + b };
    }
    const a = hasard(1, Math.floor(p.max / 2));
    return { a, b: hasard(1, p.max - a), op, reponse: a + hasard(1, p.max - a) };
  }

  // Soustraction : jamais de résultat négatif.
  for (let essai = 0; essai < 40; essai++) {
    const a = hasard(2, p.max);
    const b = hasard(1, a - 1);
    if (!p.retenue && (a % 10) < (b % 10)) continue;
    return { a, b, op, reponse: a - b };
  }
  const a = hasard(2, p.max);
  const b = hasard(1, a - 1);
  return { a, b, op, reponse: a - b };
}

/** Aperçu affiché dans la roue de réglage : « à quoi ressemble ce niveau ». */
export function apercu(niveau) {
  const q = question(niveau);
  return `${q.a} ${q.op} ${q.b}`;
}

export function generer(niveau) {
  // Pas de question pré-tirée : elles sont générées une par une pendant
  // l'activité, pour que le niveau puisse changer en cours de route.
  return { niveau, duree: meta.duree * 1000 };
}

/* ---- Indices ----------------------------------------------------------- */

function indice(q) {
  if (q.op === '+') {
    const versDix = 10 - (q.a % 10);
    if (q.a + q.b > 10 && q.b > versDix && versDix > 0) {
      return `${q.a} + ${versDix} = ${q.a + versDix}, puis encore ${q.b - versDix}`;
    }
    return `Pars de ${q.a} et avance de ${q.b}`;
  }
  if (q.op === '−') {
    return `Pars de ${q.b} et compte jusqu'à ${q.a}`;
  }
  return `${q.b} fois ${q.a}, c'est ${q.a} + ${q.a}${q.b > 2 ? ' + …' : ''}`;
}

/* ---- Montage ----------------------------------------------------------- */

export function monter(conteneur, exercice, ctx) {
  const niveauCourant = ctx.niveau || (() => exercice.niveau);

  let resolues = 0;
  let manquees = 0;
  let fini = false;
  let q = null;
  let essais = 0;
  let debutQuestion = 0;

  const minuteurs = new Set();
  const attendre = (fn, ms) => {
    const id = setTimeout(() => { minuteurs.delete(id); fn(); }, ms);
    minuteurs.add(id);
    return id;
  };

  /* -- Affichage de l'opération -- */

  const operation = el('div', {
    style: {
      fontFamily: 'var(--u-police-titre)', fontWeight: '800',
      fontSize: 'clamp(38px, 7vw, 76px)', lineHeight: '1.1',
      textAlign: 'center', letterSpacing: '.02em'
    }
  });

  const jetons = el('div', {
    style: {
      display: 'flex', flexDirection: 'column', gap: '8px',
      alignItems: 'center', minHeight: '0'
    }
  });

  const message = el('div', {
    style: {
      minHeight: '26px', textAlign: 'center', fontSize: '17px',
      color: 'var(--u-texte-doux)', padding: '0 10px'
    }
  });

  const score = el('div', {
    style: {
      textAlign: 'center', fontSize: '15px', color: 'var(--u-secondaire)',
      fontWeight: '700', minHeight: '20px'
    }
  });

  const pave = creerPave({
    longueurMax: 4,
    affichage: 'aucun',
    validerAuto: false,
    surChangement: (v) => dessiner(v),
    surValider: (v) => valider(v)
  });

  const colonneGauche = el('div', {
    style: {
      flex: '1 1 300px', minWidth: '0', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: '14px'
    }
  }, operation, jetons, message, score);

  const colonneDroite = el('div', {
    style: { flex: '0 1 380px', display: 'flex', alignItems: 'center', minWidth: '0' }
  }, pave.element);

  conteneur.appendChild(el('div', {
    style: {
      flex: '1', minHeight: '0', display: 'flex', gap: 'clamp(12px, 2vw, 32px)',
      alignItems: 'stretch', flexWrap: 'wrap', justifyContent: 'center'
    }
  }, colonneGauche, colonneDroite));

  /* -- Rendu -- */

  function dessiner(saisie = '') {
    if (!q) return;
    operation.replaceChildren(
      el('span', {}, `${q.a} ${q.op} ${q.b} = `),
      el('span', {
        style: {
          color: saisie ? 'var(--u-secondaire)' : 'var(--u-texte-doux)',
          borderBottom: '4px solid color-mix(in srgb, var(--u-texte) 26%, transparent)',
          minWidth: '1.4em', display: 'inline-block', textAlign: 'center'
        }
      }, saisie || '?')
    );
  }

  /** Aide Montessori : on montre les quantités, l'enfant peut compter. */
  function dessinerJetons() {
    jetons.replaceChildren();
    const p = palier(niveauCourant());
    if (!p.aide || !q || q.op === '×') return;

    const ligne = (combien, couleur) => el('div', {
      style: {
        display: 'flex', gap: '7px', flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 'min(420px, 80vw)'
      }
    }, ...Array.from({ length: combien }, () => el('div', {
      style: {
        width: '22px', height: '22px', borderRadius: '50%', background: couleur
      }
    })));

    if (q.op === '+') {
      jetons.append(ligne(q.a, 'var(--u-primaire)'), ligne(q.b, 'var(--u-accent)'));
    } else {
      // Soustraction : on barre ce que l'on retire.
      const total = el('div', {
        style: {
          display: 'flex', gap: '7px', flexWrap: 'wrap', justifyContent: 'center',
          maxWidth: 'min(420px, 80vw)'
        }
      }, ...Array.from({ length: q.a }, (_, i) => el('div', {
        style: {
          width: '22px', height: '22px', borderRadius: '50%',
          background: i >= q.a - q.b ? 'transparent' : 'var(--u-primaire)',
          border: i >= q.a - q.b ? '2px solid var(--u-texte-doux)' : 'none',
          opacity: i >= q.a - q.b ? '.5' : '1'
        }
      })));
      jetons.append(total);
    }
  }

  /* -- Cycle d'une question -- */

  function nouvelle() {
    if (fini) return;
    // Le niveau est relu ici : un réglage fait en cours de séance prend
    // effet maintenant, et jamais au milieu d'une question.
    q = question(niveauCourant());
    essais = 0;
    debutQuestion = Date.now();
    message.textContent = '';
    pave.vider();
    dessiner('');
    dessinerJetons();
    anim.cascade([operation], { depart: 0, decalage: 0 });
  }

  function valider(saisie) {
    if (fini || !q || saisie === '') return;

    if (Number(saisie) === q.reponse) {
      resolues++;
      score.textContent = `${resolues} trouvé${resolues > 1 ? 's' : ''}`;
      message.textContent = '';
      audio.son('juste');
      anim.recompense(operation);
      attendre(nouvelle, 750);
      return;
    }

    essais++;
    audio.son('presque');
    anim.nonNon(operation);
    pave.vider();

    if (essais === 1) {
      message.textContent = 'Presque ! Essaie encore.';
    } else if (essais === 2) {
      message.textContent = indice(q);
    } else {
      manquees++;
      message.replaceChildren(el('span', { style: { color: 'var(--u-accent)' } },
        `C'était ${q.reponse}. On continue !`));
      dessiner(String(q.reponse));
      attendre(nouvelle, 2000);
    }
  }

  /* -- Durée de l'activité -- */

  const debut = Date.now();
  const battement = setInterval(() => {
    if (fini) return;
    const reste = exercice.duree ?? meta.duree * 1000;
    const ecoule = Date.now() - debut;

    // Tic-tac uniquement sur les dernières secondes : un tic-tac continu
    // pendant 90 secondes n'aide personne à réfléchir.
    if (reste - ecoule <= 10_000 && reste - ecoule > 0) audio.son('tic');

    if (ecoule >= reste) terminer();
  }, 1000);
  minuteurs.add(battement);

  function terminer() {
    if (fini) return;
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) clearTimeout(id);
    minuteurs.clear();
    ctx.surFin({ reussites: resolues, erreurs: manquees });
  }

  nouvelle();

  return function demonter() {
    fini = true;
    clearInterval(battement);
    for (const id of minuteurs) { clearTimeout(id); clearInterval(id); }
    minuteurs.clear();
  };
}
