/* =========================================================================
   Première configuration.

   Le code est publié sur un dépôt public : aucun prénom n'y figure. Les
   enfants sont saisis ici, une seule fois, sur l'iPad — et n'en sortent
   jamais.

   C'est le seul écran où le clavier système est admis : c'est un geste de
   parent, fait une fois. Les enfants, eux, n'utilisent que le pavé dessiné
   dans l'application.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as store from '../core/store.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as univers from '../core/univers.js';
import { aller, reinitialiserPile } from '../core/router.js';

const AGE_MIN = 2;
const AGE_MAX = 12;
const AGE_DEFAUT = 6;

export async function creer() {
  const manifestes = await univers.tousLesManifestes();

  const fiches = [];
  const rangee = el('div', {
    class: 'cascade',
    style: {
      display: 'flex', gap: 'clamp(12px, 2vw, 24px)', justifyContent: 'center',
      flexWrap: 'wrap', alignItems: 'flex-start', margin: '20px 0'
    }
  });

  const ajouter = (auto = false) => {
    if (fiches.length >= 6) return;
    const f = fiche(manifestes, fiches.length);
    fiches.push(f);
    rangee.appendChild(f.element);
    if (!auto) anim.cascade([f.element], { depart: 0 });
    majValider();
  };

  const valider = el('button', {
    class: 'bouton bouton--primaire', type: 'button',
    style: { minWidth: '220px' }
  }, "C'est parti");

  const plus = el('button', {
    class: 'bouton', type: 'button'
  }, '+ Un enfant de plus');

  function majValider() {
    const prets = fiches.filter((f) => f.valeur().prenom).length;
    valider.disabled = prets === 0;
    valider.style.opacity = prets === 0 ? '.4' : '1';
    plus.hidden = fiches.length >= 6;
  }

  plus.addEventListener('pointerdown', () => { audio.son('touche'); anim.appui(plus); ajouter(); });

  valider.addEventListener('pointerdown', async () => {
    if (valider.disabled) return;
    const enfants = fiches.map((f) => f.valeur()).filter((v) => v.prenom);
    if (!enfants.length) return;

    audio.son('recompense');
    anim.recompense(valider);
    await store.creerProfils(enfants);
    reinitialiserPile();
    await aller('accueil');
  });

  for (let i = 0; i < 3; i++) ajouter(true);
  rangee.addEventListener('input', majValider);

  const element = el('div', { class: 'ecran ecran--defilable' },
    el('div', { class: 'contenu' },
      el('h1', {
        class: 'titre',
        style: { textAlign: 'center', fontSize: 'clamp(26px, 4vw, 46px)' }
      }, 'Qui va jouer ?'),
      el('p', {
        class: 'sous-titre',
        style: { textAlign: 'center', maxWidth: '46ch', margin: '0 auto' }
      }, "À remplir une seule fois. Ces informations restent sur cet iPad et ne sont envoyées nulle part."),
      rangee,
      el('div', {
        style: { display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }
      }, plus, valider)
    )
  );

  return {
    element,
    apresMontage() {
      anim.cascade(rangee.children, { decalage: 80, depart: 80 });
      majValider();
    }
  };
}

/* ---------------------------------------------------------------------- */

function fiche(manifestes, index) {
  const couleur = store.COULEURS_PROFIL[index % store.COULEURS_PROFIL.length];

  const prenom = el('input', {
    type: 'text',
    placeholder: 'Prénom',
    autocomplete: 'off',
    autocapitalize: 'words',
    spellcheck: false,
    maxLength: 20,
    class: 'selectionnable',
    style: {
      font: 'inherit', fontFamily: 'var(--u-police-titre)', fontWeight: '700',
      fontSize: '20px', textAlign: 'center', width: '100%',
      background: 'color-mix(in srgb, var(--u-fond) 55%, transparent)',
      color: 'var(--u-texte)',
      border: '2px solid color-mix(in srgb, var(--u-texte) 16%, transparent)',
      borderRadius: '14px', minHeight: '56px', padding: '0 12px'
    }
  });

  let age = AGE_DEFAUT;
  const etiquetteAge = el('span', {
    style: { minWidth: '76px', textAlign: 'center', fontWeight: '700' }
  }, `${age} ans`);

  const pas = (delta) => {
    age = Math.min(AGE_MAX, Math.max(AGE_MIN, age + delta));
    etiquetteAge.textContent = `${age} ans`;
    audio.son('touche');
  };

  const compteur = el('div', {
    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }
  },
    boutonRond('−', () => pas(-1)),
    etiquetteAge,
    boutonRond('+', () => pas(1))
  );

  // « Mer & voiliers » par défaut : c'est l'univers commun aux trois enfants.
  let choisi = manifestes.some((m) => m.id === 'mer') ? 'mer' : manifestes[0]?.id;
  const pastilles = manifestes.map((m) => {
    const p = el('button', {
      type: 'button',
      'aria-label': m.nom,
      title: m.nom,
      style: {
        width: '30px', height: '30px', borderRadius: '50%', padding: '0',
        cursor: 'pointer',
        background: `linear-gradient(140deg, ${m.palette.primaire}, ${m.palette.secondaire})`,
        border: '3px solid transparent',
        transition: 'transform .15s ease, border-color .15s ease'
      },
      dataset: { univers: m.id }
    });
    p.addEventListener('pointerdown', () => {
      choisi = m.id;
      audio.son('tap');
      anim.appui(p);
      majPastilles();
    });
    return p;
  });

  function majPastilles() {
    for (const p of pastilles) {
      const actif = p.dataset.univers === choisi;
      p.style.borderColor = actif ? 'var(--u-texte)' : 'transparent';
      p.style.transform = actif ? 'scale(1.14)' : 'scale(1)';
    }
  }
  majPastilles();

  const element = el('div', {
    class: 'carte',
    style: {
      display: 'flex', flexDirection: 'column', gap: '14px',
      width: 'clamp(190px, 26vw, 250px)', borderTop: `5px solid ${couleur}`
    }
  },
    prenom,
    compteur,
    el('div', {
      style: {
        display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap',
        paddingTop: '4px'
      }
    }, ...pastilles)
  );

  return {
    element,
    valeur: () => ({ prenom: prenom.value.trim(), age, univers: choisi })
  };
}

function boutonRond(texte, action) {
  const b = el('button', {
    type: 'button',
    class: 'bouton',
    style: {
      width: '48px', minHeight: '48px', padding: '0',
      borderRadius: '50%', fontSize: '24px', lineHeight: '1'
    }
  }, texte);
  b.addEventListener('pointerdown', () => { anim.appui(b); action(); });
  return b;
}
