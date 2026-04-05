/* src/components/post/share-actions.tsx */

import * as Tooltip from '@radix-ui/react-tooltip'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ClaudeLine,
  GoogleGeminiFill,
  Grok2Fill,
  Link2Line,
  OpenaiLine,
  SocialXLine,
  TwitterLine,
} from '@mingcute/react'
import { getSession } from '~/server/session'

type CopyStatus = 'idle' | 'copied' | 'failed'
type AiProvider = 'claude' | 'chatgpt' | 'gemini' | 'grok'

const AI_PROVIDER_STORAGE_KEY = 'ai-provider'
const AI_PROVIDER_CHANGE_EVENT = 'ai-provider-change'
const AI_PROVIDERS: AiProvider[] = ['claude', 'chatgpt', 'gemini', 'grok']
const ICON_SIZE_CLASS = 'size-[1.15rem]'
const ICON_SLOT_CLASS =
  'relative inline-flex size-[1.15rem] items-center justify-center align-top [&>svg]:block [&>svg]:flex-none'

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const input = document.createElement('input')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'absolute'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  input.remove()
}

function openTwitterShare(url: string) {
  const shareUrl = new URL('https://twitter.com/intent/tweet')
  shareUrl.searchParams.set('text', `Say something...\n${url}`)
  window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer')
}

function buildClaudePrompt(url: string) {
  return `Use web search and web fetch to read this post\n${url}\nChat about...`
}

function buildChatGptPrompt(url: string) {
  return `${url}\nChat about...`
}

function buildGenericAiPrompt(url: string) {
  return `Use web search and web fetch to read this post\n${url}\nChat about...`
}

function buildGrokPrompt(url: string) {
  return `Use web search and web fetch to read this post\n${url}\nI want to discuss this post with you.`
}

function openClaudePrompt(url: string) {
  const promptUrl = new URL('https://claude.ai/new')
  promptUrl.searchParams.set('q', buildClaudePrompt(url))
  window.open(promptUrl.toString(), '_blank', 'noopener,noreferrer')
}

function openChatGptPrompt(url: string) {
  const promptUrl = new URL('https://chatgpt.com/')
  promptUrl.searchParams.set('q', buildChatGptPrompt(url))
  promptUrl.searchParams.set('hints', 'search')
  window.open(promptUrl.toString(), '_blank', 'noopener,noreferrer')
}

function openGeminiPrompt(url: string) {
  const promptUrl = new URL('https://aistudio.google.com/app/prompts/new_chat')
  promptUrl.searchParams.set('prompt', buildGenericAiPrompt(url))
  window.open(promptUrl.toString(), '_blank', 'noopener,noreferrer')
}

function openGrokPrompt(url: string) {
  const promptUrl = new URL('https://grok.com/')
  promptUrl.searchParams.set('q', buildGrokPrompt(url))
  window.open(promptUrl.toString(), '_blank', 'noopener,noreferrer')
}

function readStoredAiProvider(): AiProvider {
  if (typeof window === 'undefined') return 'claude'

  const stored = window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY)

  if (
    stored === 'claude' ||
    stored === 'chatgpt' ||
    stored === 'gemini' ||
    stored === 'grok'
  ) {
    return stored
  }

  return 'claude'
}

function subscribeToAiProvider(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleChange = () => {
    callback()
  }

  window.addEventListener('storage', handleChange)
  window.addEventListener(AI_PROVIDER_CHANGE_EVENT, handleChange)

  return () => {
    window.removeEventListener('storage', handleChange)
    window.removeEventListener(AI_PROVIDER_CHANGE_EVENT, handleChange)
  }
}

function setStoredAiProvider(provider: AiProvider) {
  window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, provider)
  window.dispatchEvent(new Event(AI_PROVIDER_CHANGE_EVENT))
}

function openAiProvider(provider: AiProvider, url: string) {
  if (provider === 'claude') {
    openClaudePrompt(url)
    return
  }

  if (provider === 'chatgpt') {
    openChatGptPrompt(url)
    return
  }

  if (provider === 'gemini') {
    openGeminiPrompt(url)
    return
  }

  openGrokPrompt(url)
}

function getAiProviderLabel(provider: AiProvider) {
  if (provider === 'claude') return 'Ask Claude'
  if (provider === 'chatgpt') return 'Ask ChatGPT'
  if (provider === 'gemini') return 'Ask Gemini'
  return 'Ask Grok'
}

function getAiProviderName(provider: AiProvider) {
  if (provider === 'claude') return 'Claude'
  if (provider === 'chatgpt') return 'ChatGPT'
  if (provider === 'gemini') return 'Gemini'
  return 'Grok'
}

function getAiProviderIcon(provider: AiProvider) {
  if (provider === 'claude') return <ClaudeLine className={ICON_SIZE_CLASS} />
  if (provider === 'chatgpt') return <OpenaiLine className={ICON_SIZE_CLASS} />
  if (provider === 'gemini') {
    return <GoogleGeminiFill className={ICON_SIZE_CLASS} />
  }
  return <Grok2Fill className={ICON_SIZE_CLASS} />
}

