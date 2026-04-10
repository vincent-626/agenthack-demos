import React, { useEffect, useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { java } from '@codemirror/lang-java'
import { php } from '@codemirror/lang-php'
import { go } from '@codemirror/lang-go'
import { EditorView, Decoration } from '@codemirror/view'
import { StateField, StateEffect } from '@codemirror/state'

// --- Line highlight extension ---
const addHighlightedLines = StateEffect.define()
const clearHighlights = StateEffect.define()

const highlightedLinesField = StateField.define({
  create() {
    return Decoration.none
  },
  update(deco, tr) {
    deco = deco.map(tr.changes)
    for (const effect of tr.effects) {
      if (effect.is(clearHighlights)) {
        deco = Decoration.none
      } else if (effect.is(addHighlightedLines)) {
        const lineNumbers = effect.value
        const decorations = []
        for (const lineNo of lineNumbers) {
          try {
            const line = tr.state.doc.line(lineNo)
            decorations.push(
              Decoration.line({ class: 'cm-vuln-line' }).range(line.from)
            )
          } catch (e) { /* line out of range */ }
        }
        if (decorations.length > 0) {
          decorations.sort((a, b) => a.from - b.from)
          deco = deco.update({ add: decorations })
        }
      }
    }
    return deco
  },
  provide: (f) => EditorView.decorations.from(f),
})

const highlightTheme = EditorView.baseTheme({
  '.cm-vuln-line': {
    backgroundColor: 'rgba(239, 68, 68, 0.12) !important',
    borderLeft: '3px solid #ef4444',
  },
})

function getLanguageExtension(lang) {
  switch (lang) {
    case 'python': return python()
    case 'javascript': return javascript()
    case 'typescript': return javascript({ typescript: true })
    case 'java': return java()
    case 'php': return php()
    case 'go': return go()
    default: return javascript()
  }
}

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0d1117',
    color: '#e6edf3',
    height: '100%',
  },
  '.cm-content': {
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    fontSize: '13px',
    caretColor: '#6366f1',
    padding: '8px 0',
  },
  '.cm-gutters': {
    backgroundColor: '#0d1117',
    borderRight: '1px solid #21262d',
    color: '#484f58',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 4px',
    minWidth: '40px',
  },
  '.cm-activeLineGutter': { backgroundColor: '#1c2128' },
  '.cm-activeLine': { backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  '.cm-selectionBackground': { backgroundColor: '#3b4261 !important' },
  '.cm-cursor': { borderLeftColor: '#6366f1' },
  '.cm-scroller': { overflow: 'auto', height: '100%' },
}, { dark: true })

export default function CodeEditor({ code, onChange, language, highlightLines = [], readOnly = false }) {
  const extensions = useMemo(() => [
    getLanguageExtension(language),
    darkTheme,
    highlightedLinesField,
    highlightTheme,
    EditorView.lineWrapping,
  ], [language])

  // We use a ref to the view to apply effects
  const [view, setView] = React.useState(null)

  useEffect(() => {
    if (!view) return
    const lineNumbers = highlightLines.filter(n => n > 0)
    view.dispatch({
      effects: [
        clearHighlights.of(null),
        ...(lineNumbers.length > 0 ? [addHighlightedLines.of(lineNumbers)] : []),
      ],
    })
  }, [view, highlightLines])

  return (
    <CodeMirror
      value={code}
      onChange={readOnly ? undefined : onChange}
      extensions={extensions}
      readOnly={readOnly}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightActiveLine: true,
        highlightSelectionMatches: false,
        closeBracketsKeymap: false,
        searchKeymap: false,
        foldKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
      }}
      onCreateEditor={(view) => setView(view)}
      style={{ height: '100%' }}
    />
  )
}
