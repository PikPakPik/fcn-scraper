# 🏈 FC Nantes Calendar Scraper

Un scraper automatisé qui récupère le calendrier des matchs du FC Nantes depuis le site de billetterie officiel et le convertit en format .ics pour un abonnement facile dans votre application de calendrier.

## 🚀 Fonctionnalités

- ⚡ Scraping automatique du calendrier FC Nantes
- 📅 Génération de fichier .ics compatible avec tous les calendriers
- 🔄 Mise à jour automatique via GitHub Actions (toutes les heures)
- 🏟️ Conversion automatique du nom "Beaujoire" en adresse complète
- 🧹 Nettoyage des doublons dans les noms de compétitions
- 📍 Support des matchs à domicile et à l'extérieur

## 📱 Abonnement au calendrier

### URL d'abonnement automatique

Une fois que vous avez pushé ce code sur GitHub, vous pouvez vous abonner au calendrier via cette URL :

```
https://raw.githubusercontent.com/[VOTRE-USERNAME]/[VOTRE-REPO]/main/calendrier-fcnantes.ics
```

**Remplacez `[VOTRE-USERNAME]` et `[VOTRE-REPO]` par vos vraies valeurs GitHub.**

### Comment s'abonner dans différentes applications

#### 📱 iPhone/iPad (Calendrier Apple)
1. Ouvrez **Réglages** > **Calendrier** > **Comptes**
2. Tapez **Ajouter un compte** > **Autre**
3. Tapez **Ajouter un calendrier CalDAV**
4. Collez l'URL du fichier .ics dans **Serveur**

#### 🖥️ Google Calendar
1. Ouvrez [Google Calendar](https://calendar.google.com)
2. À gauche, cliquez sur **+** à côté de "Autres calendriers"
3. Sélectionnez **À partir d'une URL**
4. Collez l'URL du fichier .ics

#### 💻 Outlook
1. Ouvrez Outlook
2. Accédez à **Calendrier**
3. Cliquez **Ajouter un calendrier** > **S'abonner à partir du web**
4. Collez l'URL du fichier .ics

## 🛠️ Installation locale

Si vous voulez exécuter le scraper localement :

```bash
# Cloner le repo
git clone [VOTRE-REPO-URL]
cd fcn-scraper

# Installer les dépendances
pnpm install

# Exécuter le scraper
pnpm run scrape
```

## 📋 Compétitions supportées

Le scraper récupère automatiquement tous les types de matchs :
- **Ligue 1 McDonald's**
- **UEFA Youth League**
- **Coupe de France**
- **Match Amical**
- Et autres compétitions à venir...

## ⚙️ Configuration GitHub Actions

Le workflow GitHub Actions :
- 🕗 S'exécute automatiquement toutes les heures
- 🔄 Peut être déclenché manuellement depuis l'onglet "Actions" de GitHub
- 📝 Commit automatiquement les changements s'il y en a
- 📦 Archive le fichier .ics comme artifact

## 📊 Exemple de sortie

```
🚀 Démarrage du scraping...
📱 Navigation vers la page calendrier...
📄 Récupération du contenu HTML...
🔍 Parsing des matchs...
✅ Match trouvé: NANTES vs PARIS SG - Ligue 1 McDonald's - Dim. 17 août 2025 - 20:45
✅ Match trouvé: NICE vs NANTES - Ligue 1 McDonald's - Week-end du 12, 13 & 14 septembre 2025

📋 Résumé: 2 matchs trouvés
   - 1 avec date précise
   - 1 avec date approximative

⏰ Matchs avec date à confirmer:
   - NICE vs NANTES (Week-end du 12, 13 & 14 septembre 2025)

📅 Génération du fichier ICS...
✅ Fichier ICS généré: calendrier-fcnantes.ics
📊 1 événements ajoutés au calendrier
```

## 🔧 Structure du fichier .ics

Chaque événement contient :
- **Titre** : `EQUIPE_DOMICILE vs EQUIPE_EXTERIEUR`
- **Description** : `Compétition: [NOM_COMPETITION]`
- **Lieu** : Nom du stade (ou adresse complète pour la Beaujoire)
- **Date/Heure** : Heure officielle du match
- **Durée** : 2 heures (estimation)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- 🐛 Signaler des bugs
- 💡 Proposer des améliorations
- 🔧 Soumettre des pull requests

## 📄 Licence

MIT License - Vous êtes libre d'utiliser, modifier et distribuer ce code.

---

**🔄 Dernière mise à jour automatique :** Vérifiez l'horodatage dans le fichier `calendrier-fcnantes.ics`

**⚽ Allez les Canaris ! 💛💚** 