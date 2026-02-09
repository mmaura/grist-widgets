import { COLUMN_MAPPING_NAMES } from './data.js'
import { MESSAGE_ROW, MESSAGE_FETCH_TABLE } from './types.js'
import { RowRecord } from 'grist/GristData'
import { NewRecord, Record } from 'grist/DocApiTypes'
import { TableOperations } from 'grist/TableOperations'
import Quill from 'quill'
import 'quill/dist/quill.core.css'
import 'quill/dist/quill.snow.css'
import './style.css'
// @ts-ignore
import ImageResize from 'quill-image-resize/image-resize.min.js'
Quill.register('modules/imageResize', ImageResize)

// @ts-ignore
import * as ImageDropModule from 'quill-image-drop-module'

// Si c'est un script classique, le module peut être dans .ImageDrop
const ImageDrop = (ImageDropModule as any).ImageDrop || ImageDropModule
Quill.register('modules/ImageDrop', ImageDrop)

// let Culture = 'en-US'
// let TimeZone = 'America/New_York'

const ToolbarOptions = [
  [
    'bold',
    'italic',
    'underline',
    'strike',
    { script: 'sub' },
    { script: 'super' },
    { color: [] },
    { background: [] },
    { align: [] },
    'blockquote',
    'code-block',
    { list: 'ordered' },
    { list: 'bullet' },
    { list: 'check' },
    'link',
    'image',
  ], // toggled buttons

  [
    { header: [1, 2, 3, 4, 5, 6, false] },
    { size: ['small', false, 'large', 'huge'] },
  ],

  ['clean'], // remove formatting button
]

const ChatTableName = 'Widget_messages'
let ChatTable: TableOperations
let MyQuill: Quill
const DisplayedIds = new Set()

let LinkedRecordID: number = 0

document.addEventListener('DOMContentLoaded', async () => {
  await startApp()
})

/*
Evenement généré en cas de modification d'un enregistrement :
* meme par un autre utilisateur sur un autre ordinateur
* même si un autre widget est associé pour la source de donnée

par contre la ligne retournée est celle qui est séléctionnée à condition
que tous les champs soient mappés et que le widget soit configuré avec widget lié
*/
grist.onRecord(async (record: RowRecord | null) => {
  if (__DEBUG__) console.log('**** Record reçu:', record)

  //Memorise l'id de la table de selection
  if (record?.id) {
    if (record?.id != LinkedRecordID) {
      //on a changé de selection source
      document.getElementById('msg-container')!.innerHTML = ''
      DisplayedIds.clear()

      LinkedRecordID = record.id
    }
  } else LinkedRecordID = 0

  if (__DEBUG__)
    console.log('**************** LinkedRecordID: ', LinkedRecordID)
  LoadMesssages()
})

//renvoie les enregistrerement de la Table Associée (en fonction du selecteur s'il existe)
grist.onRecords(async (records: RowRecord[] | null) => {
  if (__DEBUG__) console.log('****** OnRecords', records)
})

async function AddMessageToBase() {
  const message = MyQuill.getSemanticHTML()
  if (__DEBUG__) console.log(message)

  // Nettoyage : Quill peut retourner "<p><br></p>" ou des espaces vides
  if (message.replace(/<[^>]\s*>/g, '').trim().length === 0) return

  try {
    const data = {
      Message: message,
      LinkedId: LinkedRecordID,
    } as MESSAGE_ROW
    if (__DEBUG__) console.log('==>>>', data)

    ChatTable.create({ fields: data as any } as NewRecord).then((e) => {
      LoadMesssages()
    })

    MyQuill.setContents([])
  } catch {
    ShowTableErrorMsg()
  }
}

async function MarquerCommeLu(id: number) {
  try {
    const data = {
      Lu: true,
    } as MESSAGE_ROW
    if (__DEBUG__) console.log('==>>>', data)

    ChatTable.update({ id: id, fields: data as any }).then((e) => {
      LoadMesssages()
    })

    MyQuill.setContents([])
  } catch {
    ShowTableErrorMsg()
  }
}

