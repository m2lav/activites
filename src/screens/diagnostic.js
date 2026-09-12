/* =========================================================================
   Écran de contrôle du socle (lot 1 uniquement).

   Il existe pour être ouvert sur l'iPad réel et répondre en un coup d'œil :
   l'app est-elle bien installée, le son est-il débloqué, la voix française
   est-elle là, les données tiennent-elles, les marges d'encoche sont-elles
   respectées. Il sera remplacé par le choix de la durée au lot 2.
   ========================================================================= */

import { el } from '../ui/dom.js';
import * as store from '../core/store.js';
import * as audio from '../core/audio.js';
import * as anim from '../core/anim.js';
import { retour } from '../core/router.js';

export async function creer({ profil }) {
  const controles = await verifier(profil);

  const lignes = controles.map(({ libelle, ok, detail }) => el('div', {
    class: 'carte',
    style: {
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 18px', borderRadius: '16px'
    }
  },
    el('span', { style: { fontSize: '22px' } }, ok ? '✅' : '⚠️'),
    el('div', { style: { flex: '1', minWidth: '0' } },
      el('div', { style: { fontWeight: '700' } }, libelle),
      detail && el('div', {
        style: { fontSize: '14px', color: 'var(--u-texte-doux)' }
      }, detail)
    )
  ));

  const liste = el('div', {
    class: 'cascade',
    style: {
      display: 'grid', gap: '10px', flex: '1',
      overflowY: 'auto', alignContent: 'start', paddingRight: '4px'
    }
  }, ...lignes);

  const message = el('div', {
    style: { fontSize: '15px', color: 'var(--u-texte-doux)', minHeight: '22px' }
  }, '');

  const barre = el('div', {
    style: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }
  },
    bouton('🔈 Une consigne', async () => {
      message.textContent = 'Lecture…';
      await audio.parler(`Bonjour ${profil.prenom} ! Écoute bien la consigne, puis touche la bonne réponse.`);
      message.textContent = '';
    }),
    bouton('🎉 Récompense', (b) => { audio.son('recompense'); anim.recompense(b); }),
    bouton('📋 Copier la sauvegarde', async () => {
      try {
        await navigator.clipboard.writeText(await store.exporterJSON());
        message.textContent = 'Sauvegarde copiée dans le presse-papiers.';
      } catch {
        message.textContent = 'Copie refusée par le navigateur.';
      }
    }),
    bouton('← Retour', () => retour())
  );

  const element = el('div', { class: 'ecran' },
    el('h1', { class: 'titre', style: { fontSize: 'clamp(24px, 3.4vw, 38px)' } },
      `Socle — ${profil.prenom}`),
    el('p', { class: 'sous-titre', style: { marginBottom: '18px' } },
      'Vérification de l’installation sur cet appareil'),
    liste, message, barre
  );

  return {
    element,
    apresMontage() { anim.cascade(liste.children, { decalage: 55, depart: 60 }); }
  };
}

function bouton(texte, action) {
  const b = el('button', { class: 'bouton', type: 'button' }, texte);
  b.addEventListener('pointerdown', () => { anim.appui(b); audio.son('touche'); action(b); });
  return b;
}

async function verifier(profil) {
  const c = [];

  const installe = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  c.push({
    libelle: installe ? 'Application installée' : 'Ouverte dans Safari',
    ok: installe,
    detail: installe
      ? 'Mode plein écran, sans barre d’URL.'
      : 'Partager → « Sur l’écran d’accueil » pour installer.'
  });

  const sw = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  c.push({
    libelle: sw ? 'Fonctionne hors ligne' : 'Hors ligne pas encore prêt',
    ok: sw,
    detail: sw ? 'Les fichiers sont en cache local.' : 'Recharger une fois la page.'
  });

  let memoire = false, detailMemoire = '';
  try {
    await store.definirReglage('_test', Date.now());
    memoire = (await store.reglage('_test')) != null;
    const sessions = await store.sessionsDe(profil.id);
    const d = await store.difficultes(profil.id);
    detailMemoire = `${sessions.length} session(s) · calcul mental niveau ${d?.calcul_mental ?? '?'}`;
  } catch (e) {
    detailMemoire = String(e.message || e);
  }
  c.push({ libelle: 'Mémoire locale (IndexedDB)', ok: memoire, detail: detailMemoire });

  c.push({
    libelle: audio.estDebloque() ? 'Son débloqué' : 'Son bloqué',
    ok: audio.estDebloque(),
    detail: audio.estActif() ? 'Son actif.' : 'Silence activé.'
  });

  const v = audio.voixDisponible();
  c.push({
    libelle: v ? 'Voix française disponible' : 'Aucune voix française',
    ok: !!v,
    detail: v ? `${v.name} (${v.lang})` : 'Réglages iOS → Accessibilité → Contenu énoncé.'
  });

  const paysage = window.innerWidth > window.innerHeight;
  c.push({
    libelle: paysage ? 'Orientation paysage' : 'Orientation portrait',
    ok: paysage,
    detail: `${window.innerWidth} × ${window.innerHeight} px · densité ${window.devicePixelRatio}`
  });

  const s = getComputedStyle(document.documentElement);
  c.push({
    libelle: 'Marges de sécurité',
    ok: true,
    detail: `haut ${s.getPropertyValue('--marge-haut').trim()} · côtés ${s.getPropertyValue('--marge-h').trim()}`
  });

  return c;
}
