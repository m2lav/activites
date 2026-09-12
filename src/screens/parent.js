/* =========================================================================
   Espace parent.

   Protégé par un code à quatre chiffres, saisi au pavé dessiné — jamais au
   clavier système. Trois sections : le suivi, les réglages, la sauvegarde.

   Rappel de cadrage : le réglage de la difficulté ne vit PAS ici. Il se fait
   en cours de jeu, à la roue (lot 3). Cet écran ne fait que montrer où en
   sont les niveaux.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as store from '../core/store.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import { UNIVERS, AMBIANCES, manifeste, palette, ambianceActive, definirAmbiance, universActif } from '../core/univers.js';
import { creerPave } from '../ui/pave-numerique.js';
import { aller, retour } from '../core/router.js';
import { vider as viderBandeau } from '../ui/bandeau.js';

const LIBELLES = {
  calcul_mental: 'Calcul mental',
  lecture: 'Lecture',
  logique: 'Logique',
  labyrinthe: 'Labyrinthes',
  memoire: 'Mémoire',
  adresse: 'Adresse',
  culture: 'Culture'
};

export async function creer() {
  viderBandeau();

  const scene = el('div', {
    style: { flex: '1', minHeight: '0', display: 'flex', flexDirection: 'column' }
  });

  const element = el('div', { class: 'ecran' }, scene);

  const codeAttendu = String(await store.reglage('code_parent') ?? '1234');

  /* ---- Verrou --------------------------------------------------------- */

  function montrerVerrou() {
    const pave = creerPave({
      longueurMax: 4,
      affichage: 'points',
      validerAuto: true,
      surValider(valeur) {
        if (valeur === codeAttendu) {
          audio.son('juste');
          montrerContenu();
        } else {
          pave.refuser();
        }
      }
    });

    const annuler = el('button', { class: 'bouton', type: 'button' }, '← Retour');
    annuler.addEventListener('pointerdown', () => { anim.appui(annuler); retour(); });

    const bloc = el('div', {
      class: 'cascade',
      style: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '18px', margin: 'auto'
      }
    },
      el('div', { style: { fontSize: '42px' } }, '🔒'),
      el('h1', { class: 'titre', style: { margin: '0', fontSize: 'clamp(24px, 3.4vw, 36px)' } },
        'Espace parent'),
      pave.element,
      annuler
    );

    scene.replaceChildren(bloc);
    anim.cascade(bloc.children, { decalage: 70, depart: 60 });
  }

  /* ---- Contenu -------------------------------------------------------- */

  async function montrerContenu() {
    const profils = await store.profils();
    const sections = el('div', {
      class: 'cascade',
      style: { display: 'flex', flexDirection: 'column', gap: '18px' }
    },
      sectionTest(profils),
      await sectionSuivi(profils),
      await sectionReglages(profils),
      sectionSauvegarde()
    );

    const fermer = el('button', { class: 'bouton', type: 'button' }, '← Retour');
    fermer.addEventListener('pointerdown', () => { anim.appui(fermer); audio.son('tap'); retour(); });

    const enveloppe = el('div', {
      style: {
        flex: '1', minHeight: '0', overflowY: 'auto',
        WebkitOverflowScrolling: 'touch', paddingRight: '4px'
      }
    }, sections);

    const controle = el('button', {
      class: 'bouton', type: 'button',
      'aria-label': 'Contrôle technique',
      style: { width: 'var(--touche-min)', padding: '0', fontSize: '20px', marginLeft: 'auto' }
    }, '🩺');
    controle.addEventListener('pointerdown', () => {
      anim.appui(controle);
      aller('diagnostic', { profil: profils[0] });
    });

    scene.replaceChildren(
      el('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px'
        }
      },
        fermer,
        el('h1', { class: 'titre', style: { margin: '0', fontSize: 'clamp(22px, 3vw, 32px)' } },
          'Espace parent'),
        controle
      ),
      enveloppe
    );
    anim.cascade(sections.children, { decalage: 90, depart: 60 });
  }

  return {
    element,
    apresMontage() { montrerVerrou(); }
  };
}

/* ---- Mode test -------------------------------------------------------- */

/**
 * Enchaîne toutes les activités jouables par un enfant, dans l'ordre du
 * catalogue, vingt secondes chacune, avec un bouton pour passer à la
 * suivante. Rien n'est enregistré dans le suivi : c'est une planche
 * d'essai, pas une séance.
 */