async function AddMessageToPage(message: MESSAGE_ROW) {
  // Deja affiché
  if (DisplayedIds.has(message.id)) return

  const card = document.createElement('div')
  card.classList.add('card')
  if (!message.Lu) card.classList.add('nonlu')

  card.innerHTML = `
    <div class="card-header">
      <span class="author">${message.Cree_par}</span>
      <span class="actions">
        ${!message.Lu ? `<input type="button" class="read-btn" value="R">` : ''}
      </span>
      <span class="date">${new Date(message.Cree_le * 1000).toLocaleString()}</span>
    </div>
    <div class="card-content">
      <div class="card-message">${message.Message}</div>
    </div>
  `

  if (!message.Lu) {
    const btn = card.querySelector('.read-btn') as HTMLInputElement
    if (btn) {
      btn.onclick = async () => {
        if (__DEBUG__) console.log('Marquer comme lu :', message.id)

        await MarquerCommeLu(message.id as number)

        card.classList.remove('nonlu')
        btn.remove()
      }
    }
  }

  // 5. Injection dans le DOM
  const container = document.getElementById('msg-container')
  if (container) {
    container.prepend(card)
    DisplayedIds.add(message.id)
  }
}

async function LoadMesssages(): Promise<MESSAGE_ROW[]> {
  let records = (await grist.docApi.fetchTable(
    ChatTableName,
  )) as MESSAGE_FETCH_TABLE
  if (__DEBUG__) console.log('**************** fetch records: ', records)

  let filtered: MESSAGE_ROW[] = []

  //Filtrer par LinkedId

  records.LinkedId.map((lid: number, index: number) => {
    if (lid === LinkedRecordID)
      filtered.push({
        id: records.id[index],
        Cree_le: records.Cree_le![index],
        Cree_par: records.Cree_par![index],
        LinkedId: records.LinkedId[index],
        Message: records.Message[index] as string,
        Lu: records.Lu[index],
      })
  })

  filtered.sort((a, b) => {
    return a.Cree_le - b.Cree_le
  })

  if (__DEBUG__) console.log('**************** filtered: ', filtered)

  filtered.forEach((m) => AddMessageToPage(m))

  return filtered
}

async function ShowTableErrorMsg() {
  document.getElementById('logmessage')!.innerHTML =
    `<p><strong>Erreur:</strong> La table ${ChatTableName} n'existe pas. Vous devez la créer manuellement.</p>`
}

async function startApp() {
  // var urlParams = new URLSearchParams(window.location.search)
  // if (urlParams.has('culture')) Culture = urlParams.get('culture') as string
  // if (urlParams.has('timeZone')) TimeZone = urlParams.get('timeZone') as string

  grist.ready({
    columns: Object.values(COLUMN_MAPPING_NAMES),
    requiredAccess: 'read-table',
  })

  ChatTable = grist.getTable(ChatTableName)

  document.getElementById('chat')!.innerHTML = `
  <div class="chat-container">
    <div class="card form-card">
      <div class="card-header">
        <span id="new-title" class="author">Nouveau Message</span>
      </div>
      <div class="card-content">
        <div class="new-message">
          <div id="editor" class="editor-container"></div>
          <button id="add-message-btn" class="add-msg">Send</button>
        </div>
      </div>
    </div>
  </div>
  <div id="msg-container" class="chat-container"></div>
  `

  //Editeur Rich
  MyQuill = new Quill('#editor', {
    theme: 'snow',
    modules: {
      toolbar: ToolbarOptions,
      imageResize: {},
      imageDrop: true,
      keyboard: {
        bindings: {
          // On définit un nouveau raccourci
          handleEnter: {
            key: 'Enter',
            ctrlKey: true, // Déclenche uniquement avec CTRL enfoncé
            handler: function () {
              // Appeler votre fonction de validation ici
              AddMessageToBase()

              // Retourner false pour empêcher Quill d'ajouter une nouvelle ligne
              return false
            },
          },
        },
      },
    },
  })
  MyQuill.disable()

  // On écoute les clics sur tout le document
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement

    // Ajout Message
    if (target && target.id === 'add-message-btn') {
      AddMessageToBase()
    }
  })

  //La table est elle crée
  const tableList = await grist.docApi.listTables()
  if (!tableList.includes(ChatTableName)) ShowTableErrorMsg()
  else {
    document.getElementById('logmessage')!.innerHTML = ``
    MyQuill.enable()
  }
}