export function PostShareActions({
  cid,
  tweet,
}: {
  cid?: string
  tweet?: string
}) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [isXHovered, setIsXHovered] = useState(false)
  const [isAiSelectorOpen, setIsAiSelectorOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const aiProvider = useSyncExternalStore<AiProvider>(
    subscribeToAiProvider,
    readStoredAiProvider,
    () => 'claude',
  )

  useEffect(() => {
    if (tweet) {
      getSession().then((sess) => setIsLoggedIn(!!sess))
    }
  }, [tweet])

  useEffect(() => {
    if (copyStatus === 'idle') return

    const timeout = window.setTimeout(() => {
      setCopyStatus('idle')
    }, 1500)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [copyStatus])

  function getShareUrl() {
    const url = new URL(window.location.href)
    url.search = ''
    if (cid) url.searchParams.set('cid', cid)
    return url.toString()
  }

  async function handleCopyClick() {
    try {
      await copyText(getShareUrl())
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  const copyLabel =
    copyStatus === 'copied'
      ? 'Copied full URL'
      : copyStatus === 'failed'
        ? 'Failed to copy full URL'
        : 'Copy full URL'
  const copyToastLabel =
    copyStatus === 'copied'
      ? 'Copied!'
      : copyStatus === 'failed'
        ? 'Failed'
        : ''

  const switchableAiProviders = AI_PROVIDERS.filter(
    (provider) => provider !== aiProvider,
  )

  return (
    <div className="mt-0.5 flex shrink-0 items-center gap-0.5 leading-none [&>button]:leading-none">
      <Tooltip.Provider delayDuration={480} skipDelayDuration={0}>
        <Tooltip.Root
          open={isAiSelectorOpen}
          onOpenChange={setIsAiSelectorOpen}
          disableHoverableContent={false}
        >
          <Tooltip.Trigger asChild>
            <button
              type="button"
              onClick={() => {
                openAiProvider(aiProvider, window.location.href)
              }}
              aria-label={getAiProviderLabel(aiProvider)}
              title={getAiProviderLabel(aiProvider)}
              className="
                inline-flex cursor-pointer items-center justify-center rounded-full p-1
                text-secondary transition-colors
                hover:text-primary
              "
            >
              <span className={ICON_SLOT_CLASS}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={aiProvider}
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 inline-flex items-center justify-center"
                  >
                    {getAiProviderIcon(aiProvider)}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content
              side="top"
              align="center"
              sideOffset={2}
              className="
                z-10 flex items-center gap-px rounded-full border border-border
                bg-raised p-0.5 text-primary shadow-none
              "
            >
              {switchableAiProviders.map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => {
                    setStoredAiProvider(provider)
                    setIsAiSelectorOpen(false)
                  }}
                  aria-label={`Set default AI to ${getAiProviderName(provider)}`}
                  title={`Set default AI to ${getAiProviderName(provider)}`}
                  className="
                    inline-flex cursor-pointer items-center justify-center rounded-full p-1
                    text-secondary transition-colors
                    hover:text-primary
                  "
                >
                  {getAiProviderIcon(provider)}
                </button>
              ))}
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <button
        type="button"
        onClick={() => {
          if (tweet) {
            const url = isLoggedIn
              ? `https://x.com/intent/post?in_reply_to=${tweet}`
              : `https://x.com/intent/like?tweet_id=${tweet}`
            window.open(url, '_blank', 'noopener,noreferrer')
          } else {
            openTwitterShare(window.location.href)
          }
        }}
        onMouseEnter={() => {
          setIsXHovered(true)
        }}
        onMouseLeave={() => {
          setIsXHovered(false)
        }}
        onFocus={() => {
          setIsXHovered(true)
        }}
        onBlur={() => {
          setIsXHovered(false)
        }}
        aria-label={
          tweet ? (isLoggedIn ? 'Reply on X' : 'Like on X') : 'Share on X'
        }
        title={tweet ? (isLoggedIn ? 'Reply on X' : 'Like on X') : 'Share on X'}
        className="
          inline-flex cursor-pointer items-center justify-center rounded-full p-1
          text-secondary transition-colors
          hover:text-primary
        "
      >
        <span className={ICON_SLOT_CLASS}>
          <AnimatePresence initial={false}>
            <motion.span
              key={isXHovered ? 'twitter' : 'x'}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.11, ease: 'easeOut' }}
              className="absolute inset-0 inline-flex items-center justify-center"
            >
              {isXHovered ? (
                <TwitterLine className={ICON_SIZE_CLASS} />
              ) : (
                <SocialXLine className={ICON_SIZE_CLASS} />
              )}
            </motion.span>
          </AnimatePresence>
        </span>
      </button>
      <div className="relative">
        <AnimatePresence>
          {copyStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="
                pointer-events-none absolute bottom-[calc(100%+0.25rem)] left-1/2 z-10
                -translate-x-1/2 rounded-full border border-border bg-raised
                px-2.5 py-1.5 text-[11px] leading-none text-primary shadow-none
              "
            >
              {copyToastLabel}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={() => {
            void handleCopyClick()
          }}
          aria-label={copyLabel}
          title={copyLabel}
          className="
            inline-flex cursor-pointer items-center justify-center rounded-full p-1
            text-secondary transition-colors
            hover:text-primary
          "
        >
          <span className={ICON_SLOT_CLASS}>
            <Link2Line
              className={`${ICON_SIZE_CLASS} translate-y-[1.5px] -rotate-45`}
            />
          </span>
        </button>
      </div>
    </div>
  )
}
