# Informations

Ce repository héberge mes widgets. Ils sont fournis **tels quels**.  

Les implications **sécuritaires** liées à leur utilisation n’incombent pas à ma responsabilité. Il vous appartient de **vérifier et relire le code** si vous comptez les utiliser.  

Bien entendu, je reste ouvert aux propositions de modification de code. Vous pouvez également les "forker" conformément à la [LICENCE](LICENSE).  

Les widgets respectent la logique d’inclure toutes les dépendances en local pour un fonctionnement autonome et plus rapide.

---

# Widgets

Voici un aperçu synthétique des widgets disponibles dans ce repository :

| Nom du widget       | Description                                                                 | Notes / Particularités                             | Remerciements     |
|--------------------|-----------------------------------------------------------------------------|---------------------------------------------------|---|
| `notedeservice`     | Génère des PDFs en fonction de plusieurs paramètres configurables           | Nécessite d’avoir les données paramétrées       | |
| `messages`          | Main courante ou discussion avec indicateur de message lu                  | Peut être associé à une table sélecteur          | Dérivé du widget de [Varamil](https://github.com/Varamil/grist-widget) |
| `sample`            | Base pour la création d’un nouveau widget                                  | Contient les fichiers minimum pour intégrer la structure | |



---

# Instances auto-hébergées

Pour utiliser sur vos propres instances Grist :  

1. Créez ou modifiez le fichier `.env` à la racine de votre projet.  
2. Définissez la variable `VITE_GRIST_URL` vers votre serveur Grist :

```bash
VITE_GRIST_URL=https://grist.monsite.local/grist-plugin-api.js
```
Si cette variable n’est pas définie, le widget utilisera par défaut le site officiel : https://docs.getgrist.com/grist-plugin-api.js
.

# Développement
## Lancer le serveur local

Pour démarrer le serveur de développement d’un widget spécifique :
```bash
# Remplacez 'messages' par le nom du widget
npm run dev --workspace=messages
```

Le serveur local permet de visualiser le widget en temps réel, avec hot reload.

## Construction / Build

Pour créer le bundle de production du widget :
```bash
# Remplacez 'messages' par le nom du widget
npm run build --workspace=messages

npm run build:all
```
Le build générera un dossier dist/ prêt à être déployé.

## Déploiement

Le déploiement se fait via le script deploy.sh situé à la racine. Le script de dépoiement ne fonctione que sous linux.
il dépend de **rsync** et **jq**.

### Configurer le script
Créez un fichier .deploy.env à la racine (ignoré par git) à partir du modèle .deploy.env.example :

```bash
cp .deploy.env.example .deploy.env
```

Puis modifiez les variables :

```bash
SERVER_HOST="10.10.10.10"
SERVER_USER="username"
SSH_KEY="/home/username/.ssh/userkey"
REMOTE_BASE="/????/grist-widgets/"
```

Lancer le déploiement d’un widget spécifique :

```bash
./deploy.sh messages
```

Le script utilise rsync pour transférer le contenu du dossier dist/ vers le serveur distant via SSH.

# Notes supplémentaires

Chaque widget est autonome, avec ses propres dépendances gérées via npm workspaces.

Pour contribuer, suivez la structure existante (voir sample) et testez vos changements avec le serveur local avant déploiement.

Assurez-vous que votre .env est correctement configuré pour pointer vers la bonne instance Grist.
