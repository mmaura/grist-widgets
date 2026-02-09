//une colone reference
// export interface RefObject {
//   tableId: string
//   rowId: number
// }

export interface MESSAGE_ROW {
  //statics
  id?: number
  Cree_le: number
  Cree_par: string
  Message: string
  LinkedId: number
  Lu: boolean
}

export interface MESSAGE_FETCH_TABLE {
  id: number[]
  Cree_le?: number[]
  Cree_par?: string[]
  Message: string[]
  LinkedId: number[]
  Lu: boolean[]
}