function sectionTest(profils) {
  const boutons = profils.map((p) => {
    const b = el('button', {
      class: 'bouton', type: 'button',
      style: { minHeight: '48px', padding: '0 18px', fontSize: '16px' }
    }, `▶ ${p.prenom}`);

    b.addEventListener('pointerdown', async () => {
      anim.appui(b);
      audio.son('juste');
      await aller('seance', { profil: p, dureeMinutes: 10, mode: 'test' });
    }, { once: true });

    return b;
  });

  return bloc('Mode test', [
    el('div', { class: 'carte', style: { display: 'grid', gap: '10px' } },
      el('p', { style: { margin: '0', fontSize: '14px', color: 'var(--u-texte-doux)' } },
        "Fait défiler toutes les activités de l’enfant, 20 secondes chacune. Le bouton ⏭ du bandeau passe à la suivante. Rien n’est compté dans le suivi."),
      el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } }, ...boutons)
    )
  ]);
}

/* ---- Suivi ------------------------------------------------------------ */

async function sectionSuivi(profils) {
  const cartes = [];

  for (const p of profils) {
    const sessions = await store.sessionsDe(p.id).catch(() => []);
    const activites = sessions.flatMap((s) => s.activites || []);
    const reussites = activites.reduce((s, a) => s + (a.reussites || 0), 0);
    const erreurs = activites.reduce((s, a) => s + (a.erreurs || 0), 0);
    const secondes = sessions.reduce((s, x) => s + (x.duree_reelle || 0), 0);
    const niveaux = (await store.difficultes(p.id)) || {};

    // Taux de réussite par matière, uniquement sur ce qui a été joué.
    const parType = {};
    for (const a of activites) {
      const t = parType[a.type] || (parType[a.type] = { r: 0, e: 0 });
      t.r += a.reussites || 0;
      t.e += a.erreurs || 0;
    }

    const lignes = store.TYPES_ACTIVITE.map((t) => {
      const d = parType[t];
      const total = d ? d.r + d.e : 0;
      const taux = total ? Math.round((d.r / total) * 100) : null;
      return el('div', {
        style: {
          display: 'grid', gridTemplateColumns: '1fr 54px 1fr',
          alignItems: 'center', gap: '10px', fontSize: '14px'
        }
      },
        el('span', { style: { color: 'var(--u-texte-doux)' } }, LIBELLES[t] || t),
        el('span', {
          style: {
            fontWeight: '700', textAlign: 'center',
            color: 'var(--u-accent)'
          }
        }, `n. ${niveaux[t] ?? '–'}`),
        jauge(taux)
      );
    });

    cartes.push(el('div', { class: 'carte', style: { display: 'grid', gap: '12px' } },
      el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } },
        el('div', {
          style: {
            width: '34px', height: '34px', borderRadius: '50%',
            background: p.couleur, display: 'grid', placeItems: 'center',
            fontWeight: '800', color: '#fff'
          }
        }, p.prenom[0]),
        el('strong', { style: { fontSize: '19px' } }, p.prenom),
        el('span', { style: { marginLeft: 'auto', fontSize: '14px', color: 'var(--u-texte-doux)' } },
          sessions.length
            ? `${sessions.length} séance(s) · ${Math.round(secondes / 60)} min · ${reussites} ⭐`
            : 'aucune séance pour l’instant')
      ),
      sessions.length ? el('div', { style: { display: 'grid', gap: '6px' } }, ...lignes) : null
    ));
  }

  return bloc('Suivi', cartes);
}

function jauge(taux) {
  if (taux == null) {
    return el('span', { style: { fontSize: '13px', color: 'var(--u-texte-doux)', opacity: '.6' } },
      'non joué');
  }
  return el('div', {
    style: {
      height: '10px', borderRadius: '999px', overflow: 'hidden',
      background: 'color-mix(in srgb, var(--u-texte) 12%, transparent)'
    }
  }, el('div', {
    style: {
      height: '100%', width: `${taux}%`,
      background: 'var(--u-secondaire)', borderRadius: '999px'
    }
  }));
}

/* ---- Réglages --------------------------------------------------------- */

