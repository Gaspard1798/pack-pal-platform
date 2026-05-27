
# ChantierFlow — Plateforme logistique de chantier

Application web pour planifier et coordonner les livraisons/extractions sur chantier, en évitant les conflits d'aires et de matériel.

## Rôles utilisateurs (V1)

- **Conducteur de travaux / Responsable logistique** : crée le chantier, configure aires + matériel, valide/refuse/modifie les demandes, gère les imprévus, consulte les comptes-rendus.
- **Prestataire** (transporteur, fournisseur) : consulte les chantiers partagés, fait des demandes de créneaux, suit leurs statuts.
- **Opérateur terrain** : check-in à l'arrivée du camion, déclare non-conformités, clôture la venue.
- **Administrateur** : gestion globale des utilisateurs et chantiers.

## Modules V1

1. **Auth + invitations** (email/mot de passe via Lovable Cloud) — rôles stockés dans `user_roles`.
2. **Chantiers** : création, paramétrage des aires de livraison et du matériel disponible.
3. **Demandes de créneaux** : formulaire prestataire (date/heure, aire, nature, quantité, matériel, durée).
4. **Planning** : vue calendrier/timeline par jour avec swimlanes Aires + Matériel ; détection visuelle des conflits.
5. **Workflow de statuts** : `en cours` → `acceptée` / `refusée` / `modifiée` → `terminée` (+ commentaires).
6. **Vue terrain** : check-in arrivée, non-conformité (retard, erreur, manquant), photos optionnelles.
7. **Dashboard** par rôle avec KPIs (demandes en attente, conflits, retards).

## Architecture technique

- **Frontend** : TanStack Start (déjà en place), Tailwind, shadcn/ui, sidebar par rôle.
- **Backend** : Lovable Cloud (Postgres + RLS + Auth).
- **Tables principales** :
  ```
  profiles, user_roles
  chantiers, chantier_members (rattachement prestataires)
  aires (chantier_id, nom, capacité)
  materiels (chantier_id, nom, type, quantité)
  demandes (chantier_id, prestataire_id, aire_id, début, fin, statut, nature, quantité, durée_min)
  demande_materiels (demande_id, materiel_id)
  venues (demande_id, arrivée_réelle, départ_réel, non_conformités[], commentaire)
  ```
- **RLS** : prestataires voient leurs demandes + chantiers partagés ; conducteurs voient tout sur leurs chantiers.
- **Détection de conflits** : fonction SQL qui vérifie les overlaps sur aires/matériels à la validation.

## Design

Direction visuelle "chantier pro" : palette neutre + accent orange sécurité, typographie sans-serif technique (Inter/Space Grotesk), composants denses orientés data (tableaux, timelines, badges de statut colorés). Layout sidebar + header avec switch de chantier actif.

## Livraison par étapes

**Étape 1 (cette itération)** : design system + auth + structure des routes + tables de base + dashboard vide par rôle.
**Étape 2** : CRUD chantiers, aires, matériel.
**Étape 3** : formulaire demande prestataire + liste/filtres + workflow statuts.
**Étape 4** : vue planning avec détection de conflits.
**Étape 5** : vue terrain + non-conformités + KPIs.

## Questions ouvertes

- Confirmez-vous le périmètre V1 (étape 1) pour démarrer ?
- Préférez-vous Sign in with Google en plus de l'email/mot de passe ?
- Une charte graphique imposée (couleurs/logo Gaspard Penchenat) ou je propose une direction ?
