#!/usr/bin/env bash
set -e

# --- CHARGE CONFIG --------------------------------------------
if [ ! -f ".deploy.env" ]; then
  echo "Fichier .deploy.env introuvable."
  echo "Copiez .deploy.env.example vers .deploy.env"
  exit 1
fi

source .deploy.env

scp -i $SSH_KEY local_manifest.json "${SERVER_USER}@${SERVER_HOST}:${REMOTE_BASE}/"
