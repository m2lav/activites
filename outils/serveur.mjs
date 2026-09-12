/* =========================================================================
   Petit serveur local, sans aucune dépendance.

     node outils/serveur.mjs

   Il affiche l'adresse à ouvrir sur l'iPad, à condition que l'iPad et le PC
   soient sur le même réseau Wi-Fi. C'est le moyen le plus rapide de tester
   avant de publier.
   ========================================================================= */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2'
};

http.createServer((req, rep) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let fichier = path.join(RACINE, url === '/' ? 'index.html' : url);

  // On ne sert jamais hors du dossier du projet.
  if (!fichier.startsWith(RACINE)) { rep.writeHead(403).end('Interdit'); return; }
  if (fs.existsSync(fichier) && fs.statSync(fichier).isDirectory()) {
    fichier = path.join(fichier, 'index.html');
  }
  if (!fs.existsSync(fichier)) { rep.writeHead(404).end('Introuvable'); return; }

  rep.writeHead(200, {
    'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream',
    // Pas de cache navigateur en développement : on veut voir ses modifications.
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(fichier).pipe(rep);
}).listen(PORT, () => {
  const adresses = Object.values(os.networkInterfaces()).flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);

  console.log(`\n  Sur ce PC     http://localhost:${PORT}`);
  for (const a of adresses) console.log(`  Sur l'iPad    http://${a}:${PORT}`);
  console.log('\n  Ctrl+C pour arrêter.\n');
});
