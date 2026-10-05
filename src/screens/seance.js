/* =========================================================================
   Écran de séance.

   Un seul écran pour toute la séance : les activités se remplacent à
   l'intérieur, le bandeau et son sablier restent en place. Passer par le
   routeur à chaque activité ferait repartir le sablier visuellement et
   couperait la continuité que l'on cherche.

   La règle « on ne coupe jamais au milieu » est appliquée ici de la seule
   façon qui vaille : on ne consulte le temps restant qu'entre deux
   activités, via seance.prochaine().
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import * as registre from '../activities/index.js';
import { creerSeance, niveauxDe } from '../core/session.js';
import { creerSablier } from '../ui/sablier.js';
import { boutonSilence, appuiLong } from '../ui/controles.js';
import { creerRoue } from '../ui/reglage-difficulte.js';
import * as bandeau from '../ui/bandeau.js';
import * as univers from '../core/univers.js';
import { aller, reinitialiserPile } from '../core/router.js';

export async function creer({ profil, dureeMinutes, mode = 'normal' }) {
  const niveaux = await niveauxDe(profil.id);
  const seance = creerSeance({ profil, niveaux, dureeMinutes, mode });

  // Le personnage qui donne les consignes vient de l'univers de l'enfant.
  const manifesteUnivers = await univers.manifeste(univers.universActif() || 'mer')
    .catch(() => null);
  const mascotte = manifesteUnivers?.mascotte || '🙂';

  // Progression lue par le sablier : quelle activité, et où elle en est.
  let debutActivite = 0;
  let budgetActivite = seance.dureeActivite();
  const progression = () => ({
    indice: seance.indice(),
    part: debutActivite ? Math.min(1, (Date.now() - debutActivite) / budgetActivite) : 0
  });

  const sablier = creerSablier({ nombre: seance.nombreActivites, progression });

  const sortie = el('button', {
    class: 'bouton', type: 'button',
    'aria-label': 'Terminer la séance',
    style: { width: 'var(--touche-min)', padding: '0', fontSize: '20px', flex: '0 0 auto' }
  }, '✕');
  // Appui long : un enfant ne met pas fin à la séance par mégarde.
  appuiLong(sortie, () => terminer());

  let metaCourante = null;

  const roue = creerRoue({
    contexte() {
      if (!metaCourante) return null;
      const module = registre.module(metaCourante.id);
      return {
        type: metaCourante.type,
        libelle: metaCourante.nom,
        niveau: seance.niveauDuType(metaCourante.type),
        apercu: module?.apercu ? (n) => module.apercu(n) : null
      };
    },
    definir: (type, valeur) => seance.definirNiveau(type, valeur)
  });

  // En mode test, un bouton pour passer sans attendre la fin de l'activité.
  const suivant = seance.test ? el('button', {
    class: 'bouton', type: 'button',
    'aria-label': 'Activité suivante',
    style: { width: 'var(--touche-min)', padding: '0', fontSize: '20px', flex: '0 0 auto' }
  }, '⏭') : null;
  if (suivant) suivant.addEventListener('pointerdown', () => { anim.appui(suivant); suivante(); });

  const etiquetteTest = seance.test ? el('span', {
    style: {
      fontSize: '12px', letterSpacing: '.08em', textTransform: 'uppercase',
      color: 'var(--u-accent)', fontWeight: '800', flex: '0 0 auto'
    }
  }, 'test') : null;

  bandeau.poser(
    etiquetteTest,
    seance.test ? el('div', { style: { flex: '1' } }) : sablier.element,
    roue, suivant, boutonSilence(), sortie
  );

  const aire = el('div', {
    style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' }
  });

  const element = el('div', { class: 'ecran' }, aire);

  let demonterActivite = null;
  let close = false;

  /* ---- Carton d'annonce ---------------------------------------------- */

  /**
   * Carton de consigne : le personnage de l'univers, et une bulle de BD qui
   * dit en quelques mots ce qu'il faut faire. Un enfant qui ne lit pas voit
   * la scène et entend la phrase ; il n'a pas à deviner le jeu en le jouant.
   */
  async function annoncer(meta) {
    const consigne = meta.consigne || meta.nom;

    const carton = el('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(10px, 2vh, 22px)', zIndex: '5'
      }
    },
      el('div', {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(12px, 2vw, 24px)', flexWrap: 'wrap', padding: '0 16px'
        }
      },
        el('span', {
          style: { fontSize: 'clamp(62px, 11vw, 120px)', lineHeight: '1' }
        }, mascotte),
        el('div', { class: 'bulle' }, consigne)
      ),
      el('div', {
        style: {
          fontSize: '15px', letterSpacing: '.08em', textTransform: 'uppercase',
          color: 'var(--u-texte-doux)', fontWeight: '700'
        }
      }, meta.nom)
    );
    element.style.position = 'relative';
    element.appendChild(carton);

    // La consigne est lue à voix haute pour tout le monde : même Gaspard
    // gagne à l'entendre plutôt qu'à la lire en vitesse.
    audio.parler(consigne);
    audio.son('transition');

    // attendreFin plutôt que .finished : si l'app passe en arrière-plan
    // pendant le carton, l'animation se met en pause et l'attente ne se
    // dénouerait jamais — la séance resterait bloquée sur l'annonce.
    await anim.attendreFin(carton.animate(
      [{ opacity: 0, transform: 'scale(.88)' },
       { opacity: 1, transform: 'scale(1)', offset: .25 },
       { opacity: 1, transform: 'scale(1)', offset: .75 },
       { opacity: 0, transform: 'scale(1.06)' }],
      { duration: 2200, easing: 'ease-in-out', fill: 'both' }
    ));

    carton.remove();
  }

  /* ---- Enchaînement --------------------------------------------------- */

  let bascule = false;

  async function suivante() {
    // Le bouton « suivant » du mode test peut arriver pendant le carton
    // d'annonce : sans ce verrou, deux activités se montent l'une sur l'autre.
    if (close || bascule) return;
    bascule = true;

    if (demonterActivite) { try { demonterActivite(); } catch { /* ignoré */ } }
    demonterActivite = null;
    aire.replaceChildren();

    const meta = seance.prochaine();
    if (!meta) { bascule = false; terminer(); return; }

    const module = registre.module(meta.id);
    if (!module) { bascule = false; terminer(); return; }

    metaCourante = meta;

    await annoncer(meta);
    if (close) { bascule = false; return; }

    const exercice = module.generer(seance.niveauDe(meta));
    const vue = el('div', {
      style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column', gap: '10px' }
    });
    aire.appendChild(vue);
    anim.apparition(vue);

    const t0 = Date.now();
    budgetActivite = seance.dureeActivite();
    debutActivite = t0;
    let rendu = false;

    demonterActivite = module.monter(vue, exercice, {
      // Une fonction, pas une valeur : l'activité relit le niveau à chaque
      // question, donc la roue de réglage agit sans quitter la séance.
      niveau: () => seance.niveauDuType(meta.type),
      // La durée est décidée par la séance, pas par l'activité. C'est une
      // échéance douce : l'activité s'arrête au point de rupture suivant.
      duree: budgetActivite,
      profil,
      surFin(resultat = {}) {
        if (rendu || close) return;
        rendu = true;
        seance.enregistrer(meta, {
          ...resultat,
          temps: Math.round((Date.now() - t0) / 1000)
        });
        suivante();
      }
    });

    bascule = false;
  }

  async function terminer() {
    if (close) return;
    close = true;

    sablier.arreter();
    if (demonterActivite) { try { demonterActivite(); } catch { /* ignoré */ } }
    demonterActivite = null;
    metaCourante = null;
    bandeau.vider();

    const bilan = await seance.sauvegarder();
    reinitialiserPile();
    await aller('fin-seance', { bilan });
  }

  return {
    element,
    apresMontage() {
      if (!seance.test) sablier.demarrer();
      suivante();
    },
    demonter() {
      close = true;
      sablier.arreter();
      if (demonterActivite) { try { demonterActivite(); } catch { /* ignoré */ } }
    }
  };
}
