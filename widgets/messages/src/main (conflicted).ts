import { COLUMN_MAPPING_NAMES } from './global-data.js'
import { ReadConfiguration, ShowMessage } from './utils.js'
import { DATA, RefObject } from './global-types.js'
import { RowRecord } from 'grist/GristData'
import Quill from 'quill'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import './style.css'
import { NewRecord } from 'grist/DocApiTypes'

//let Data: RowRecord | null = null

if (__DEBUG__) ShowMessage('Chargement')

grist.ready({
  columns: Object.values(COLUMN_MAPPING_NAMES),
  requiredAccess: 'full',
})

//Editeur Rich
const quill = new Quill('#editor', {
  theme: 'snow',
})

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
    const data = grist.mapColumnNames(record)
    if (__DEBUG__) console.log('****** Data', data)

    const selected = grist.fetchSelectedRecord()
    if (__DEBUG__) console.log('****** Slected', selected)

    // le mapping echoue si le widget n'est pas configuré
    if (!data || data === null) {
      ShowMessage("Le widget n'est pas entièrement configuré.")
      return
    }

    if (!('config' in data)) {
      ShowMessage("La clef de configuration n'est pas configurée")
      return
    }

    const config = await ReadConfiguration(data.config as RefObject)
    if (config === null) {
      ShowMessage('Impossible de charger la configuration')
      return
    }

    if (__DEBUG__) console.log('**** Configuration recue: ', config)

    const div = document.getElementById('result') as HTMLDivElement
    div.innerHTML = 'DATA:'
    div.innerHTML += JSON.stringify(data)
    div.innerHTML += '<br><bR>CONFIG:'
    div.innerHTML += JSON.stringify(config)

    if (__DEBUG__) console.log(data.id)
  }
  if (__DEBUG__) console.log('**** Record reçu:', record)
  processRecordAsync(record)
})

grist.onRecords((records: RowRecord[] | null) => {
  if (__DEBUG__) console.log('****** OnRecords', records)
})

// On écoute les clics sur tout le document
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement

  // Ajout Message
  if (target && target.id === 'add-message-btn') {
    AddNewMessage()
  }
})

async function AddNewMessage() {
  const message = quill.getSemanticHTML()
  console.log(message)

  // Nettoyage : Quill peut retourner "<p><br></p>" ou des espaces vides
  const isReallyEmpty = message.replace(/<[^>]*>/g, '').trim().length === 0

  if (isReallyEmpty) {
    console.log('Message vide, annulation.')
    return
  }

  const tableOp = grist.getTable()
  let rawData = grist.mapColumnNamesBack(
    { Message: message },
    { columns: ['MESSAGE'] },
  )

  // 2. On enlève toutes les clés qui sont null ou undefined
  const data = Object.fromEntries(
    Object.entries(rawData).filter(
      ([_, value]) => value !== undefined && value !== null,
    ),
  )

  console.log('==>>>', data)
  let id = await tableOp.create({ fields: data } as NewRecord)

  quill.setContents([])
}
