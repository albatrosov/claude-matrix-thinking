import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const ROW = (text: string) =>
  ({
    plugin: 'matrix-thinking',
    component: 'UserMessage',
    requestId: text,
    props: { text, origin: { kind: 'composer' }, isExpanded: false },
  }) as const

// Stands for the engine's own drawing beneath the mod.
const engine = (on: On) =>
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)

    return <Text>engine</Text>
  })

test('thinking words reach the rain and leave the live preview', async ($, on) => {
  let surfaces: ('desktop' | 'vscode')[] = ['desktop']
  const writes: { isRaining?: boolean; words?: string[] }[] = []
  on('state.set', ($, e, next) => {
    writes.push(e.value as never)

    return next(e)
  })
  on('session.surfaces', () => ({ value: surfaces }))
  on('turn.step', async function* (_, e) {
    yield { kind: 'thinking', index: 0, text: 'Let me ch' }
    yield { kind: 'thinking', index: 0, text: 'eck the **ty' }
    yield { kind: 'thinking', index: 0, text: 'pes** first.' }
    yield { kind: 'text', index: 1, text: 'Hi' }
    return { turnId: e.turnId, index: e.index, answer: 'Hi', toolUses: [], stopReason: 'end_turn', usage: null }
  })

  const step = async () => {
    const shown: string[] = []
    for await (const c of $.turn.step({ turnId: 't1', index: 0, model: 'opus', messageCount: 1 })) {
      shown.push(c.kind)
    }
    return shown
  }

  expect(await step()).toEqual(['text'])
  expect(writes.at(-1)).toMatchObject({ words: ['Let', 'me', 'check', 'the', 'types', 'first'], isRaining: true })

  // No rain falls in VS Code, so its live thinking stays.
  surfaces = ['vscode']
  expect(await step()).toEqual(['thinking', 'thinking', 'thinking', 'text'])
})

test('in the terminal the rain falls above the prompt while raining', async ($, on) => {
  let isRaining = true
  on('state.get', () => ({ value: { value: { words: ['alpha'], seq: 1, isRaining }, version: 1 } }))
  engine(on)

  const band = {
    plugin: 'matrix-thinking',
    component: 'AbovePrompt',
    requestId: 'band',
    props: {
      hasSurvey: false,
      isWorking: true,
      maxRows: 30,
      bodyColumns: 60,
      scroll: { offset: 0, bodyRows: 30 },
      view: {},
    },
    surface: 'terminal',
  } as const

  let ui = await $.ui.mount(band)
  expect(await ui.find({ type: 'Client' })).toBeDefined()
  await ui.unmount()

  isRaining = false
  ui = await $.ui.mount(band)
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  await ui.unmount()
})

test('every column of the width rains the thinking words in theme colours', async ($, on) => {
  const rainy = { words: ['alpha', 'beta'], seq: 2, isRaining: true }
  on('state.get', (_, e) => ({ value: { value: e.key === 'prompt' ? 'hi' : rainy, version: 1 } }))
  engine(on)

  const ui = await $.ui.mount({ ...ROW('hi'), surface: 'desktop' })
  await ui.resize({ columns: 20, rows: 1, in: 'rain' })
  await ui.advance(4000)

  const texts = await ui.findAll({ type: 'Text', in: 'rain' })
  // A column every other cell of the width, twenty glyphs tall.
  const columns = texts.map(t => t.text.split('\n')).filter(lines => lines.length === 20)
  expect(columns).toHaveLength(10)

  for (const t of texts) {
    expect(t.props.backgroundColor).toBeUndefined()
    if (t.props.color !== undefined) expect(['text', 'inactive', 'subtle']).toContain(t.props.color)
  }

  const runs = columns.flatMap(lines => lines.join('').split(' ').filter(Boolean))
  expect(runs.length).toBeGreaterThan(10)
  for (const run of runs) expect('alpha beta alpha'.includes(run) || 'beta alpha beta'.includes(run)).toBe(true)

  await ui.unmount()
})

test('only the running prompt row rains, and only while raining', async ($, on) => {
  let isRaining = true
  on('state.get', (_, e) => ({
    value: { value: e.key === 'prompt' ? 'hi' : { words: ['alpha'], seq: 1, isRaining }, version: 1 },
  }))
  engine(on)

  for (const [text, surface, hasRain] of [
    ['hi', 'desktop', true],
    ['older prompt', 'desktop', false],
    ['hi', 'terminal', false],
  ] as const) {
    const ui = await $.ui.mount({ ...ROW(text), surface })
    expect((await ui.find({ type: 'Client' })) !== undefined).toBe(hasRain)
    await ui.unmount()
  }

  isRaining = false
  const ui = await $.ui.mount({ ...ROW('hi'), surface: 'desktop' })
  expect(await ui.find({ type: 'Client' })).toBeUndefined()
  await ui.unmount()
})
