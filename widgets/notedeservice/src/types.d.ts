import { PDFFont } from 'pdf-lib'

//une colone reference
export interface RefObject {
  tableId: string
  rowId: number
}

// Interface pour définir les polices requises pour le rendu Markdown
export interface MarkdownFontsBuffer {
  regular: ArrayBuffer
  bold: ArrayBuffer
  italic: ArrayBuffer
  boldItalic: ArrayBuffer
}
export interface MarkdownFonts {
  regular: PDFFont
  bold: PDFFont
  italic: PDFFont
  boldItalic: PDFFont
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
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
  signatureUrl: string

  //rec
  date: Date
  objet: string
  corps: string
  pdf_output: string
  pfd_done: boolean
  config: RefObject
}
