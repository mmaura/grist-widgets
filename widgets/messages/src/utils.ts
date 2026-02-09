import { DATA, RefObject } from './global-types'

export async function ShowMessage(...msg: any[]) {
  if (__DEBUG__) console.log('******************', msg)
}

export async function ReadConfiguration(
  // configRef: RefObject,
  configRef: RefObject,
): Promise<DATA | null> {
  try {
    // Récupère les données de configuration
    if (__DEBUG__) console.log('***** reference config : ', configRef)

    // const table = await grist.docApi.fetchTable(configRef.tableId)
    const table = await grist.docApi.fetchTable(configRef.tableId)

    if (__DEBUG__) console.log('***** table config : ', table)
    if (table === null) {
      ShowMessage('Impossible de charger la table de configuration')
    }

    if (__DEBUG__)
      console.log(
        '**********************************************************************',
        configRef.rowId,
      )

    // recherche du nom de la config
    const index = table.id.findIndex((id: number) => id === configRef.rowId)
    if (index === -1) {
      ShowMessage('Index non trouvé :', configRef.rowId)
      return null
    }

    const rec = {} as any

    // 3. Parcourir toutes les colonnes
    for (const cle in table) {
      if (Object.prototype.hasOwnProperty.call(table, cle)) {
        rec[cle] = table[cle][index]
      }
    }
    return rec as DATA
  } catch (e) {
    ShowMessage(
      'Impossible de charger la configuration depuis la table de configuration',
      e,
    )
    return null
  }
}
