// ── Worker bridge ──────────────────────────────────────────────────────────

const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
let msgId = 0
const pending = new Map()

worker.onmessage = ({ data }) => {
  const resolve = pending.get(data.id)
  if (resolve) { pending.delete(data.id); resolve(data) }
}

function call(action, payload = {}) {
  return new Promise((resolve) => {
    const id = ++msgId
    pending.set(id, resolve)
    worker.postMessage({ id, action, payload })
  })
}

// ── State ──────────────────────────────────────────────────────────────────

let currentTokens = []
let replaceMode = false   // false = löschen, true = [ANONYMISIERT]

// ── DOM refs ───────────────────────────────────────────────────────────────

const inputEl     = document.getElementById('input')
const outputEl    = document.getElementById('output')
const analyseBtn  = document.getElementById('btn-analyse')
const purgeBtn    = document.getElementById('btn-purge')
const copyBtn     = document.getElementById('btn-copy')
const statusEl    = document.getElementById('status')
const statsEl     = document.getElementById('stats')
const modeToggle  = document.getElementById('mode-toggle')
const modeLabelEl = document.getElementById('mode-label')

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  setStatus('Wörterbuch wird geladen…', 'loading')
  analyseBtn.disabled = true

  const base = import.meta.env.BASE_URL

  const res = await call('init', { base })
  if (!res.ok) {
    setStatus(`Fehler beim Laden des Wörterbuchs: ${res.error}`, 'error')
    return
  }

  setStatus('Bereit. Text einfügen und Analyse starten.', 'ready')
  analyseBtn.disabled = false
}

// ── Analysis ───────────────────────────────────────────────────────────────

async function analyse() {
  const text = inputEl.value.trim()
  if (!text) { setStatus('Bitte zuerst Text eingeben.', 'warn'); return }

  setStatus('Analyse läuft…', 'loading')
  analyseBtn.disabled = true
  outputEl.innerHTML = ''

  const res = await call('analyse', { text })
  analyseBtn.disabled = false

  if (!res.ok) { setStatus(`Fehler: ${res.error}`, 'error'); return }

  currentTokens = res.tokens
  renderOutput()
}

// ── Render ─────────────────────────────────────────────────────────────────

function renderOutput() {
  outputEl.innerHTML = ''
  let nameCount = 0

  currentTokens.forEach((tok, idx) => {
    if (tok.type === 'space') {
      outputEl.appendChild(document.createTextNode(tok.text))
      return
    }

    if (tok.type === 'name' || tok.type === 'honorific-name') {
      nameCount++
      const span = document.createElement('span')
      span.className = tok.type === 'honorific-name' ? 'token name honorific' : 'token name'
      span.textContent = tok.text
      span.title = replaceMode ? 'Klicken → [ANONYMISIERT]' : 'Klicken zum Entfernen'
      span.dataset.idx = idx
      span.addEventListener('click', () => handleTokenClick(idx))
      outputEl.appendChild(span)
    } else if (tok.type === 'anonymised') {
      const span = document.createElement('span')
      span.className = 'token anonymised'
      span.textContent = '[ANONYMISIERT]'
      outputEl.appendChild(span)
    } else {
      outputEl.appendChild(document.createTextNode(tok.text))
    }
  })

  const total = currentTokens.filter(t => t.type !== 'space').length
  statsEl.textContent = nameCount > 0
    ? `${nameCount} verdächtige${nameCount === 1 ? 's Wort' : ' Wörter'} von ${total} erkannt`
    : `Keine verdächtigen Wörter gefunden (${total} Tokens)`

  setStatus(
    nameCount > 0
      ? `Markierte Wörter per Klick ${replaceMode ? 'ersetzen' : 'entfernen'} oder „Namen entfernen" drücken.`
      : 'Analyse abgeschlossen.',
    'ready'
  )
  purgeBtn.disabled = nameCount === 0
  copyBtn.disabled = false
}

function handleTokenClick(idx) {
  if (replaceMode) {
    currentTokens[idx] = { ...currentTokens[idx], type: 'anonymised' }
  } else {
    currentTokens[idx] = { ...currentTokens[idx], type: 'removed', text: '' }
  }
  renderOutput()
}

// ── Purge (alle Namen) ─────────────────────────────────────────────────────

function purge() {
  currentTokens = currentTokens.map(tok => {
    if (tok.type !== 'name' && tok.type !== 'honorific-name') return tok
    return replaceMode
      ? { ...tok, type: 'anonymised' }
      : { ...tok, type: 'removed', text: '' }
  })
  renderOutput()
}

// ── Mode toggle ────────────────────────────────────────────────────────────

function updateModeLabel() {
  modeLabelEl.textContent = replaceMode ? '[ANONYMISIERT]' : 'Löschen'
  purgeBtn.textContent = replaceMode ? 'Namen ersetzen' : 'Namen entfernen'
}

modeToggle.addEventListener('change', () => {
  replaceMode = modeToggle.checked
  updateModeLabel()
  if (currentTokens.length) renderOutput()
})

// ── Copy ───────────────────────────────────────────────────────────────────

async function copyToClipboard() {
  const text = outputEl.innerText
  try {
    await navigator.clipboard.writeText(text)
    copyBtn.textContent = 'Kopiert!'
    setTimeout(() => { copyBtn.textContent = 'In Zwischenablage kopieren' }, 2000)
  } catch {
    setStatus('Kopieren fehlgeschlagen — Browser-Berechtigung fehlt.', 'error')
  }
}

// ── Status helper ──────────────────────────────────────────────────────────

function setStatus(msg, type = 'ready') {
  statusEl.textContent = msg
  statusEl.className = `status ${type}`
}

// ── Event listeners ────────────────────────────────────────────────────────

analyseBtn.addEventListener('click', analyse)
purgeBtn.addEventListener('click', purge)
copyBtn.addEventListener('click', copyToClipboard)

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyse()
})

updateModeLabel()
init()
