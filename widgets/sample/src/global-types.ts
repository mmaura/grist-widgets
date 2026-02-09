//une colone reference
export interface RefObject {
  tableId: string
  rowId: number
}

export interface DATA {
  //statics
  id: number

  //configuration
  timbre_pole: string
  timbre_gpt: string
  timbre_srv: string
  timbre_suivis: string
  timbre_tph: string
  timbre_mail: string
  lieu: string

  //rec
  date: Date
  objet: string
  corps: string
  pdf_output: string
  pfd_done: boolean
  config: string
}
