# DAYOUT

> Trouver quoi faire quand on ne sait pas quoi faire, sans dépasser son budget.

DAYOUT est une application web qui compose automatiquement une **sortie à Paris** à partir de quelques contraintes : budget maximum, temps disponible, centres d'intérêt, arrondissement de départ et contexte (seul, en couple ou entre amis).

L'objectif n'est pas d'afficher un catalogue de lieux, mais de proposer un **parcours cohérent en plusieurs étapes**, proches les unes des autres, avec un coût total estimé qui ne dépasse jamais le budget indiqué.

> ⚠️ **Données de démonstration.** Les lieux, prix et durées du catalogue actuel sont **fictifs**. Ils servent uniquement à faire fonctionner et à tester l'application.

## État du projet

| Étape | Contenu | Statut |
|---|---|---|
| 1 | Base du projet, modèle de données, catalogue de démonstration validé et testé | ✅ Terminé |
| 2 | Moteur de génération des sorties (fonction pure et testée) | ⏳ À venir |
| 3 | Interface : page d'accueil, formulaire, page de résultats, responsive | ⏳ À venir |
| 4 | Finitions de la V1 : accessibilité, cas limites, mise en ligne | ⏳ À venir |

## Stack technique

| Outil | Rôle | Pourquoi ce choix |
|---|---|---|
| HTML, CSS, JavaScript (modules ES) | Interface et logique | Pas de framework en V1 : l'essentiel du projet est l'algorithme, et le JavaScript moderne suffit pour une interface d'une page |
| [Vite](https://vite.dev) 8 | Serveur de développement et compilation | Rechargement automatique et production d'une version optimisée ; ce n'est pas un framework |
| JSON | Catalogue d'activités | Simple à modifier ; l'accès aux données est isolé dans un seul module pour passer plus tard à une API |
| `node:test` | Tests automatisés | Intégré à Node.js, aucune dépendance supplémentaire |

Évolution prévue : une **API Node.js + Express** avec une base **SQLite** (V2), qui réutilisera le même moteur de génération sans réécriture.

## Prérequis

- [Node.js](https://nodejs.org) **22.12 ou plus récent** (version LTS recommandée)
- npm (installé avec Node.js)

## Installation et lancement

```bash
# 1. Installer les dépendances (une seule fois, ou après chaque modification de package.json)
npm install

# 2. Lancer le serveur de développement
npm run dev
```

Ouvrir ensuite l'adresse affichée dans le terminal (par défaut http://localhost:5173).

> Ouvrir directement `index.html` en double-cliquant ne fonctionne pas : les navigateurs bloquent le chargement des modules et du JSON depuis un fichier local (`file://`). Il faut passer par le serveur de développement.

### Autres commandes

| Commande | Effet |
|---|---|
| `npm test` | Lance les tests automatisés |
| `npm run build` | Produit la version optimisée dans `dist/` |
| `npm run preview` | Sert localement la version de `dist/` pour la vérifier |

## Structure du projet

```text
.
├── index.html                    Page unique de l'application
├── public/
│   └── data/
│       └── activities.json       Catalogue d'activités (démonstration)
├── src/
│   ├── main.js                   Point d'entrée : relie les données et l'interface
│   ├── config/
│   │   ├── categories.js         Catégories, types de coût, publics (codes et libellés)
│   │   └── paris.js              Centres des arrondissements, limites de Paris
│   └── data/
│       ├── activitySchema.js     Validation d'une activité et du catalogue
│       └── activityRepository.js Chargement des activités (seul module qui connaît la source)
└── tests/                        Tests automatisés (node:test)
```

Les dossiers `src/engine/` (générateur), `src/ui/` (interface) et `src/styles/` seront ajoutés aux étapes suivantes.

## Modèle de données

Chaque activité du fichier `public/data/activities.json` suit ce format :

```json
{
  "id": "gaming-001",
  "name": "Pixel Zone",
  "category": "gaming",
  "description": "Salle d'arcade avec bornes rétro et jeux de rythme.",
  "cost": { "type": "consumption", "min_eur": 5, "max_eur": 12 },
  "duration_minutes": { "min": 60, "max": 90 },
  "location": { "arrondissement": 11, "address": null, "latitude": 48.857, "longitude": 2.381 },
  "suitable_for": ["solo", "couple", "friends"],
  "is_fictional": true
}
```

| Champ | Obligatoire | Valeurs |
|---|---|---|
| `id` | oui | minuscules, chiffres et tirets, unique |
| `category` | oui | `food`, `thrift`, `gaming`, `culture`, `sport`, `cinema`, `shows`, `nature` |
| `cost.type` | oui | `free`, `ticket`, `consumption`, `mixed` |
| `cost.min_eur` / `cost.max_eur` | oui | nombres positifs, ou tous deux `null` si le prix est inconnu |
| `duration_minutes.min` / `.max` | oui | entiers en minutes |
| `location.arrondissement` | oui | 1 à 20 |
| `location.latitude` / `.longitude` | oui | coordonnées situées dans Paris |
| `location.address` | non | texte ou `null` |
| `suitable_for` | oui | au moins un parmi `solo`, `couple`, `friends` |
| `is_fictional` | oui | `true` pour les données de démonstration |
| `image_url`, `info_url` | non | URL `https://` uniquement |

**Conventions :**
- les **codes** (catégories, types, publics) sont en anglais, et leurs **libellés français** se trouvent dans `src/config/categories.js` ;
- **`null` signifie « inconnu »** : on n'invente jamais une valeur.

### Ajouter une activité

1. Ajouter un objet dans `public/data/activities.json` en respectant le format ci-dessus.
2. Lancer `npm test` : le test du catalogue signale toute erreur (champ manquant, prix incohérent, coordonnées hors de Paris, id en double…).

Une activité invalide n'empêche pas le site de fonctionner : elle est ignorée, et un avertissement apparaît dans la console du navigateur.

## Règles prévues pour le générateur

- **Budget : contrainte stricte.** La somme des prix hauts (`max_eur`) et des éventuels tickets de métro ne dépasse jamais le budget par personne.
- **Temps.** La somme des durées minimales et des trajets estimés tient dans le temps disponible.
- **Prix inconnu.** L'activité est exclue, car le budget ne pourrait pas être garanti.
- **Localisation.** L'arrondissement choisi est privilégié. Si les activités y sont trop peu nombreuses, la recherche s'élargit aux secteurs voisins, et l'interface le signale.
- **Proximité.** Les étapes sont ordonnées pour limiter les déplacements, estimés à partir des coordonnées (à vol d'oiseau, avec un coefficient de détour).
- **Ordre logique.** Le repas est de préférence placé dans les dernières étapes, sans que ce soit obligatoire.
- **Variété.** Le générateur évite les doublons et propose une autre combinaison à chaque nouvelle génération.

## Sécurité

Mesures déjà en place :

- **Validation par liste blanche** de chaque activité chargée : types, plages de valeurs, codes autorisés. Seuls les champs connus sont conservés.
- **URL limitées à `https://`**, pour éviter qu'un lien `javascript:` exécute du code au clic (XSS).
- **Affichage par `textContent`**, jamais par `innerHTML` avec des données : le texte n'est jamais interprété comme du HTML.
- **Erreurs séparées** : un message clair pour l'utilisateur, et le détail technique uniquement dans la console.
- **Aucun secret** dans le code front ; les fichiers `.env` sont exclus du dépôt.
- **Dépendances** : une seule (Vite), en version fixée, avec un `package-lock.json` versionné.

## Limites connues

- Données fictives ; aucune information (prix, horaires, adresse) n'est vérifiée.
- Pas de gestion des horaires d'ouverture : il faut vérifier qu'un lieu est ouvert avant de s'y rendre.
- Temps de trajet estimés à vol d'oiseau, sans calcul d'itinéraire réel.

## Feuille de route après la V1

- **V2 :** API Node.js + Express, base SQLite (requêtes paramétrées), validation côté serveur.
- **V3 :** favoris, partage d'une sortie, carte interactive, temps de trajet réels, météo, éventuellement TypeScript.
