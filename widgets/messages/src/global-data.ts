// declare const grist: import("grist-plugin-api").GristAPI;
declare const grist: any

//Variables de configuation du widget
export const COLUMN_MAPPING_NAMES = {
  // DATE: {
  //   name: 'date',
  //   title: "Date de l'enregistrement",
  //   type: 'DateTime',
  //   optional: false,
  //   // form_field: 'DATE',
  // },
  // SENDER: {
  //   name: 'expediteur',
  //   title: 'Expéditeur du message',
  //   type: 'Text',
  //   optional: false,
  //   // form_field: 'OBJET',
  // },
  // MESSAGE: {
  //   name: 'Message',
  //   title: 'Corps du message',
  //   type: 'Text',
  //   optional: false,
  //   // form_field: 'CORPS',
  // },
  // VIEW: {
  //   name: 'vue',
  //   title: 'Est-ce que le destinataire a vu le message',
  //   type: 'Bool',
  //   optional: false,
  //   // form_field: null,
  // },
} as const
