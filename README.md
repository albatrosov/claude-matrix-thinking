# matrix-thinking

A Claude Code mod that shows Claude's thinking as Matrix-style rain made of the
words it is thinking. Each column writes real words from the thinking, top to
bottom, and fades them out.

- **Desktop app (Code tab):** a 20-row block of rain under your prompt, from
  Claude's first thought to the end of the turn.
- **Terminal:** the same rain in the band above the prompt.
- The live thinking text is hidden while the rain falls. Each finished thinking
  block still appears in the transcript.
- Transparent background, colors from your theme, one empty column between
  columns, spread across the full width.
- No extra tokens: the mod reads the thinking summary the API already streams
  and draws it locally. It makes no model calls and adds nothing to the context.

## Requirements

The words come from thinking summaries, so turn them on:

- **Desktop app:** set the transcript view to **Thinking** or **Verbose**
  (Settings → Default transcript view, or a session's Transcript view menu).
  In Normal view the app asks for no thinking text, so there are no words.
- **Terminal:** add `"showThinkingSummaries": true` to `~/.claude/settings.json`.

Tested with Claude Code 2.1.289 in the terminal and 2.1.309 in the desktop app.

## Install

At the prompt of a terminal session:

```
/plugin install matrix-thinking --marketplace albatrosov/claude-matrix-thinking
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```
claude plugin install matrix-thinking --marketplace albatrosov/claude-matrix-thinking
```

In the desktop app, where `/plugin` does not run: click **+** next to the
prompt box, then **Plugins**, **Add marketplace** with
`albatrosov/claude-matrix-thinking`, then **Add plugin**.
