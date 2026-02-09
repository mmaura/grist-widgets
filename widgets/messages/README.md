# Configuration
* Creer une table nommée : "Widget_messages"
* Creer les colonnes :
  * Message : Text
  * Créé par : Text : formule d'initialisation "=user.Name"
  * Créé le : DateTime : formule d'initialisation : "=NOW()"
  * Lu : Boolean
  * LinkedId : Reférence vers l'élément associé (table selectrice)

Vous pouvez utiliser ces données pour creer la table via l'api : ```/docs/{docId}/tables/{tableId}/columns```

```json
{
  "columns": [
    {
      "id": "Message",
      "fields": {
        "type": "Text",
        "isFormula": false,
        "label": "Message"
      }
    },
    {
      "id": "Cree_par",
      "fields": {
        "type": "Text",
        "isFormula": false,
        "formula": "user.Name",
        "label": "Créé par"
      }
    },
    {
      "id": "Cree_le",
      "fields": {
        "type": "DateTime:Europe/Paris",
        "isFormula": false,
        "formula": "NOW()",
        "label": "Créé le"
      }
    },
    {
      "id": "Lu",
      "fields": {
        "type": "Bool",
        "isFormula": false,
        "formula": "",
        "label": "Lu"
      }
    },
    {
      "id": "LinkedId",
      "fields": {
        "type": "Ref:Taches",
        "widgetOptions": "",
        "isFormula": false,
        "formula": "",
        "label": "LinkedId"
      }
    }
  ]
}
```
