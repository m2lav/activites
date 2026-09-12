/* =========================================================================
   Service worker — fonctionnement hors ligne.

   Deux stratégies volontairement différentes :

   - Le code (HTML / JS / CSS / JSON) est servi « réseau d'abord ».
     Quand l'iPad a du réseau, il prend toujours la dernière version : une
     correction déployée arrive sans manipulation. Hors ligne, il retombe
     sur le cache.

   - Les médias (images, sons, polices) sont servis « cache d'abord ».
     Ils ne changent jamais sans changer de nom de fichier, et c'est ce qui
     rend le démarrage instantané.

   VERSION : à incrémenter à chaque livraison. Changer ce numéro suffit à
   purger proprement les anciens caches.
   ========================================================================= */

const VERSION = 'v3';
const CACHE = `activites-${VERSION}`;

const SOCLE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles/base.css',
  './styles/transitions.css',
  './src/main.js',
  './src/core/router.js',
  './src/core/store.js',
  './src/core/audio.js',
  './src/core/anim.js',
  './src/core/univers.js',
  './src/core/session.js',
  './src/screens/demarrage.js',
  './src/screens/configuration.js',
  './src/screens/accueil.js',
  './src/screens/duree.js',
  './src/screens/seance.js',
  './src/screens/fin-seance.js',
  './src/screens/parent.js',
  './src/screens/diagnostic.js',
  './src/ui/dom.js',
  './src/ui/erreur.js',
  './src/ui/bandeau.js',
  './src/ui/controles.js',
  './src/ui/sablier.js',
  './src/ui/pave-numerique.js',
  './src/activities/index.js',
  './src/activities/etoiles.js',
  './assets/univers/mer/manifest.json',
  './assets/univers/pompiers/manifest.json',
  './assets/univers/chateau/manifest.json',
  './assets/univers/dinosaures/manifest.json',
  './assets/univers/louveteaux/manifest.json',
  './assets/icons/icone-180.png',
  './assets/icons/icone-192.png',
  './assets/icons/icone-512.png'
];

const MEDIA = /\.(png|jpg|jpeg|webp|svg|mp3|m4a|ogg|wav|woff2?)$/i;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // addAll échoue en bloc si un seul fichier manque : on tolère les absents.
    await Promise.all(SOCLE.map((u) => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (MEDIA.test(url.pathname)) {
    e.respondWith(cacheDabord(req));
  } else {
    e.respondWith(reseauDabord(req));
  }
});

async function cacheDabord(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const rep = await fetch(req);
  if (rep.ok) cache.put(req, rep.clone());
  return rep;
}

async function reseauDabord(req) {
  const cache = await caches.open(CACHE);
  try {
    const rep = await fetch(req);
    if (rep.ok) cache.put(req, rep.clone());
    return rep;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    // Navigation hors ligne vers une URL non mise en cache : on rend l'app.
    if (req.mode === 'navigate') {
      const index = await cache.match('./index.html');
      if (index) return index;
    }
    throw err;
  }
}
