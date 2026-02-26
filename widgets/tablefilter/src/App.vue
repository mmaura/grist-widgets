<template>
  <div class="widget">
    <!-- ── Config Panel ── -->
    <transition name="panel">
      <div v-if="showConfig" class="config-overlay" @click.self="closeConfig">
        <div class="config-panel">
          <div class="config-header">
            <h2>Configuration</h2>
            <button class="icon-btn" @click="closeConfig">✕</button>
          </div>

          <div class="config-body">
            <p class="section-title">Colonnes</p>
            <p class="section-hint">
              Faites glisser pour réordonner. Cochez pour afficher.
            </p>

            <div class="col-list">
              <div
                v-for="(cfg, idx) in localColumnOrder"
                :key="cfg.id"
                class="col-item"
                :class="{ hidden: !cfg.visible }"
                draggable="true"
                @dragstart="dragStart(idx)"
                @dragover.prevent="dragOver(idx)"
                @dragleave="dragLeave"
                @drop.prevent="dragDrop(idx)"
                :data-drag-over="dragOverIdx === idx"
              >
                <span class="drag-handle">⠿</span>
                <input
                  type="checkbox"
                  :checked="cfg.visible"
                  @change="cfg.visible = !cfg.visible"
                />
                <span class="col-name">{{ labelOf(cfg.id) }}</span>
              </div>
            </div>

            <p class="section-title" style="margin-top: 20px">Regroupement</p>
            <p class="section-hint">
              Colonnes utilisées pour regrouper les lignes.
            </p>

            <div class="col-list">
              <label
                v-for="col in allColumns"
                :key="col.id"
                class="col-item selectable"
                :class="{ selected: isGrouped(col.id) }"
              >
                <input
                  type="checkbox"
                  :checked="isGrouped(col.id)"
                  @change="toggleGroupBy(col.id)"
                />
                <span class="col-name">{{ col.label }}</span>
                <span v-if="groupByIndex(col.id) >= 0" class="col-badge">{{
                  groupByIndex(col.id) + 1
                }}</span>
              </label>
            </div>

            <div v-if="localGroupBy.length > 1" class="group-order">
              <p class="section-hint" style="margin-top: 8px">
                Ordre de regroupement :
              </p>
              <div
                v-for="(colId, idx) in localGroupBy"
                :key="colId"
                class="group-order-item"
                draggable="true"
                @dragstart="groupDragStart(idx)"
                @dragover.prevent
                @drop.prevent="groupDragDrop(idx)"
              >
                <span class="drag-handle">⠿</span>
                <span>{{ labelOf(colId) }}</span>
                <button class="icon-btn small" @click="removeGroupBy(colId)">
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div class="config-footer">
            <button class="btn-secondary" @click="resetConfig">
              Réinitialiser
            </button>
            <button class="btn-primary" @click="applyConfig">Appliquer</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── Toolbar ── -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="row-count"
          >{{ filteredRows.length }} / {{ rows.length }} lignes</span
        >
        <span v-if="widgetOptions.groupByColumns?.length" class="group-badge">
          {{ widgetOptions.groupByColumns.map(labelOf).join(' › ') }}
        </span>
      </div>
      <div class="toolbar-right">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clip-rule="evenodd"
            />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Rechercher…"
            class="search-input"
          />
          <button v-if="search" class="clear-btn" @click="search = ''">
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- ── States ── -->
    <div v-if="error" class="state-message error">⚠ {{ error }}</div>
    <div v-else-if="!isReady" class="state-message">
      <span class="spinner" /> Connexion à Grist…
    </div>
    <div v-else-if="displayRows.length === 0" class="state-message">
      {{ search ? 'Aucun résultat.' : 'Aucune donnée.' }}
    </div>

    <!-- ── Table ── -->
    <div v-else class="table-wrapper">
      <!-- Fixed header -->
      <div class="table-head" ref="tableHeadRef">
        <table class="table" :style="tableStyle">
          <colgroup>
            <col
              v-for="col in visibleColumns"
              :key="col.id"
              :style="{ width: colWidth(col.id) + 'px' }"
            />
          </colgroup>
          <thead>
            <tr>
              <th
                v-for="col in visibleColumns"
                :key="col.id"
                :title="col.label"
              >
                <span class="th-label">{{ col.label }}</span>
                <span
                  class="resize-handle"
                  @mousedown.prevent="startResize($event, col.id)"
                />
              </th>
            </tr>
          </thead>
        </table>
      </div>

      <!-- Virtual scroll body -->
      <div ref="containerRef" class="table-body-scroll" @scroll="onScroll">
        <div :style="{ height: totalHeight + 'px', position: 'relative' }">
          <table
            class="table"
            :style="[
              tableStyle,
              {
                transform: `translateY(${offsetY}px)`,
                position: 'absolute',
                width: '100%',
              },
            ]"
          >
            <colgroup>
              <col
                v-for="col in visibleColumns"
                :key="col.id"
                :style="{ width: colWidth(col.id) + 'px' }"
              />
            </colgroup>
            <tbody>
              <template
                v-for="item in visibleRows"
                :key="(item as DisplayRow)._key"
              >
                <tr
                  v-if="(item as DisplayRow)._type === 'group'"
                  class="group-row"
                >
                  <td :colspan="visibleColumns.length">
                    <span class="group-label">{{
                      (item as DisplayRow)._groupLabel
                    }}</span>
                    <span class="group-count"
                      >{{ (item as DisplayRow)._groupCount }} lignes</span
                    >
                  </td>
                </tr>
                <tr v-else class="data-row">
                  <td v-for="col in visibleColumns" :key="col.id">
                    {{ formatCell((item as GristRow)[col.id]) }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Resize overlay (prevents text selection while dragging) -->
    <div
      v-if="resizing"
      class="resize-overlay"
      @mousemove="doResize"
      @mouseup="endResize"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, reactive } from 'vue'
