declare const __DEBUG__: boolean
declare const __BASE__: string

interface ImportMetaEnv {
  readonly VITE_GRIST_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