async function sectionReglages(profils) {
  const contenus = [];

  contenus.push(await choixAmbiance());

  // Son
  const sonActif = await store.reglage('son_actif');
  contenus.push(interrupteur('Son et musique', sonActif !== false, async (v) => {
    audio.silence(!v);
    await store.definirReglage('son_actif', v);
  }));

  // Code parent
  const zoneCode = el('div', { style: { display: 'grid', gap: '10px' } });
  const changer = el('button', { class: 'bouton', type: 'button' }, 'Changer le code');
  changer.addEventListener('pointerdown', () => {
    anim.appui(changer);
    const message = el('p', { style: { fontSize: '14px', color: 'var(--u-texte-doux)', margin: '0' } },
      'Tape le nouveau code à quatre chiffres.');
    const pave = creerPave({
      longueurMax: 4,
      affichage: 'chiffres',   // visible : un code saisi à l'aveugle se perd
      validerAuto: true,
      async surValider(valeur) {
        if (valeur.length !== 4) { pave.refuser(); return; }
        await store.definirReglage('code_parent', valeur);
        audio.son('recompense');
        zoneCode.replaceChildren(el('p', {
          style: { color: 'var(--u-secondaire)', fontSize: '15px', margin: '0' }
        }, `Nouveau code enregistré : ${valeur}`), changer);
      }
    });
    zoneCode.replaceChildren(message, pave.element);
  });
  zoneCode.appendChild(changer);
  contenus.push(el('div', { class: 'carte', style: { display: 'grid', gap: '10px' } },
    el('strong', {}, 'Code parent'), zoneCode));

  // Univers débloqués, par enfant
  for (const p of profils) {
    const pastilles = [];
    for (const id of UNIVERS) {
      const m = await manifeste(id).catch(() => null);
      if (!m) continue;

      const actif = () => (p.univers_debloques || []).includes(id);
      const b = el('button', {
        type: 'button', class: 'bouton',
        style: {
          minHeight: '46px', padding: '0 14px', fontSize: '14px',
          borderColor: actif() ? 'var(--u-secondaire)' : 'transparent',
          opacity: actif() ? '1' : '.45'
        }
      }, m.nom);

      b.addEventListener('pointerdown', async () => {
        anim.appui(b);
        audio.son('touche');
        const liste = new Set(p.univers_debloques || []);
        if (liste.has(id) && liste.size > 1) liste.delete(id); else liste.add(id);
        p.univers_debloques = [...liste];
        if (!liste.has(p.univers_prefere)) p.univers_prefere = p.univers_debloques[0];
        await store.ecrire('profils', p);
        b.style.borderColor = actif() ? 'var(--u-secondaire)' : 'transparent';
        b.style.opacity = actif() ? '1' : '.45';
      });
      pastilles.push(b);
    }

    contenus.push(el('div', { class: 'carte', style: { display: 'grid', gap: '10px' } },
      el('strong', {}, `Univers de ${p.prenom}`),
      el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, ...pastilles)
    ));
  }

  return bloc('Réglages', contenus);
}

/**
 * Choix de l'ambiance globale.
 *
 * Phase d'essai : les trois pistes cohabitent pour qu'on puisse les comparer
 * sur l'iPad, en vrai, plutôt que sur une capture. Une fois la décision prise,
 * on gardera la retenue et cette section disparaîtra.
 */
async function choixAmbiance() {
  const reference = universActif() || 'mer';
  const m = await manifeste(reference).catch(() => null);
  const courante = ambianceActive();

  const cartes = AMBIANCES.map((a) => {
    const p = m ? palette(m, a.id) : {};

    const echantillon = el('div', {
      style: {
        height: '54px', borderRadius: '10px', background: p.fond || '#888',
        border: '1px solid color-mix(in srgb, var(--u-texte) 18%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px'
      }
    }, ...['primaire', 'secondaire', 'accent'].map((c) => el('div', {
      style: { width: '17px', height: '17px', borderRadius: '50%', background: p[c] || '#555' }
    })));

    const b = el('button', {
      type: 'button',
      style: {
        flex: '1 1 150px', minWidth: '140px', padding: '12px', cursor: 'pointer',
        display: 'grid', gap: '8px', textAlign: 'left',
        font: 'inherit', color: 'inherit',
        background: 'color-mix(in srgb, var(--u-carte) 55%, transparent)',
        borderRadius: '14px',
        border: `2px solid ${a.id === courante ? 'var(--u-secondaire)' : 'transparent'}`
      },
      dataset: { ambiance: a.id }
    },
      echantillon,
      el('strong', { style: { fontSize: '16px' } }, a.nom),
      el('span', { style: { fontSize: '13px', color: 'var(--u-texte-doux)' } }, a.description)
    );

    b.addEventListener('pointerdown', async () => {
      anim.appui(b);
      audio.son('tap');
      await definirAmbiance(a.id);
      await store.definirReglage('ambiance', a.id);
      for (const autre of cartes) {
        autre.style.borderColor = autre.dataset.ambiance === a.id
          ? 'var(--u-secondaire)' : 'transparent';
      }
    });

    return b;
  });

  return el('div', { class: 'carte', style: { display: 'grid', gap: '12px' } },
    el('strong', {}, 'Ambiance'),
    el('p', { style: { margin: '0', fontSize: '14px', color: 'var(--u-texte-doux)' } },
      "À l'essai : touche-les pour comparer, le changement est immédiat."),
    el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } }, ...cartes)
  );
}

