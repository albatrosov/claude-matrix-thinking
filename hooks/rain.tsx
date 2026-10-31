import type { ClientModule } from 'claude-code'

type Props = { words: string[]; seq: number }
// One stream per column: `text` is written downward from row `top`, a glyph
// per row; `head` is how many glyphs are written so far.
type Stream = { text: string; top: number; head: number; speed: number }
type State = { streams: (Stream | null)[]; taken: number }

const TRAIL = 16
// The region is as tall as what this draws, so the height is set here and
// not read back from the region.
const ROWS = 20

// Glyph looks by age, all from the theme on a transparent background: the
// head in bold body text, the trail fading through the theme's quieter text.
const LOOK = {
  head: { color: 'text', bold: true },
  body: { color: 'text' },
  tail: { color: 'inactive' },
  end: { color: 'subtle' },
} as const
type Look = (typeof LOOK)[keyof typeof LOOK]
const lookOf = (age: number): Look =>
  age < 1 ? LOOK.head : age < 5 ? LOOK.body : age < 11 ? LOOK.tail : LOOK.end

// ponytail: module-level so the timer reads the newest props; fine while one
// rain is mounted at a time, per-instance holder if not.
let feed: Props = { words: [], seq: 0 }

// Next word in thinking order; once caught up, a random recent one.
function pick(st: { taken: number }): string {
  const { words, seq } = feed
  if (!words.length) return ''
  if (st.taken > seq) st.taken = 0
  st.taken = Math.max(st.taken, seq - words.length)
  if (st.taken < seq) return words[st.taken++ - (seq - words.length)] ?? ''
  return words[Math.floor(Math.random() * words.length)] ?? ''
}

function tick(st: State, cols: number): State {
  const next = { taken: st.taken }
  const streams = Array.from({ length: cols }, (_, i) => {
    const d = st.streams[i]
    if (d && d.head - TRAIL < Math.min(d.text.length, ROWS - d.top)) {
      return { ...d, head: d.head + d.speed }
    }
    // An empty column starts a new stream within a few frames, so every
    // column of the width keeps raining.
    if (Math.random() > 0.3) return null
    const top = Math.floor((Math.random() * ROWS) / 3)
    let text = pick(next)
    while (text && text.length < ROWS - top) text += ' ' + pick(next)
    return text ? { text, top, head: 0, speed: 0.4 + Math.random() * 0.6 } : null
  })

  return { streams, taken: next.taken }
}

const Rain: ClientModule<Props, State> = (props, s) => {
  const { Box, Text } = s.elements
  feed = props

  if (!s.state) {
    s.every(80, () => {
      if (s.state) s.setState(tick(s.state, Math.ceil(s.columns / 2)))
    })
    s.setState({ streams: [], taken: 0 })
  }

  // One Text per column, a glyph per line: the desktop draws text in a
  // proportional face, so rows of text would not line up into columns, while
  // equal-width column boxes do, and spread across the whole width. Each box
  // is two cells, its glyph on the left: a one-cell gap between columns.
  const streams = s.state?.streams ?? []
  const columns = Array.from({ length: Math.ceil(s.columns / 2) }, (_, i) => {
    const d = streams[i]
    const runs: (string | ReturnType<typeof Text>)[] = []
    let run = ''
    let look: Look | null = null
    const flush = () => {
      if (run) runs.push(look ? <Text {...look}>{run}</Text> : run)
      run = ''
    }
    for (let r = 0; r < ROWS; r++) {
      const k = d ? r - d.top : -1
      const age = d ? d.head - k : -1
      const ch = (d && age >= 0 && age < TRAIL ? d.text[k] : undefined) ?? ' '
      // A blank shows the same in any look, so it joins the run it is in.
      if (ch !== ' ' && lookOf(age) !== look) {
        flush()
        look = lookOf(age)
      }
      run += ch + (r < ROWS - 1 ? '\n' : '')
    }
    flush()

    return (
      <Box width={2} flexGrow={1}>
        <Text>{runs}</Text>
      </Box>
    )
  })

  return (
    <Box flexDirection="row" width="100%" height={ROWS}>
      {columns}
    </Box>
  )
}

export default Rain
