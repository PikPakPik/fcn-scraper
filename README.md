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

# Vérifier les types
pnpm typecheck
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
- 📝 Commit automatiquement le .ics seulement si un match a changé

## 📊 Exemple de sortie

```
🚀 Scraping du calendrier FC Nantes...
✅ NANTES vs DUNKERQUE - Ligue 2 BKT • Journée 9 - 2026-10-17T12:00:00.000Z
⏳ NICE vs NANTES - Ligue 2 BKT • Journée 10 - Week-end du 24, 25 & 26 octobre 2026
📅 calendrier-fcnantes.ics généré (2 matchs trouvés)
```

✅ date et heure connues · ⏳ date ou week-end seulement (événement « journée entière ») · ❌ sans date (exclu)

## 🔧 Structure du fichier .ics

Chaque événement contient :
- **Titre** : `EQUIPE_DOMICILE vs EQUIPE_EXTERIEUR`
- **Description** : `[NOM_COMPETITION]` (+ le stade pour les matchs à l'extérieur)
- **Lieu** : Nom du stade (ou adresse complète pour la Beaujoire)
- **Date/Heure** : Heure officielle du match
- **Durée** : 2 heures (estimation), ou journée(s) entière(s) si l'heure n'est pas encore connue

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