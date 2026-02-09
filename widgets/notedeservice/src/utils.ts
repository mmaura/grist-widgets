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

    if (__DEBUG__) console.log(`index: ${index}`)

    const rec = {} as any

    // 3. Parcourir toutes les colonnes
    for (const cle in table) {
      if (Object.prototype.hasOwnProperty.call(table, cle)) {
        if (cle == 'signature')
          rec['signatureUrl'] = await getAttachmentUrl(table[cle][index][1])
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

export async function uploadAttachementToGrist(
  RecordId: number,
  outputColumnName: string,
  blob: Blob,
) {
  try {
    const tableId = await grist.getTable().getTableId()

    // Upload attachment
    const fileName = `${new Date().toISOString()}.pdf`
    const attachmentId = await uploadAttachment(blob, fileName)

    if (__DEBUG__)
      console.log('*********************************att id : ', attachmentId)
    // Update record
    await updateRecordWithAttachment(
      tableId,
      RecordId,
      outputColumnName,
      attachmentId,
    )
  } catch (error) {
    console.error('Error in savePdfToGrist:', error)
    throw new Error(
      error instanceof Error ? error.message : 'Failed to save PDF to Grist',
    )
  }
}

async function uploadAttachment(blob: Blob, filename: string): Promise<number> {
  const tokenInfo = await grist.docApi.getAccessToken({ readOnly: false })
  const gristUrl = `${tokenInfo.baseUrl}/attachments?auth=${tokenInfo.token}`

  const formData = new FormData()
  formData.set('upload', blob, filename)

  const gristResponse = await fetch(gristUrl, {
    method: 'POST',
    body: formData,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  const response = await gristResponse.json()
  return response[0]
}

async function updateRecordWithAttachment(
  tableId: string,
  recordId: number,
  columnName: string,
  attachmentId: number,
) {
  const tokenInfo = await grist.docApi.getAccessToken({ readOnly: false })
  const updateUrl = `${tokenInfo.baseUrl}/tables/${tableId}/records?auth=${tokenInfo.token}`

  const response = await fetch(updateUrl, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      records: [
        {
          id: recordId,
          fields: { fichier_pdf: ['L', attachmentId] }, //TODO append file ?
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update record: ${response.statusText}`)
  }
}

async function getAttachmentUrl(attId: number): Promise<string> {
  const tokenInfo = await grist.docApi.getAccessToken({ readOnly: true })
  const gristUrl = `${tokenInfo.baseUrl}/attachments?auth=${tokenInfo.token}`

  const url = `${tokenInfo.baseUrl}/attachments/${attId}/download?auth=${tokenInfo.token}`
  if (__DEBUG__) console.log(`Attachment id : ${attId}, url : ${url}`)

  return url
}
