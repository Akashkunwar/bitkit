interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>
  close(): Promise<void>
}

interface FileSystemFileHandle {
  getFile(): Promise<File>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface LaunchParams {
  files?: FileSystemFileHandle[]
}

interface LaunchQueue {
  setConsumer(cb: (params: LaunchParams) => void | Promise<void>): void
}

interface BarcodeDetector {
  detect(source: Blob | ImageBitmap | HTMLImageElement | HTMLCanvasElement): Promise<{ rawValue: string }[]>
}

interface EyeDropper {
  open(): Promise<{ sRGBHex: string }>
}

interface Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
  launchQueue?: LaunchQueue
  EyeDropper?: new () => EyeDropper
}

declare const BarcodeDetector: {
  new (options?: { formats?: string[] }): BarcodeDetector
}

interface FileSystemDirectoryHandle {
  name: string
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
}

interface Window {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
    types?: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<FileSystemFileHandle>
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}
