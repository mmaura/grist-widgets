import { ref, shallowRef } from 'vue'

export interface GristColumn {
  id: string
  label: string
  type: string
}

export interface GristRow {
  id: number
  [key: string]: unknown
}

export interface ColumnConfig {
  id: string
  visible: boolean
}

export interface WidgetOptions {
  columnOrder?: ColumnConfig[]
  groupByColumns?: string[]
  columnWidths?: Record<string, number>
}

interface GristRecord {
  id: number
  [key: string]: unknown
}

interface GristColumnMeta {
  id: string
  label: string
  type: string
}

interface GristAPI {
  ready(opts?: { requiredAccess?: string; onEditOptions?: () => void }): void
  onRecords(cb: (records: GristRecord[]) => void): void
  onColumns?: (cols: GristColumnMeta[]) => void
  onOptions?: (cb: (opts: unknown) => void) => void
  widgetApi: {
    getOptions(): Promise<unknown>
    setOptions(opts: unknown): Promise<void>
  }
}

function toPlain<T>(val: T): T {
  return JSON.parse(JSON.stringify(val))
}

export function useGrist(onEditOptions: () => void) {
  const allColumns = ref<GristColumn[]>([])
  const rows = shallowRef<GristRow[]>([])
  const isReady = ref(false)
  const error = ref<string | null>(null)
  const widgetOptions = ref<WidgetOptions>({})

  let gristApi: GristAPI | null = null

  async function saveOptions(opts: Partial<WidgetOptions>) {
    if (!gristApi) return
    const merged: WidgetOptions = toPlain({ ...widgetOptions.value, ...opts })
    await gristApi.widgetApi.setOptions(merged)
    widgetOptions.value = merged
  }

  function mergeColumns(gristCols: GristColumn[]) {
    const savedOrder = widgetOptions.value.columnOrder
    if (!savedOrder || savedOrder.length === 0) {
      allColumns.value = gristCols
      return
    }
    const gristMap = new Map(gristCols.map((c) => [c.id, c]))
    const merged: GristColumn[] = []
    for (const cfg of savedOrder) {
      const col = gristMap.get(cfg.id)
      if (col) merged.push(col)
    }
    for (const col of gristCols) {
      if (!savedOrder.find((c) => c.id === col.id)) merged.push(col)
    }
    allColumns.value = merged
  }

  function init() {
    const grist = (window as unknown as { grist?: GristAPI }).grist
    if (!grist) {
      error.value = 'API Grist non disponible'
      return
    }
    gristApi = grist

    grist.ready({ requiredAccess: 'read table', onEditOptions })

    grist.widgetApi.getOptions().then((opts) => {
      if (opts) widgetOptions.value = toPlain(opts as WidgetOptions)
    })

    grist.onOptions?.((opts) => {
      if (opts) {
        widgetOptions.value = toPlain(opts as WidgetOptions)
        if (allColumns.value.length > 0) mergeColumns([...allColumns.value])
      }
    })

    // grist.onColumns?.((cols: GristColumnMeta[]) => {
    //   const gristCols = cols
    //     .filter((c) => c.id !== "id")
    //     .map((c) => ({ id: c.id, label: c.label || c.id, type: c.type }));
    //   mergeColumns(gristCols);
    // });

    grist.onRecords((records: GristRecord[]) => {
      if (!records || records.length === 0) {
        rows.value = []
        isReady.value = true
        return
      }
      if (allColumns.value.length === 0) {
        const keys = Object.keys(records[0]).filter((k) => k !== 'id')
        allColumns.value = keys.map((k) => ({ id: k, label: k, type: 'Any' }))
      }
      rows.value = records.map((r) => ({ ...r })) as GristRow[]
      isReady.value = true
    })
  }

  return { allColumns, rows, isReady, error, widgetOptions, saveOptions, init }
}
