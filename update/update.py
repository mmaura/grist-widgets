#!/usr/bin/python3

import json
import requests

# Dictionnaire associant les URLs aux filtres
url_filters = {
    "https://sdis66-widget.sdis66.fr/local_manifest.json": {'@sdis66', '@mmaura66'},
    "https://raw.githubusercontent.com/betagouv/grist-custom-widgets-fr-admin/main/public/widget-list.json": {'@anct', '@dinum'},
    "https://github.com/gristlabs/grist-widget/releases/download/latest/manifest.json": {'@gristlabs', '@berhalak'}
}

# Fonction pour charger un fichier JSON depuis une URL
def load_json_from_url(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.json()

# Charger les fichiers JSON
json_data = [load_json_from_url(url) for url in url_filters.keys()]

# Combiner les fichiers JSON en supprimant les doublons et en appliquant les filtres
combined_data = []
seen_widget_ids = set()

# Filtrer et combiner les widgets
for url, filters in url_filters.items():
    data = load_json_from_url(url)
    for widget in data:
        if any(filter_ in widget['widgetId'] for filter_ in filters):
            if widget['widgetId'] not in seen_widget_ids:
                combined_data.append(widget)
                seen_widget_ids.add(widget['widgetId'])

# Sauvegarder le fichier combiné
with open("../widgets/manifest.json", "w") as f:
    json.dump(combined_data, f, indent=4)

print("Fichier combiné créé avec succès : manifest.json")