import {
  useGrist,
  type GristRow,
  type ColumnConfig,
} from './composables/useGrist'
import { useVirtualScroll } from './composables/useVirtualScroll'

const DEFAULT_COL_WIDTH = 150
const MIN_COL_WIDTH = 60
const ROW_HEIGHT = 36 // used by virtual scroll for row height estimation

// ── Config panel ──
const showConfig = ref(false)
function openConfig() {
  showConfig.value = true
}
function closeConfig() {
  showConfig.value = false
}

// ── Grist ──
const { allColumns, rows, isReady, error, widgetOptions, saveOptions, init } =
  useGrist(openConfig)

// ── Local config state ──
const localColumnOrder = ref<ColumnConfig[]>([])
const localGroupBy = ref<string[]>([])

watch(
  [() => showConfig.value, () => widgetOptions.value, () => allColumns.value],
  () => {
    if (!showConfig.value) return
    const saved = widgetOptions.value.columnOrder
    if (saved && saved.length > 0) {
      const existing = new Set(saved.map((c) => c.id))
      localColumnOrder.value = [
        ...saved,
        ...allColumns.value
          .filter((c) => !existing.has(c.id))
          .map((c) => ({ id: c.id, visible: true })),
      ]
    } else {
      localColumnOrder.value = allColumns.value.map((c) => ({
        id: c.id,
        visible: true,
      }))
    }
    localGroupBy.value = [...(widgetOptions.value.groupByColumns ?? [])]
  },
  { immediate: true },
)

// ── Visible columns ──
const visibleColumns = computed(() => {
  const saved = widgetOptions.value.columnOrder
  if (!saved || saved.length === 0) return allColumns.value
  return saved
    .filter((cfg) => cfg.visible)
    .map((cfg) => allColumns.value.find((c) => c.id === cfg.id))
    .filter(Boolean) as typeof allColumns.value
})

// ── Column widths ──
// Local reactive widths (updated during drag before save)
const localWidths = reactive<Record<string, number>>({})

function colWidth(colId: string): number {
  return (
    localWidths[colId] ??
    widgetOptions.value.columnWidths?.[colId] ??
    DEFAULT_COL_WIDTH
  )
}

const tableStyle = computed(() => {
  const total = visibleColumns.value.reduce(
    (sum, col) => sum + colWidth(col.id),
    0,
  )
  return { width: total + 'px', minWidth: '100%' }
})

// ── Column resize ──
const resizing = ref(false)
let resizeColId = ''
let resizeStartX = 0
let resizeStartWidth = 0
// Debounce save timer
let resizeSaveTimer: ReturnType<typeof setTimeout> | null = null

function startResize(e: MouseEvent, colId: string) {
  resizing.value = true
  resizeColId = colId
  resizeStartX = e.clientX
  resizeStartWidth = colWidth(colId)
}

function doResize(e: MouseEvent) {
  if (!resizing.value) return
  const delta = e.clientX - resizeStartX
  const newWidth = Math.max(MIN_COL_WIDTH, resizeStartWidth + delta)
  localWidths[resizeColId] = newWidth
}

