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
let nameMap = new Map()   // lowercase name → "Name-1", "Name-2", …
let nameCounter = 0
let activePopup = null

// ── DOM refs ───────────────────────────────────────────────────────────────

const inputEl      = document.getElementById('input')
const outputEl     = document.getElementById('output')
const analyseBtn   = document.getElementById('btn-analyse')
const purgeBtn     = document.getElementById('btn-purge')
const copyBtn      = document.getElementById('btn-copy')
const statusEl     = document.getElementById('status')
const headerStatusEl = document.getElementById('header-status')
const inputHintEl  = document.getElementById('input-hint')
const statsEl      = document.getElementById('stats')

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  setStatus('Wörterbuch wird geladen…', 'loading')
  analyseBtn.disabled = true

  const dictUrl = new URL('dictionary.json', window.location.href).href
  const namesUrl = new URL('firstnames.json', window.location.href).href
  const res = await call('init', { dictUrl, namesUrl })
  if (!res.ok) {
    setStatus(`Fehler beim Laden des Wörterbuchs: ${res.error}`, 'error')
    return
  }

  setStatus('Text einfügen und Analyse starten.', 'ready')
  analyseBtn.disabled = false
}

// ── Analysis ───────────────────────────────────────────────────────────────

async function analyse() {
  const text = inputEl.value.trim()
  if (!text) { setStatus('Bitte zuerst Text eingeben.', 'warn'); return }

  setStatus('Analyse läuft…', 'loading')
  analyseBtn.disabled = true
  outputEl.innerHTML = ''
  closePopup()

  const res = await call('analyse', { text })
  analyseBtn.disabled = false
  if (!res.ok) { setStatus(`Fehler: ${res.error}`, 'error'); return }

  currentTokens = res.tokens
  nameMap = new Map()
  nameCounter = 0
  renderOutput()
}

// ── Name mapping ───────────────────────────────────────────────────────────

function normKey(text) {
  return text.replace(/^[^a-zA-ZäöüÄÖÜß]+|[^a-zA-ZäöüÄÖÜß]+$/gu, '').toLowerCase()
}

function getPlaceholder(text) {
  const key = normKey(text)
  if (!nameMap.has(key)) {
    nameCounter++
    nameMap.set(key, `Name-${nameCounter}`)
  }
  return nameMap.get(key)
}

function peekPlaceholder(text) {
  const key = normKey(text)
  if (nameMap.has(key)) return nameMap.get(key)
  return `Name-${nameCounter + 1}`
}

// Replace all tokens with the same name in one go
function replaceAllByName(text) {
  const key = normKey(text)
  const placeholder = getPlaceholder(text)
  currentTokens = currentTokens.map(tok => {
    if ((tok.type === 'name' || tok.type === 'honorific-name') && normKey(tok.text) === key) {
      return { ...tok, type: 'replaced', placeholder }
    }
    return tok
  })
}

// ── Popup ──────────────────────────────────────────────────────────────────

function closePopup() {
  if (activePopup) { activePopup.remove(); activePopup = null }
}

function showPopup(span, idx) {
  closePopup()

  const tok = currentTokens[idx]
  const placeholder = peekPlaceholder(tok.text)

  const popup = document.createElement('div')
  popup.className = 'name-popup'

  const btnDelete = document.createElement('button')
  btnDelete.className = 'popup-btn delete'
  btnDelete.textContent = '× Löschen'
  btnDelete.addEventListener('click', (e) => {
    e.stopPropagation()
    currentTokens[idx] = { ...tok, type: 'removed', text: '' }
    closePopup()
    renderOutput()
  })

  const btnFalsePositive = document.createElement('button')
  btnFalsePositive.className = 'popup-btn false-positive'
  btnFalsePositive.textContent = '✓ Kein Name'
  btnFalsePositive.addEventListener('click', (e) => {
    e.stopPropagation()
    currentTokens[idx] = { ...tok, type: 'word' }
    closePopup()
    renderOutput()
  })

  const btnReplace = document.createElement('button')
  btnReplace.className = 'popup-btn replace'
  btnReplace.textContent = `↔ ${placeholder}`
  btnReplace.addEventListener('click', (e) => {
    e.stopPropagation()
    replaceAllByName(tok.text)
    closePopup()
    renderOutput()
  })

  popup.appendChild(btnDelete)
  popup.appendChild(btnFalsePositive)
  popup.appendChild(btnReplace)

  // Position unterhalb des Tokens
  span.style.position = 'relative'
  span.appendChild(popup)
  activePopup = popup
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
      span.title = 'Klicken für Optionen'
      span.addEventListener('click', (e) => {
        e.stopPropagation()
        showPopup(span, idx)
      })
      outputEl.appendChild(span)
    } else if (tok.type === 'replaced') {
      const span = document.createElement('span')
      span.className = 'token replaced'
      span.textContent = tok.placeholder
      outputEl.appendChild(span)
    } else {
      outputEl.appendChild(document.createTextNode(tok.text ?? ''))
    }
  })

  const total = currentTokens.filter(t => t.type !== 'space').length
  statsEl.textContent = nameCount > 0
    ? `${nameCount} verdächtige${nameCount === 1 ? 's Wort' : ' Wörter'} von ${total} erkannt`
    : `Keine verdächtigen Wörter gefunden (${total} Tokens)`

  setStatus(
    nameCount > 0 ? 'Auf markierte Wörter klicken — Löschen oder Name-X ersetzen.' : 'Analyse abgeschlossen.',
    'ready'
  )
  purgeBtn.disabled = nameCount === 0
  copyBtn.disabled = false
}

// ── Bulk replace ───────────────────────────────────────────────────────────

function purge() {
  // Alle verbleibenden Namen automatisch nummerieren und ersetzen
  currentTokens = currentTokens.map(tok => {
    if (tok.type !== 'name' && tok.type !== 'honorific-name') return tok
    const placeholder = getPlaceholder(tok.text)
    return { ...tok, type: 'replaced', placeholder }
  })
  closePopup()
  renderOutput()
}

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
  inputHintEl.textContent = msg
}

// ── Event listeners ────────────────────────────────────────────────────────

analyseBtn.addEventListener('click', analyse)
purgeBtn.addEventListener('click', purge)
copyBtn.addEventListener('click', copyToClipboard)

// Popup schließen bei Klick außerhalb
document.addEventListener('click', closePopup)

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyse()
})

init()
