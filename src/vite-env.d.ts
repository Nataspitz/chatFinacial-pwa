/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface FileSystemWritableFileStream {
  write(data: Blob | BufferSource | string): Promise<void>
  close(): Promise<void>
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemDirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface Window {
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite'; startIn?: 'documents' | 'downloads' | 'desktop' }) => Promise<FileSystemDirectoryHandle>
}

declare global {
  interface Window {
    api?: {
      exportReportPdf: (
        payload: import('./types/report-export.types').ExportReportPdfPayload
      ) => Promise<import('./types/report-export.types').ExportReportPdfResult>
      windowControls?: {
        minimize: () => Promise<void>
        maximizeToggle: () => Promise<boolean>
        close: () => Promise<void>
        isMaximized: () => Promise<boolean>
        onMaximizedStateChange: (callback: (isMaximized: boolean) => void) => () => void
      }
    }
  }
}

export {}