function endResize() {
  if (!resizing.value) return
  resizing.value = false

  // Debounce: save 400ms after last resize action
  if (resizeSaveTimer) clearTimeout(resizeSaveTimer)
  resizeSaveTimer = setTimeout(() => {
    const widths: Record<string, number> = {
      ...(widgetOptions.value.columnWidths ?? {}),
      ...localWidths,
    }
    saveOptions({ columnWidths: widths })
  }, 400)
}

// ── Helpers ──
function labelOf(colId: string) {
  return allColumns.value.find((c) => c.id === colId)?.label ?? colId
}

// ── Group by ──
function isGrouped(colId: string) {
  return localGroupBy.value.includes(colId)
}
function groupByIndex(colId: string) {
  return localGroupBy.value.indexOf(colId)
}
function toggleGroupBy(colId: string) {
  const idx = localGroupBy.value.indexOf(colId)
  if (idx >= 0) localGroupBy.value.splice(idx, 1)
  else localGroupBy.value.push(colId)
}
function removeGroupBy(colId: string) {
  localGroupBy.value = localGroupBy.value.filter((c) => c !== colId)
}

// ── Column drag-to-reorder ──
let dragIdx = -1
const dragOverIdx = ref(-1)
function dragStart(idx: number) {
  dragIdx = idx
}
function dragOver(idx: number) {
  dragOverIdx.value = idx
}
function dragLeave() {
  dragOverIdx.value = -1
}
function dragDrop(idx: number) {
  dragOverIdx.value = -1
  if (dragIdx < 0 || dragIdx === idx) return
  const arr = [...localColumnOrder.value]
  const [item] = arr.splice(dragIdx, 1)
  arr.splice(idx, 0, item)
  localColumnOrder.value = arr
  dragIdx = -1
}

// ── Group drag-to-reorder ──
let groupDragIdx = -1
function groupDragStart(idx: number) {
  groupDragIdx = idx
}
function groupDragDrop(idx: number) {
  if (groupDragIdx < 0 || groupDragIdx === idx) return
  const arr = [...localGroupBy.value]
  const [item] = arr.splice(groupDragIdx, 1)
  arr.splice(idx, 0, item)
  localGroupBy.value = arr
  groupDragIdx = -1
}

// ── Config actions ──
function resetConfig() {
  localColumnOrder.value = allColumns.value.map((c) => ({
    id: c.id,
    visible: true,
  }))
  localGroupBy.value = []
}
async function applyConfig() {
  await saveOptions({
    columnOrder: [...localColumnOrder.value],
    groupByColumns: [...localGroupBy.value],
  })
  closeConfig()
}

// ── Search (all columns, including hidden) ──
const search = ref('')
const filteredRows = computed(() => {
  if (!search.value.trim()) return rows.value
  const q = search.value.toLowerCase()
  return rows.value.filter((row) =>
    allColumns.value.some((col) => {
      const val = row[col.id]
      return val != null && String(val).toLowerCase().includes(q)
    }),
  )
})

// ── Grouping ──
interface DisplayRow {
  _type: 'group' | 'data'
  _key: string
  _groupLabel?: string
  _groupCount?: number
  [key: string]: unknown
}

const displayRows = computed<DisplayRow[]>(() => {
  const groupBy = widgetOptions.value.groupByColumns ?? []
  if (groupBy.length === 0) {
    return filteredRows.value.map((r) => ({
      ...r,
      _type: 'data',
      _key: String(r.id),
    }))
  }

  // Trier par toutes les colonnes de regroupement pour regrouper les valeurs identiques
  const sorted = [...filteredRows.value].sort((a, b) => {
    for (const col of groupBy) {
      const av = String(a[col] ?? '')
      const bv = String(b[col] ?? '')
      if (av < bv) return -1
      if (av > bv) return 1
    }
    return 0
  })

  // Pré-compter chaque groupe
  const groupCounts = new Map<string, number>()
  for (const row of sorted) {
    const key = groupBy.map((c) => String(row[c] ?? '')).join(' › ')
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1)
  }

  const result: DisplayRow[] = []
  let lastGroupKey = ''
  for (const row of sorted) {
    const groupKey = groupBy.map((c) => String(row[c] ?? '')).join(' › ')
    if (groupKey !== lastGroupKey) {
      result.push({
        _type: 'group',
        _key: `group-${groupKey}`,
        _groupLabel: groupBy.map((c) => String(row[c] ?? '—')).join(' › '),
        _groupCount: groupCounts.get(groupKey) ?? 0,
      })
      lastGroupKey = groupKey
    }
    result.push({ ...row, _type: 'data', _key: String(row.id) })
  }
  return result
})

