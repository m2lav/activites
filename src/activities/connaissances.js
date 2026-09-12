/* =========================================================================
   Moteur de questions de connaissances.

   Nœuds marins, culture, scoutisme : même mécanique, contenus différents.
   Plutôt que trois activités qui se recopient, une fabrique et trois
   banques de questions. Ajouter un thème, c'est écrire une banque.

   Deux formes de question :
   - 'choix' : un énoncé, une illustration facultative, trois ou quatre
     réponses proposées.
   - 'ordre' : des étapes à remettre dans le bon ordre en les touchant.
     C'est ce que demandait le brief pour le nœud de chaise — on n'apprend
     pas à faire un nœud sur un écran, mais on peut en retenir la suite.

   Anti-frustration identique partout : réessayer, puis la bonne réponse se
   signale d'elle-même, et on passe à la suite sans commentaire.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';

/**
 * @param {object} o
 * @param {string} o.id, o.nom
 * @param {[number,number]} o.ages
 * @param {(niveau:number)=>object} o.banque  tire une question
 * @param {(niveau:number)=>string} [o.resume] texte de l'aperçu de la roue
 */
export function creerActivite({
  id, nom, ages, duree = 80, type = 'culture', categorie = 'effort', banque, resume
}) {
  const meta = { id, nom, type, categorie, ages, duree };

  const apercu = (niveau) => (resume ? resume(niveau) : null);
  const generer = (niveau) => ({ niveau: Math.min(10, Math.max(1, Math.round(niveau))) });

  function monter(conteneur, exercice, ctx) {
    const niveauCourant = ctx.niveau || (() => exercice.niveau);
    const DUREE = ctx.duree ?? meta.duree * 1000;

    let reussites = 0;
    let erreurs = 0;
    let fini = false;
    let essais = 0;

    const minuteurs = new Set();
    const attendre = (fn, ms) => {
      const id2 = setTimeout(() => { minuteurs.delete(id2); fn(); }, ms);
      minuteurs.add(id2);
      return id2;
    };

    const illustration = el('div', {
      style: { textAlign: 'center', minHeight: '0', lineHeight: '1' }
    });

    const enonce = el('div', {
      style: {
        textAlign: 'center', fontFamily: 'var(--u-police-titre)', fontWeight: '700',
        fontSize: 'clamp(19px, 2.8vw, 30px)', maxWidth: '30ch', margin: '0 auto'
      }
    });

    const reponses = el('div', {
      style: {
        display: 'flex', gap: 'clamp(10px, 1.8vw, 18px)', justifyContent: 'center',
        flexWrap: 'wrap', maxWidth: 'min(760px, 94vw)', margin: '0 auto'
      }
    });

    const message = el('div', {
      style: { textAlign: 'center', minHeight: '24px', fontSize: '16px', color: 'var(--u-texte-doux)' }
    });

    conteneur.append(el('div', {
      style: {
        flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', gap: 'clamp(12px, 2.6vh, 26px)', overflowY: 'auto'
      }
    }, illustration, enonce, message, reponses));

    function carteReponse(texte) {
      return el('button', {
        class: 'carte', type: 'button',
        style: {
          padding: '14px 20px', cursor: 'pointer', font: 'inherit', color: 'inherit',
          fontSize: 'clamp(15px, 1.9vw, 19px)', maxWidth: '300px',
          minHeight: '58px', textAlign: 'center'
        }
      }, texte);
    }

    /* ---- Question à choix ------------------------------------------- */

    function poserChoix(q) {
      reponses.replaceChildren(...[...q.options].sort(() => Math.random() - 0.5).map((opt) => {
        const b = carteReponse(opt);
        b.addEventListener('pointerdown', () => {
          if (fini) return;
          if (opt === q.reponse) { gagne(b); return; }
          rate(b, () => {
            for (const autre of reponses.children) {
              if (autre.textContent === q.reponse) {
                autre.style.borderColor = 'var(--u-secondaire)';
                anim.recompense(autre);
              }
            }
            if (q.explication) message.textContent = q.explication;
          });
        });
        return b;
      }));
      anim.cascade(reponses.children, { decalage: 70, depart: 0 });
    }

    /* ---- Question à remettre dans l'ordre ---------------------------- */

    function poserOrdre(q) {
      let attendu = 0;
      reponses.replaceChildren(...[...q.etapes].sort(() => Math.random() - 0.5).map((etape) => {
        const rang = el('span', {
          style: {
            display: 'inline-grid', placeItems: 'center', minWidth: '26px', height: '26px',
            borderRadius: '50%', marginRight: '8px', fontWeight: '800', fontSize: '14px',
            background: 'color-mix(in srgb, var(--u-texte) 12%, transparent)'
          }
        }, '');

        const b = carteReponse('');
        b.replaceChildren(rang, document.createTextNode(etape));
        b.style.textAlign = 'left';

        b.addEventListener('pointerdown', () => {
          if (fini || b.disabled) return;
          if (etape === q.etapes[attendu]) {
            attendu++;
            b.disabled = true;
            rang.textContent = String(attendu);
            rang.style.background = 'var(--u-secondaire)';
            rang.style.color = 'var(--u-sur-primaire)';
            b.style.opacity = '.65';
            audio.son('touche');
            if (attendu === q.etapes.length) gagne(reponses);
          } else {
            erreurs++;
            audio.son('presque');
            anim.nonNon(b);
          }
        });
        return b;
      }));
      anim.cascade(reponses.children, { decalage: 60, depart: 0 });
    }

    /* ---- Retours ------------------------------------------------------ */

    function gagne(cible) {
      reussites++;
      audio.son('juste');
      anim.recompense(cible);
      message.textContent = '';
      attendre(nouvelle, 1000);
    }

    function rate(cible, montrer) {
      essais++;
      audio.son('presque');
      anim.nonNon(cible);
      if (essais === 1) { message.textContent = 'Pas tout à fait. Réessaie.'; return; }
      erreurs++;
      montrer();
      attendre(nouvelle, 2600);
    }

    function nouvelle() {
      if (fini) return;
      essais = 0;
      message.textContent = '';

      const q = banque(niveauCourant());
      enonce.textContent = q.enonce;
      illustration.replaceChildren();
      if (q.illustration) {
        illustration.appendChild(typeof q.illustration === 'string'
          ? el('span', { style: { fontSize: 'clamp(40px, 7vw, 72px)' } }, q.illustration)
          : q.illustration);
      }

      if (q.forme === 'ordre') poserOrdre(q); else poserChoix(q);
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
      for (const id2 of minuteurs) clearTimeout(id2);
      minuteurs.clear();
      ctx.surFin({ reussites, erreurs });
    }

    nouvelle();

    return function demonter() {
      fini = true;
      clearInterval(battement);
      for (const id2 of minuteurs) clearTimeout(id2);
      minuteurs.clear();
    };
  }

  return { meta, generer, monter, apercu };
}
