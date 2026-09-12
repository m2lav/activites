# Les activités — lot 1 (socle)

Application web d'activités éducatives et de récréations, pour trois enfants
d'une même famille. Aucun serveur, aucun compte, aucune donnée qui sort de
l'appareil.

> **Ce dépôt ne contient aucune donnée personnelle**, et ne doit jamais en
> contenir : ni prénoms, ni âges, ni photos. Les enfants sont saisis une seule
> fois sur la tablette, à la première ouverture, et restent dessus.

## Ce qui est en place

| Brique | Fichier | Rôle |
|---|---|---|
| Coquille PWA | `index.html`, `manifest.webmanifest` | Installation sur l'écran d'accueil, plein écran, paysage |
| Hors ligne | `sw.js` | Cache local ; code « réseau d'abord », médias « cache d'abord » |
| Stockage | `src/core/store.js` | IndexedDB : profils, difficulté 1-10 par enfant et par matière, sessions, réglages, export/import JSON |
| Navigation | `src/core/router.js` | Pile d'écrans, transitions attendues avant démontage |
| Animation | `src/core/anim.js` | Glissement d'écran, arrivée en cascade, récompense, retour d'appui |
| Audio | `src/core/audio.js` | Déblocage iOS, effets synthétisés, voix fr-FR, silence global |
| Univers | `src/core/univers.js` + `assets/univers/` | Palette et typographie pilotées par manifeste JSON |

Quatre écrans : démarrage (déblocage audio), première configuration, choix du
profil, contrôle du socle. L'écran de contrôle est provisoire : il sera remplacé
par le choix de la durée au lot 2.

## Tester sur le PC

```bash
node outils/serveur.mjs
```

Puis ouvrir `http://localhost:5173`.

## Tester sur l'iPad

Le PC et l'iPad doivent être sur le même Wi-Fi. La commande ci-dessus affiche
une seconde adresse du type `http://192.168.1.xx:5173` : c'est celle-là qu'on
ouvre dans Safari sur l'iPad.

**Une limite à connaître** : en `http://`, Safari refuse d'activer le mode hors
ligne (il l'exige en `https://`). Tout le reste — son, voix, animations,
stockage, installation sur l'écran d'accueil — se teste normalement.
Le fonctionnement hors ligne ne se vérifie donc qu'une fois l'app publiée.

## Publier

Une fois le dépôt GitHub créé et les Pages activées, chaque envoi met l'app à
jour sur l'iPad, sans rien réinstaller :

```bash
git add -A && git commit -m "Mise à jour" && git push
```

## Installer sur l'iPad

Ouvrir l'adresse dans **Safari** (pas Chrome), bouton Partager →
« Sur l'écran d'accueil ». L'app s'ouvre ensuite sans barre d'URL.

## À savoir

- **Code parent par défaut : `1234`.** À changer depuis l'espace parent (lot 2).
- **Les données vivent uniquement sur l'iPad.** Retirer l'app de l'écran
  d'accueil les efface. D'où le bouton « Copier la sauvegarde » : il met tout
  l'historique dans le presse-papiers, à coller dans une note.
- **À chaque livraison**, incrémenter `VERSION` en tête de `sw.js`, sinon les
  anciens fichiers restent en cache sur l'iPad.

## Reste à faire

Lot 2 : choix de la durée, sablier, fin de session, espace parent.
Lot 3 : calcul mental complet, pavé numérique, roue de difficulté en appui long.
Lot 4 : le reste du catalogue. Lot 5 : assets définitifs et finition.
