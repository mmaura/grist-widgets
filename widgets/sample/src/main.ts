import { COLUMN_MAPPING_NAMES } from './global-data.js'
import { RowRecord } from 'grist/GristData'

const element = document.getElementById('result') as HTMLDivElement
element.innerHTML = 'Loading ...<br>'

if (__DEBUG__) console.log('*************************** Chargement')

grist.ready({
  columns: Object.values(COLUMN_MAPPING_NAMES),
  requiredAccess: 'full',
})

/*
Evenement généré en cas de modification d'un enregistrement :
* meme par un autre utilisateur sur un autre ordinateur
* même si un autre widget est associé pour la source de donnée

Par contre la ligne retournée est celle qui est séléctionnée à condition
que tous les champs soient mappés et que le widget soit configuré avec widget selecteur
*/
grist.onRecord(async (record: RowRecord | null) => {
  element.innerHTML += 'onRecord: ' + JSON.stringify(record) + '<br><br>'
  //mapping des colones / données
  const data = grist.mapColumnNames(record)
  if (__DEBUG__) console.log('****** OnRecord, mappedRecord:', data)

  // le mapping echoue si le widget n'est pas configuré
  if (!data || data === null) {
    console.log(
      "*************************** Le widget n'est pas entièrement configuré.",
    )
    return
  }
})

grist.onRecords((records: RowRecord[] | null) => {
  if (__DEBUG__) console.log('****** OnRecords', records)
  element.innerHTML += 'onRecords: ' + JSON.stringify(records) + '<br><br>'
})
