/* src/lib/database/storage-key.ts */

const imageExts = new Set(['webp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'avif'])
const videoExts = new Set(['mp4', 'webm', 'mov'])
const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac'])

function classifyExt(ext: string): string {
  if (imageExts.has(ext)) return 'image'
  if (videoExts.has(ext)) return 'video'
  if (audioExts.has(ext)) return 'audio'
  return 'media'
}

export function storageKey(hash: string, ext: string): string {
  return `${classifyExt(ext)}/${hash}.${ext}`
}
