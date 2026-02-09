import { COLUMN_MAPPING_NAMES } from './global-data.js'
import {
  ReadConfiguration,
  ShowMessage,
  uploadAttachementToGrist,
} from './utils.js'
import { DATA, RefObject } from './global-types.js'
import { loadPdfResources, MakePdf, PdfResources } from './pdflib.js'
import { RowRecord } from 'grist/GristData'

//let Data: RowRecord | null = null
let pdfBytes: Uint8Array
let pdfBlob: Blob
let Data: DATA

if (__DEBUG__) ShowMessage('Chargement')

grist.ready({
  columns: Object.values(COLUMN_MAPPING_NAMES),
  requiredAccess: 'full',
})

let RessourcesLoaded = false
let Resources = {} as PdfResources

/*
Evenement généré en cas de modification d'un enregistrement :
* meme par un autre utilisateur sur un autre ordinateur
* même si un autre widget est associé pour la source de donnée

par contre la ligne retournée est celle qui est séléctionnée à condition 
que tous les champs soient mappés et que le widget soit configuré avec widget lié
*/
grist.onRecord((record: RowRecord | null) => {
  const processRecordAsync = async (record: RowRecord | null) => {
    //mapping des colones / données
    Data = grist.mapColumnNames(record)

    if (!RessourcesLoaded) Resources = await loadPdfResources()

    // le mapping echoue si le widget n'est pas configuré
    if (!Data || Data === null) {
      ShowMessage("Le widget n'est pas entièrement configuré.")
      return
    }

    if (!('config' in Data)) {
      ShowMessage("La clef de configuration n'est pas configurée")
      return
    }

    const config = await ReadConfiguration(Data.config as RefObject)
    if (config === null) {
      ShowMessage('Impossible de charger la configuration')
      return
    }

    if (__DEBUG__) console.log('**** Configuration recue: ', config)

    //fusion des objects (static / configuration / rec) contenant les valeurs utilisées pour fabriquer le PDF
    pdfBytes = await MakePdf({ ...config, ...Data } as DATA, Resources)

    const arrayBuffer = pdfBytes.buffer.slice(
      pdfBytes.byteOffset,
      pdfBytes.byteOffset + pdfBytes.byteLength,
    )

    pdfBlob = new Blob([arrayBuffer as ArrayBuffer], {
      type: 'application/pdf',
    })
    const iframe = document.getElementById('pdf') as HTMLIFrameElement
    iframe.src = URL.createObjectURL(pdfBlob)

    if (__DEBUG__) console.log(Data.id)
  }

  const iframe = document.getElementById('pdf') as HTMLIFrameElement
  iframe.src = `${__BASE__}loading.html`

  if (__DEBUG__) console.log('**** Record reçu:', record)
  processRecordAsync(record)
})

grist.onRecords((records: RowRecord[] | null) => {
  console.log('****** OnRecords', records)
})

window.addEventListener('pdf-upload-file', (event: Event) => {
  // La console affichera ce message lorsque le bouton HTML est cliqué.
  console.log('--- Événement CAPPÉ DANS pdf-maker.ts ---')
  console.log('Événement reçu ! Type:', event.type)

  // Vous pouvez déclencher n'importe quelle logique ici,
  // par exemple, mettre à jour une variable globale pour forcer un re-rendu du PDF.
  uploadAttachementToGrist(Data.id, Data.pdf_output, pdfBlob)
})
