#!/usr/bin/env bash
set -e

# --- CHARGE CONFIG --------------------------------------------
if [ ! -f ".deploy.env" ]; then
  echo "Fichier .deploy.env introuvable."
  echo "Copiez .deploy.env.example vers .deploy.env"
  exit 1
fi

source .deploy.env

# --- PARAMETRE : NOM DU WIDGET --------------------------------
WIDGET=$1

if [ -z "$WIDGET" ]; then
  echo "Usage: ./deploy.sh <widget-name>"
  echo "Exemple: ./deploy.sh messages"
  exit 1
fi

WIDGET_DIR="widgets/$WIDGET"

if [ ! -d "$WIDGET_DIR" ]; then
  echo "Widget introuvable : $WIDGET"
  exit 1
fi

# --- BUILD -----------------------------------------------------
echo "Build du widget $WIDGET..."
npm run build --workspace=$WIDGET

# --- LIT LE NOM DANS PACKAGE.JSON ------------------------------
PROJECT_NAME=$(jq -r '.name' "$WIDGET_DIR/package.json")

if [ -z "$PROJECT_NAME" ] || [ "$PROJECT_NAME" == "null" ]; then
  echo "Impossible de lire 'name' dans package.json"
  exit 1
fi

REMOTE_DIR="${REMOTE_BASE}/${PROJECT_NAME}/"

echo "Déploiement vers : $REMOTE_DIR"

# --- DEPLOIEMENT -----------------------------------------------
rsync -avz \
  -e "ssh -i $SSH_KEY" \
  "$WIDGET_DIR/dist/" \
  "${SERVER_USER}@${SERVER_HOST}:${REMOTE_DIR}"

echo "Déploiement terminé !"