function interrupteur(libelle, valeurInitiale, surChangement) {
  let valeur = valeurInitiale;
  const b = el('button', {
    class: 'bouton', type: 'button',
    style: { minHeight: '46px', padding: '0 18px' }
  }, valeur ? 'Activé' : 'Coupé');

  b.addEventListener('pointerdown', async () => {
    valeur = !valeur;
    b.textContent = valeur ? 'Activé' : 'Coupé';
    anim.appui(b);
    await surChangement(valeur);
  });

  return el('div', {
    class: 'carte',
    style: { display: 'flex', alignItems: 'center', gap: '14px' }
  }, el('strong', { style: { flex: '1' } }, libelle), b);
}

/* ---- Sauvegarde ------------------------------------------------------- */

function sectionSauvegarde() {
  const message = el('p', {
    style: { fontSize: '14px', color: 'var(--u-texte-doux)', margin: '0' }
  }, "Tout est stocké sur cet iPad. Retirer l'application de l'écran d'accueil efface l'historique : garde une copie de temps en temps.");

  const zone = el('textarea', {
    class: 'selectionnable',
    placeholder: 'Colle ici une sauvegarde pour la restaurer…',
    rows: 4,
    style: {
      width: '100%', font: 'inherit', fontSize: '13px',
      fontFamily: 'ui-monospace, Menlo, monospace',
      background: 'color-mix(in srgb, var(--u-fond) 55%, transparent)',
      color: 'var(--u-texte)', borderRadius: '12px', padding: '10px',
      border: '2px solid color-mix(in srgb, var(--u-texte) 16%, transparent)',
      resize: 'vertical'
    }
  });

  const retourUtilisateur = el('p', {
    style: { fontSize: '14px', margin: '0', minHeight: '20px', color: 'var(--u-secondaire)' }
  }, '');

  const copier = el('button', { class: 'bouton', type: 'button' }, '📋 Copier la sauvegarde');
  copier.addEventListener('pointerdown', async () => {
    anim.appui(copier);
    const texte = await store.exporterJSON();
    zone.value = texte;
    try {
      await navigator.clipboard.writeText(texte);
      retourUtilisateur.textContent = 'Copié. Colle-le dans une note ou un mail.';
    } catch {
      // Le presse-papiers est parfois refusé : le texte reste sélectionnable.
      retourUtilisateur.textContent = 'Copie refusée — sélectionne le texte ci-dessous à la main.';
    }
  });

  const restaurer = el('button', { class: 'bouton', type: 'button' }, '↩︎ Restaurer');
  restaurer.addEventListener('pointerdown', async () => {
    anim.appui(restaurer);
    try {
      await store.importerJSON(zone.value);
      audio.son('recompense');
      retourUtilisateur.textContent = 'Sauvegarde restaurée. Ferme et rouvre l’application.';
    } catch (e) {
      audio.son('presque');
      anim.nonNon(zone);
      retourUtilisateur.style.color = 'var(--u-accent)';
      retourUtilisateur.textContent = e.message;
    }
  });

  return bloc('Sauvegarde', [
    el('div', { class: 'carte', style: { display: 'grid', gap: '12px' } },
      message,
      el('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } }, copier, restaurer),
      zone,
      retourUtilisateur
    )
  ]);
}

/* ---- Habillage commun -------------------------------------------------- */

function bloc(titre, contenus) {
  return el('section', { style: { display: 'grid', gap: '10px' } },
    el('h2', {
      style: {
        fontFamily: 'var(--u-police-titre)', fontSize: '15px', letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'var(--u-texte-doux)', margin: '0'
      }
    }, titre),
    ...contenus.filter(Boolean)
  );
}
