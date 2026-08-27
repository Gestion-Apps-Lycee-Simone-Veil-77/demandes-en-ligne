# Demandes en ligne — version hors Google Apps Script

Réécriture complète de l'application (auparavant sur Google Apps Script) en dehors de Google, tout en gardant :
- **Google Sheets** comme base de données (la même feuille que vous utilisez déjà),
- **Google Drive** pour les pièces jointes et les PDF générés,
- **les adresses email de l'établissement** pour identifier les gens (connexion Google restreinte à votre domaine),
- **l'envoi d'emails** de confirmation et de décision.

Le principal bénéfice recherché : plus de navigation quasi instantanée entre les pages (une vraie application web, pas de rechargement complet à chaque clic comme avec Apps Script), un import/déploiement piloté par un vrai dépôt de code (Git/GitHub), et un stockage des données géré directement (plus de conversion automatique surprise d'une case "09:50" en heure, par exemple — un bug qu'on a mis du temps à trouver côté Apps Script).

**Différence importante par rapport à ce même chantier sur Suivi Heures Supp** : ce projet a en plus besoin d'**écrire** sur Drive (pièces jointes, documents générés) — pas seulement lire le logo — et de **générer un PDF** côté serveur (document de sortie pédagogique validée), via Chromium headless (Puppeteer). Ça ajoute une étape 4 bis (droits d'écriture) et une note sur les ressources du plan gratuit Render (voir section 13).

**⚠️ Important** : ce guide suppose que vous n'avez jamais fait ça. Suivez les étapes dans l'ordre, une par une. Ça prend du temps (compter une bonne heure la première fois), mais chaque étape est autonome — si vous bloquez sur l'une d'elles, dites-le-moi, avec laquelle et où exactement.

---

## Sommaire

