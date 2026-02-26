<template>
  <Teleport to="body">
    <div class="overlay" @click.self="$emit('close')">
      <div class="panel">
        <div class="panel-header">
          <h2>Colonnes affichées</h2>
          <button class="close-btn" @click="$emit('close')">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>

        <p class="panel-hint">
          Les nouvelles colonnes ajoutées à la table sont masquées par défaut.
        </p>

        <div class="actions-bar">
          <button class="link-btn" @click="selectAll">Tout sélectionner</button>
          <span class="sep">·</span>
          <button class="link-btn" @click="selectNone">
            Tout désélectionner
          </button>
        </div>

        <ul class="col-list">
          <li
            v-for="col in columns"
            :key="col.id"
            class="col-item"
            @click="toggle(col.id)"
          >
            <span class="checkbox" :class="{ checked: local.has(col.id) }">
              <svg
                v-if="local.has(col.id)"
                viewBox="0 0 12 12"
                fill="currentColor"
                width="10"
                height="10"
              >
                <path
                  d="M10 3L5 8.5 2 5.5"
                  stroke="white"
                  stroke-width="1.8"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <span class="col-name">{{ col.label }}</span>
          </li>
        </ul>

        <div class="panel-footer">
          <button class="btn-secondary" @click="$emit('close')">Annuler</button>
          <button class="btn-primary" @click="save">Enregistrer</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { GristColumn } from './composables/useGrist'

const props = defineProps<{
  columns: GristColumn[]
  visibleColumnIds: Set<string>
}>()

const emit = defineEmits<{
  close: []
  save: [ids: string[]]
}>()

// Local copy to allow cancel
const local = ref<Set<string>>(new Set(props.visibleColumnIds))

watch(
  () => props.visibleColumnIds,
  (val) => {
    local.value = new Set(val)
  },
  { immediate: true },
)

function toggle(id: string) {
  const s = new Set(local.value)
  s.has(id) ? s.delete(id) : s.add(id)
  local.value = s
}

function selectAll() {
  local.value = new Set(props.columns.map((c) => c.id))
}

function selectNone() {
  local.value = new Set()
}

function save() {
  emit('save', [...local.value])
  emit('close')
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.panel {
  background: #fff;
  border-radius: 10px;
  width: 360px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  font-family: 'Geist', 'DM Sans', system-ui, sans-serif;
  font-size: 13px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
}

.panel-header h2 {
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 2px;
  border-radius: 4px;
  display: flex;
}
.close-btn:hover {
  color: #374151;
  background: #f3f4f6;
}

.panel-hint {
  padding: 8px 16px 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
}

.actions-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px 6px;
}

.link-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6366f1;
  font-size: 12px;
  padding: 0;
  font-family: inherit;
}
.link-btn:hover {
  text-decoration: underline;
}
.sep {
  color: #d1d5db;
}

.col-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  padding: 4px 8px;
  margin: 0;
}

.col-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.col-item:hover {
  background: #f5f3ff;
}

.checkbox {
  width: 16px;
  height: 16px;
  border: 1.5px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.checkbox.checked {
  background: #6366f1;
  border-color: #6366f1;
}

.col-name {
  color: #374151;
  font-size: 13px;
}

.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
}

.btn-primary {
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  font-weight: 500;
}
.btn-primary:hover {
  background: #4f46e5;
}

.btn-secondary {
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  color: #374151;
}
.btn-secondary:hover {
  background: #f9fafb;
}
</style>