// ── Virtual scroll ──
// Row height is variable (text wraps), use a minimum estimate for virtual scroll
const { containerRef, visibleRows, totalHeight, offsetY, onScroll } =
  useVirtualScroll(() => displayRows.value, ROW_HEIGHT)

function formatCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? '✓' : '✗'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

onMounted(() => init())
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.widget {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'DM Sans', system-ui, sans-serif;
  font-size: 13px;
  background: #fff;
  color: #1a1a1a;
  position: relative;
}

/* ── Resize overlay ── */
.resize-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  cursor: col-resize;
}

/* ── Toolbar ── */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-shrink: 0;
  gap: 8px;
}
.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.row-count {
  color: #6b7280;
  font-size: 12px;
}
.group-badge {
  font-size: 11px;
  background: #ede9fe;
  color: #6d28d9;
  padding: 2px 8px;
  border-radius: 99px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
}
.icon-btn:hover {
  background: #e5e7eb;
}
.icon-btn.small {
  font-size: 11px;
  padding: 2px 4px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 8px;
  width: 14px;
  height: 14px;
  color: #9ca3af;
  pointer-events: none;
}
.search-input {
  padding: 5px 28px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  width: 220px;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15);
}
.clear-btn {
  position: absolute;
  right: 6px;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  font-size: 16px;
}
.clear-btn:hover {
  color: #374151;
}

/* ── States ── */
.state-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex: 1;
  color: #6b7280;
  font-size: 14px;
}
.state-message.error {
  color: #dc2626;
}
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Table layout ── */
.table-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}
.table-head {
  flex-shrink: 0;
  overflow: hidden;
  border-bottom: 2px solid #e5e7eb;
}
.table-body-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: auto;
}

.table {
  border-collapse: collapse;
  table-layout: fixed;
}

/* ── Header ── */
.table th {
  position: relative;
  padding: 8px 24px 8px 12px; /* right padding for resize handle */
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
  background: #f9fafb;
  white-space: nowrap;
  overflow: hidden;
  user-select: none;
}
.th-label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Resize handle ── */
.resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
}
.resize-handle:hover,
.resize-handle:active {
  background: #6366f1;
}

/* ── Cells — wrap text, no truncation ── */
.table td {
  padding: 6px 12px;
  border-bottom: 1px solid #f3f4f6;
  white-space: normal; /* ← wrap instead of truncate */
  overflow-wrap: break-word;
  word-break: break-word;
  color: #374151;
  vertical-align: top;
}

.data-row:hover td {
  background: #f5f3ff;
}

/* ── Group rows ── */
.group-row td {
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
  height: 32px;
  font-weight: 600;
  color: #475569;
  font-size: 12px;
  white-space: nowrap;
}
.group-label {
  margin-right: 8px;
  font-size: 16px;
}
.group-count {
  font-weight: 400;
  color: #94a3b8;
  font-size: 11px;
}

/* ── Config panel ── */
.config-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 100;
  display: flex;
  justify-content: flex-end;
}
.config-panel {
  width: 320px;
  height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
}
.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}
.config-header h2 {
  font-size: 15px;
  font-weight: 600;
}
.config-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
  margin-bottom: 6px;
}
.section-hint {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 10px;
  line-height: 1.5;
}

.col-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.col-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: grab;
  transition:
    background 0.1s,
    border-color 0.1s;
  user-select: none;
}
.col-item[data-drag-over='true'] {
  border-color: #6366f1;
  background: #eef2ff;
}
.col-item.hidden {
  opacity: 0.45;
}
.col-item.selectable {
  cursor: pointer;
}
.col-item.selectable.selected {
  background: #ede9fe;
  border-color: #c4b5fd;
}
.drag-handle {
  color: #d1d5db;
  font-size: 16px;
  flex-shrink: 0;
}
.col-name {
  flex: 1;
  font-size: 13px;
}
.col-badge {
  background: #6d28d9;
  color: #fff;
  border-radius: 99px;
  font-size: 11px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
}

.group-order {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 4px;
}
.group-order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: grab;
}

.config-footer {
  display: flex;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
}
.btn-primary {
  padding: 7px 16px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.btn-primary:hover {
  background: #4338ca;
}
.btn-secondary {
  padding: 7px 16px;
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-secondary:hover {
  background: #f9fafb;
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.2s;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
}

.table-body-scroll::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.table-body-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.table-body-scroll::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}
.table-body-scroll::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}
</style>