1. [Ce dont vous avez besoin](#1-ce-dont-vous-avez-besoin)
2. [Créer le projet Google Cloud](#2-créer-le-projet-google-cloud)
3. [Créer le compte de service (accès à Sheets et Drive)](#3-créer-le-compte-de-service-accès-à-sheets-et-drive)
4. [Autoriser l'envoi de mails au nom de l'établissement](#4-autoriser-lenvoi-de-mails-au-nom-de-létablissement)
5. [Créer l'identifiant de connexion (Google Sign-In)](#5-créer-lidentifiant-de-connexion-google-sign-in)
6. [Préparer la feuille Google Sheets](#6-préparer-la-feuille-google-sheets)
7. [Préparer le dossier Drive et le logo](#7-préparer-le-dossier-drive-et-le-logo)
8. [Récupérer le projet et l'installer en local](#8-récupérer-le-projet-et-linstaller-en-local)
9. [Configurer les variables d'environnement](#9-configurer-les-variables-denvironnement)
10. [Premier lancement en local](#10-premier-lancement-en-local)
11. [Mettre le projet sur GitHub](#11-mettre-le-projet-sur-github)
12. [Déployer en ligne (Render)](#12-déployer-en-ligne-render)
13. [Ce qui diffère de la version Apps Script](#13-ce-qui-diffère-de-la-version-apps-script)
14. [Maintenance courante](#14-maintenance-courante)

---

## 1. Ce dont vous avez besoin

- **Node.js** installé sur votre ordinateur (version 20 ou plus). [nodejs.org](https://nodejs.org) (bouton "LTS"). Vérifiez :
  ```bash
  node --version
  ```
- Un compte **GitHub** (gratuit) — [github.com](https://github.com).
- Un compte sur **[Render](https://render.com)** (gratuit pour démarrer).

---

## 2. Créer le projet Google Cloud

1. [console.cloud.google.com](https://console.cloud.google.com), connectez-vous avec votre compte @établissement.
2. Sélecteur de projet → **Nouveau projet**. Nom : `Demandes en ligne`. **Créer**, puis sélectionnez-le.
3. Menu ☰ → **APIs et services** → **Bibliothèque**. Activez ces 3 API :
   - **Google Sheets API**
   - **Google Drive API**
   - **Gmail API**

---

## 3. Créer le compte de service (accès à Sheets et Drive)

1. Menu ☰ → **APIs et services** → **Identifiants** → **Créer des identifiants** → **Compte de service**.
2. Nom : `demandes-backend`. **Créer et continuer** → **Continuer** → **OK**.
3. Cliquez sur le compte créé → onglet **Clés** → **Ajouter une clé** → **Créer une clé** → **JSON** → **Créer**.

   > ⚠️ **Si un écran "Gérer les règles d'administration" apparaît au lieu de télécharger la clé** (ou un message bloquant la création) : les organisations Google Workspace appliquent par défaut une règle de sécurité qui interdit la création de clés JSON pour les comptes de service (règle `iam.disableServiceAccountKeyCreation`). Pour l'autoriser sur ce projet uniquement :
   > 1. Allez dans **IAM et administration** → **Règles d'administration** (ou cliquez sur le lien affiché dans le message).
   > 2. Cherchez **"Désactiver la création de clés de compte de service"** et cliquez dessus.
   > 3. En haut, vérifiez que le sélecteur de ressource pointe bien sur **ce projet précis** (pas toute l'organisation, pour ne pas affaiblir la sécurité ailleurs).
   > 4. **Gérer la règle** → **Remplacer la règle du parent** → ajoutez une règle **Appliquée : Non** → **Définir la règle**.
   > 5. Revenez à l'étape 3 ci-dessus et recréez la clé (patientez une ou deux minutes si ça ne fonctionne pas immédiatement).
   >
   > Il faut un compte avec le rôle **Administrateur des règles d'administration** au niveau de l'organisation pour faire ça — si ce n'est pas votre cas, demandez à la personne qui administre votre Google Workspace.

4. Renommez le fichier téléchargé `service-account.json`, gardez-le de côté (étape 8). **Ne le partagez jamais publiquement.**
5. Notez son **adresse email** (`demandes-backend@votre-projet.iam.gserviceaccount.com`) — utile aux étapes 6 et 7.

---

## 4. Autoriser l'envoi de mails au nom de l'établissement

Nécessite un accès **administrateur Workspace**.

1. Page du compte de service → notez son **ID unique** (chiffres, différent de l'email).
2. [admin.google.com](https://admin.google.com) → **Sécurité** → **Accès aux données et contrôle** → **Contrôles des API** → **Délégation à l'échelle du domaine**.
3. **Ajouter un nouveau** : ID client = l'ID unique noté, champ d'application = `https://www.googleapis.com/auth/gmail.send`. **Autoriser**.
4. Choisissez/créez l'adresse qui enverra les mails (ex : `demandes@votre-établissement.fr`) → `GMAIL_SENDER_ADDRESS` à l'étape 9.

---

## 5. Créer l'identifiant de connexion (Google Sign-In)

1. Menu ☰ → **APIs et services** → **Écran de consentement OAuth**. Type : **Interne** si proposé. Nom de l'app, email de contact. Enregistrer.
2. Menu ☰ → **Identifiants** → **Créer des identifiants** → **ID client OAuth**. Type : **Application Web**. Nom : `Demandes en ligne - Web`.
3. **Origines JavaScript autorisées** : `http://localhost:5173` et votre future URL Render (vous complèterez après l'étape 12).
4. **Créer**. Copiez le **Client ID** — utile à l'étape 9 (deux fois).

---

## 6. Préparer la feuille Google Sheets

Réutilisez votre feuille actuelle (celle configurée dans `SPREADSHEET_ID` côté Apps Script).

1. Ouvrez-la, bouton **Partager**.
2. Ajoutez l'**adresse email du compte de service** (étape 3.5), rôle **Éditeur**.
3. Copiez l'**ID de la feuille** dans son URL (entre `/d/` et `/edit`).

---

## 7. Préparer le Drive partagé et le logo

> ⚠️ **Il faut un Drive partagé ("Shared Drive"), pas un simple dossier de votre Drive personnel.** Depuis 2021, Google interdit à un compte de service de déposer des fichiers dans un dossier classique d'un Drive personnel, même partagé en rôle Éditeur (erreur *"Service Accounts do not have storage quota"*). Un Drive partagé n'appartient à aucun utilisateur individuel — c'est justement fait pour ce genre d'usage.

1. Sur [drive.google.com](https://drive.google.com), menu de gauche → **Drives partagés** → **Nouveau**. Nommez-le (ex : `Demandes en ligne - pièces jointes`).

   *(Si l'option "Drives partagés" n'apparaît pas ou que la création est bloquée, c'est une restriction posée par l'administrateur Workspace au niveau de l'organisation — voir Admin Console → Applications → Google Drive et Docs → Paramètres de partage → Création de Drive partagé, ou demandez à votre administrateur.)*

2. Dans ce Drive partagé → **Gérer les membres** → ajoutez l'**adresse email du compte de service** (étape 3.5), rôle **Gestionnaire de contenu** (Content Manager) — c'est l'équivalent d'Éditeur pour un Drive partagé.
3. Notez l'**ID du Drive partagé** dans l'URL (`https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXXXXXX` — la même chose qu'un ID de dossier classique), c'est lui qui va dans `DRIVE_FOLDER_ID`. Vous pouvez éventuellement créer un sous-dossier à l'intérieur du Drive partagé et utiliser son ID à la place, si vous voulez garder cet espace pour autre chose.
4. Si vous utilisez un logo (fichier Drive) : partagez-le aussi avec le compte de service, rôle **Lecteur** suffit (un logo existant, hors Drive partagé, reste lisible normalement — seule la *création* de fichiers pose problème).

---

## 8. Récupérer le projet et l'installer en local

1. Placez `service-account.json` (étape 3) à la racine de ce dossier (`DemandesDepenses-HorsGoogle/service-account.json`).
2. Terminal à la racine du projet :
   ```bash
   npm install
   ```
   (installe aussi Puppeteer, qui télécharge Chromium — ça peut prendre une minute ou deux la première fois)
3. Puis le frontend :
   ```bash
   cd client
   npm install
   cd ..
   ```

---

## 9. Configurer les variables d'environnement

1. À la racine : copiez `.env.example` en `.env` et remplissez avec ce qui a été noté aux étapes précédentes (`GOOGLE_SERVICE_ACCOUNT_KEY_FILE`, `GOOGLE_OAUTH_CLIENT_ID`, `ALLOWED_WORKSPACE_DOMAIN`, `SPREADSHEET_ID`, `DRIVE_FOLDER_ID`, `GMAIL_SENDER_ADDRESS`, `LOGO_FILE_ID`).
2. Dans `client/` : copiez `client/.env.example` en `client/.env`, renseignez `VITE_GOOGLE_OAUTH_CLIENT_ID` (même Client ID qu'à l'étape 9.1).
3. **Uniquement pour tester en local** : ajoutez `APP_PUBLIC_URL=http://localhost:5173` dans le `.env` de la racine (celui de l'étape 9.1, pas celui de `client/`). Sans cette variable, les liens "Traiter la demande" dans les mails pointent vers `http://localhost:3000` (l'API Express) au lieu de `http://localhost:5173` (l'interface Vite) — et donnent une erreur serveur au clic, puisque `:3000` ne sert pas de page React en dev. **En production (Render), ne mettez pas cette variable** : l'URL publique est déduite automatiquement de la requête.

---

## 10. Premier lancement en local

1. Créez les onglets manquants sur votre feuille :
   ```bash
   npm run setup
   ```
   N'écrase rien d'existant. Crée `Demandes`, `Demandes_Remboursement`, `Demandes_Salle`, `Demandes_Sortie`, `ConfigPersonnel`, `ConfigTypeDepense`, `ConfigDestinataires`, `Compteurs`.
2. Remplissez à la main :
   - `ConfigPersonnel` (Email / Nom / Prenom, à partir de la ligne 2),
   - `ConfigTypeDepense` (une colonne, la liste déroulante du formulaire Dépense),
   - `ConfigDestinataires` (colonnes Cle / Valeur : `intendance`, `gestionnaire`, `secretariat`, `directeur` — la dernière est **la seule adresse autorisée à traiter les décisions**, à renseigner avec l'adresse exacte du compte Workspace du proviseur).
3. Lancez le serveur (premier terminal, à la racine) :
   ```bash
   npm run dev
   ```
4. Lancez le frontend (second terminal, dans `client/`) :
   ```bash
   cd client
   npm run dev
   ```
5. Ouvrez `http://localhost:5173`.

---

## 11. Mettre le projet sur GitHub

1. [github.com](https://github.com) → **New repository**. Nom : `demandes-depenses` (privé). **Create repository**.
2. Terminal, à la racine :
   ```bash
   git init
   git add .
   git commit -m "Version initiale"
   git branch -M main
   git remote add origin https://github.com/VOTRE-COMPTE/demandes-depenses.git
   git push -u origin main
   ```

**Vérifiez** que `service-account.json` et les `.env` ne partent pas sur GitHub (`git status` avant le premier commit).

---

## 12. Déployer en ligne (Render)

1. [render.com](https://render.com), connectez-vous via GitHub.
2. **New** → **Web Service**. Connectez le dépôt `demandes-depenses`.
3. Renseignez :
   - **Name** : `demandes-depenses`
   - **Region** : Frankfurt
   - **Build Command** : `npm install && cd client && npm install && npm run build && cd ..`
   - **Start Command** : `node server/index.js`
   - **Instance Type** : Free pour démarrer (voir note ci-dessous sur Puppeteer)
4. **Environment Variables** : toutes les variables de votre `.env` racine, **sauf** `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` **et sauf `APP_PUBLIC_URL`** si vous l'aviez ajoutée pour tester en local (étape 9.3) — sur Render, l'URL publique doit être déduite automatiquement de la requête, pas fixée sur `localhost`. Ajoutez aussi `VITE_GOOGLE_OAUTH_CLIENT_ID` (le build du frontend en a besoin).
5. **Secret Files** (réglages avancés) : fichier `service-account.json`, contenu = tout le JSON local.
6. Remettez `GOOGLE_SERVICE_ACCOUNT_KEY_FILE=service-account.json` dans les variables d'environnement.
7. **Create Web Service**. Une URL type `https://demandes-depenses.onrender.com` vous est attribuée.
8. Google Cloud Console → votre identifiant OAuth → ajoutez cette URL dans **Origines JavaScript autorisées**.
9. Redéployez (**Manual Deploy** → **Deploy latest commit**).

**Note sur le plan gratuit Render** : le service s'endort après 15 min d'inactivité (quelques secondes pour se réveiller). Puppeteer (génération du PDF de sortie) est plus gourmand en mémoire que le reste de l'appli — le plan gratuit (512 Mo) suffit normalement pour un usage occasionnel, mais si la génération du PDF échoue ou est lente en pratique, passez à l'instance payante la plus basique (~7$/mois) ; dites-le-moi si besoin d'ajuster.

---

## 13. Ce qui diffère de la version Apps Script

- **Rôle "directeur"** : une seule adresse (dans `ConfigDestinataires`), pas une liste d'admins — comme côté Apps Script.
- **Numérotation, workflow, contenu des emails** : identiques (même préfixes DEP-/REMB-/SALLE-/SORTIE-, mêmes destinataires par type, même logique Précision/2ᵉ clic de confirmation).
- **Stockage des pièces jointes** : upload direct vers Drive via l'API (plus besoin que le fichier passe par le navigateur → Apps Script → Drive), partagé automatiquement en lecture avec votre domaine.
- **PDF de sortie pédagogique** : généré par Chromium headless (Puppeteer) à partir du même gabarit HTML que la version Apps Script, au lieu de `Utilities.newBlob().getAs('pdf')`.
- **Conversion automatique des heures en Date** : ce bug (une case "09:50" réinterprétée par Sheets et cassant l'affichage) ne peut plus se produire — les écritures se font en mode texte brut (`RAW`), jamais en mode "comme si tapé dans l'interface".

---

## 14. Maintenance courante

- **Modifier le code** : je vous donnerai les fichiers à changer ; `git add . && git commit -m "..." && git push` — Render redéploie automatiquement à chaque push sur `main`.
- **Ajouter un personnel autorisé à soumettre des demandes** : onglet `ConfigPersonnel`, aucune action technique.
- **Changer le proviseur / l'intendance / etc.** : onglet `ConfigDestinataires`, effet immédiat (pas de cache).
- **Voir les erreurs serveur** : sur Render, onglet **Logs** du service.
