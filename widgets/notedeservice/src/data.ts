// declare const grist: import("grist-plugin-api").GristAPI;
declare const grist: any

//Variables de configuation du widget
export const COLUMN_MAPPING_NAMES = {
  DATE: {
    name: 'date',
    title: "Date de l'entête",
    type: 'Date',
    optional: false,
    // form_field: 'DATE',
  },
  OBJET: {
    name: 'objet',
    title: 'Object de la note',
    type: 'Text',
    optional: false,
    // form_field: 'OBJET',
  },
  CORPS: {
    name: 'corps',
    title: 'Corps du message',
    type: 'Text',
    optional: false,
    // form_field: 'CORPS',
  },
  PDF_OUTPUT: {
    name: 'pdf_output',
    title: 'Fichier PDF généré',
    type: 'Attachments',
    optional: false,
    // form_field: null,
  },
  PDF_DONE: {
    //dois se remettre a false avec une formule d'initilaisation si un champ de l'enregistrement change
    name: 'pdf_done',
    title: 'PDF fabriqué',
    description:
      "Champ qui permet de savoir si on doit recalculer le PDF. Pensez a associer une formule d'initialisation qui remette a false en cas de modification des données sources, sinon le PDF ne se remettra pas à jour.",
    type: 'Bool',
    optionnal: false,
    // form_field: null,
  },
  CONF: {
    name: 'config',
    title: 'Configuration à utiliser',
    description: "('Montrer la colone' doit rester sur 'Id de la ligne'",
    type: 'Ref',
    optional: false,
    // form_field: null,
  },
} as const
