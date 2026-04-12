/* src/lib/sentences/hitokoto.ts */

const SENTENCES_BUNDLE_BASE =
  'https://cdn.jsdelivr.net/gh/hitokoto-osc/sentences-bundle@latest'
const SENTENCE_CACHE_TTL_MS = 6 * 60 * 60 * 1000
const MAX_SENTENCE_LENGTH = 30

const sentenceCategories = ['a', 'b', 'i', 'k'] as const

type SentenceCategory = (typeof sentenceCategories)[number]

interface BundleSentence {
  hitokoto: string
  from: string
  from_who?: string | null
  length?: number
}

export interface RandomSentence {
  hitokoto: string
  fromWho: string
}

let sentenceCache:
  | {
      expiresAt: number
      promise: Promise<BundleSentence[]>
    }
  | undefined

function isBundleSentence(value: unknown): value is BundleSentence {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const sentence = value as Record<string, unknown>

  return (
    typeof sentence.hitokoto === 'string' &&
    typeof sentence.from === 'string' &&
    (sentence.from_who == null || typeof sentence.from_who === 'string') &&
    (sentence.length == null || typeof sentence.length === 'number')
  )
}

function isShortSentence(sentence: BundleSentence): boolean {
  const length = sentence.length ?? sentence.hitokoto.trim().length
  return length > 0 && length <= MAX_SENTENCE_LENGTH
}

function sentenceAttribution(sentence: BundleSentence): string {
  const fromWho = sentence.from_who?.trim()
  if (fromWho) {
    return fromWho
  }

  const from = sentence.from.trim()
  return from ? from : '佚名'
}

function randomIndex(length: number): number {
  const random = new Uint32Array(1)
  const limit = Math.floor(0x1_0000_0000 / length) * length

  do {
    crypto.getRandomValues(random)
  } while (random[0] >= limit)

  return random[0] % length
}

async function fetchCategory(
  category: SentenceCategory,
): Promise<BundleSentence[]> {
  const response = await fetch(
    `${SENTENCES_BUNDLE_BASE}/sentences/${category}.json`,
    {
      headers: {
        accept: 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`Failed to load hitokoto category ${category}`)
  }

  const payload = (await response.json()) as unknown
  if (!Array.isArray(payload)) {
    throw new Error(`Invalid hitokoto category ${category}`)
  }

  return payload.filter(isBundleSentence).filter(isShortSentence)
}

async function loadSentences(): Promise<BundleSentence[]> {
  const groups = await Promise.all(sentenceCategories.map(fetchCategory))
  const sentences = groups.flat()

  if (sentences.length === 0) {
    throw new Error('No hitokoto sentences available')
  }

  return sentences
}

async function getSentences(): Promise<BundleSentence[]> {
  const now = Date.now()
  if (sentenceCache && sentenceCache.expiresAt > now) {
    return sentenceCache.promise
  }

  const promise = loadSentences()
  sentenceCache = {
    expiresAt: now + SENTENCE_CACHE_TTL_MS,
    promise,
  }

  promise.catch(() => {
    if (sentenceCache?.promise === promise) {
      sentenceCache = undefined
    }
  })

  return promise
}

export async function getRandomSentence(): Promise<RandomSentence> {
  const sentences = await getSentences()
  const sentence = sentences[randomIndex(sentences.length)]

  return {
    hitokoto: sentence.hitokoto.trim(),
    fromWho: sentenceAttribution(sentence),
  }
}
