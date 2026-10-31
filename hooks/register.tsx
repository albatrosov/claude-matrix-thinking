import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Rain } from '../types'

const EMPTY: Rain = { words: [], seq: 0, isRaining: false }
const rain = atom({ plugin: 'matrix-thinking', key: 'rain' } as const, EMPTY)
// The prompt that started the running turn: its row is where the rain falls.
const prompt = atom({ plugin: 'matrix-thinking', key: 'prompt' } as const, '')

// Words with the punctuation and markdown around them trimmed off.
const clean = (parts: string[]) =>
  parts.map(w => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean)

export const register: Register = on => {
  on('turn.start', async ($, e, next) => {
    if (!e.agentId) {
      await update($, rain, () => EMPTY)
      if (e.text.trim()) await update($, prompt, () => e.text.trim())
    }

    return next(e)
  })

  // The rain stays from the first thought to the end of the turn: a 40-row
  // block that came and went with each thinking step would shake the turn.
  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) await update($, rain, r => ({ ...r, isRaining: false }))

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (e.agentId) return yield* next(e)

    // The rain takes the place of the live thinking text where it falls (the
    // desktop and the terminal), so those chunks are kept from it; the block
    // the transcript records is the engine's and still holds the text.
    const hide = (await $.session.surfaces()).some(s => s === 'desktop' || s === 'terminal')
    let carry = ''
    let fresh: string[] = []

    const flush = () => {
      const add = fresh
      fresh = []

      return update($, rain, r => ({
        words: [...r.words, ...add].slice(-200),
        seq: r.seq + add.length,
        isRaining: true,
      }))
    }

    for await (const c of next(e)) {
      if (c.kind === 'thinking') {
        const parts = (carry + c.text).split(/\s+/)
        carry = parts.pop() ?? ''
        fresh.push(...clean(parts))
        if (fresh.length >= 8) await flush()
        if (hide) continue
      }

      yield c
    }

    fresh.push(...clean([carry]))
    if (fresh.length) await flush()
  })

  // In the terminal the rain falls in the band above the prompt, which
  // redraws live.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || e.props.hasSurvey) return next(e)

    const { words, seq, isRaining } = await read($, rain)

    if (!isRaining || !words.length) return next(e)

    const { Client } = $.ui.resolve(e)

    return <Client key="rain" module="./rain.tsx" props={{ words, seq }} width={e.props.bodyColumns} />
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    // Only that row reads the rain, so a word update redraws it alone.
    if (e.surface !== 'desktop' || e.props.text.trim() !== (await read($, prompt))) return next(e)

    const { words, seq, isRaining } = await read($, rain)

    if (!isRaining || !words.length) return next(e)

    const { Box, Client } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {await next(e)}
        <Client key="rain" module="./rain.tsx" props={{ words, seq }} width="100%" />
      </Box>
    )
  })
}
