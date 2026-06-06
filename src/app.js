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
let nameMap     = new Map()   // normKey → "Name-N"
let nameCounter = 0
let emailMap    = new Map()   // lowercase email → "Email-N"
let emailCounter = 0
let phoneMap    = new Map()   // phone string → "Tel-N"
let phoneCounter = 0
let dateMap     = new Map()   // lowercase date → "Datum-N"
let dateCounter = 0
let activePopup = null

// ── DOM refs ───────────────────────────────────────────────────────────────

const inputEl      = document.getElementById('input')
const outputEl     = document.getElementById('output')
const analyseBtn   = document.getElementById('btn-analyse')
const purgeBtn     = document.getElementById('btn-purge')
const copyBtn      = document.getElementById('btn-copy')
const optDatesEl   = document.getElementById('opt-dates')
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

  const options = { detectDates: optDatesEl?.checked ?? false }
  const res = await call('analyse', { text, options })
  analyseBtn.disabled = false
  if (!res.ok) { setStatus(`Fehler: ${res.error}`, 'error'); return }

  currentTokens = res.tokens
  nameMap = new Map(); nameCounter = 0
  emailMap = new Map(); emailCounter = 0
  phoneMap = new Map(); phoneCounter = 0
  dateMap = new Map(); dateCounter = 0
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

// ── Special-token placeholders (email / phone / date) ─────────────────────

function getSpecialPlaceholder(text, type) {
  if (type === 'email') {
    const k = text.toLowerCase()
    if (!emailMap.has(k)) { emailCounter++; emailMap.set(k, `Email-${emailCounter}`) }
    return emailMap.get(k)
  }
  if (type === 'phone') {
    const k = text.replace(/\s+/g, ' ')
    if (!phoneMap.has(k)) { phoneCounter++; phoneMap.set(k, `Tel-${phoneCounter}`) }
    return phoneMap.get(k)
  }
  if (type === 'date') {
    const k = text.toLowerCase()
    if (!dateMap.has(k)) { dateCounter++; dateMap.set(k, `Datum-${dateCounter}`) }
    return dateMap.get(k)
  }
  return text
}

function peekSpecialPlaceholder(text, type) {
  if (type === 'email') {
    const k = text.toLowerCase(); return emailMap.get(k) || `Email-${emailCounter + 1}`
  }
  if (type === 'phone') {
    const k = text.replace(/\s+/g, ' '); return phoneMap.get(k) || `Tel-${phoneCounter + 1}`
  }
  if (type === 'date') {
    const k = text.toLowerCase(); return dateMap.get(k) || `Datum-${dateCounter + 1}`
  }
  return text
}

function replaceAllBySpecial(text, type) {
  const ph = getSpecialPlaceholder(text, type)
  currentTokens = currentTokens.map(tok =>
    (tok.type === type && tok.text === text) ? { ...tok, type: 'replaced', placeholder: ph } : tok
  )
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

const FP_LABELS = {
  'name': '✓ Kein Name',
  'honorific-name': '✓ Kein Name',
  'email': '✓ Keine E-Mail',
  'phone': '✓ Kein Telefon',
  'date': '✓ Kein Datum',
}

function showPopup(span, idx) {
  closePopup()

  const tok = currentTokens[idx]
  const isSpecial = tok.type === 'email' || tok.type === 'phone' || tok.type === 'date'
  const placeholder = isSpecial ? peekSpecialPlaceholder(tok.text, tok.type) : peekPlaceholder(tok.text)

  const popup = document.createElement('div')
  popup.className = 'name-popup'

  const btnDelete = document.createElement('button')
  btnDelete.className = 'popup-btn delete'
  btnDelete.textContent = '× Löschen'
  btnDelete.addEventListener('click', (e) => {
    e.stopPropagation()
    currentTokens[idx] = { ...tok, type: 'removed', text: '' }
    closePopup(); renderOutput()
  })

  const btnFP = document.createElement('button')
  btnFP.className = 'popup-btn false-positive'
  btnFP.textContent = FP_LABELS[tok.type] || '✓ Behalten'
  btnFP.addEventListener('click', (e) => {
    e.stopPropagation()
    currentTokens[idx] = { ...tok, type: 'word' }
    closePopup(); renderOutput()
  })

  const btnReplace = document.createElement('button')
  btnReplace.className = 'popup-btn replace'
  btnReplace.textContent = `↔ ${placeholder}`
  btnReplace.addEventListener('click', (e) => {
    e.stopPropagation()
    if (isSpecial) replaceAllBySpecial(tok.text, tok.type)
    else replaceAllByName(tok.text)
    closePopup(); renderOutput()
  })

  popup.append(btnDelete, btnFP, btnReplace)

  span.style.position = 'relative'
  span.appendChild(popup)
  activePopup = popup
}

// ── Render ─────────────────────────────────────────────────────────────────

const SPECIAL_TYPES = new Set(['email', 'phone', 'date'])

function renderOutput() {
  outputEl.innerHTML = ''
  let nameCount = 0
  let emailCount = 0
  let phoneCount = 0
  let dateCount = 0

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
      span.addEventListener('click', (e) => { e.stopPropagation(); showPopup(span, idx) })
      outputEl.appendChild(span)
    } else if (SPECIAL_TYPES.has(tok.type)) {
      if (tok.type === 'email') emailCount++
      else if (tok.type === 'phone') phoneCount++
      else if (tok.type === 'date') dateCount++
      const span = document.createElement('span')
      span.className = `token ${tok.type}`
      span.textContent = tok.text
      span.title = 'Klicken für Optionen'
      span.addEventListener('click', (e) => { e.stopPropagation(); showPopup(span, idx) })
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
  const totalSpecial = nameCount + emailCount + phoneCount + dateCount

  if (totalSpecial === 0) {
    statsEl.textContent = `Nichts gefunden (${total} Tokens)`
  } else {
    const parts = []
    if (nameCount > 0) parts.push(`${nameCount} Name${nameCount !== 1 ? 'n' : ''}`)
    if (emailCount > 0) parts.push(`${emailCount} E-Mail${emailCount !== 1 ? 's' : ''}`)
    if (phoneCount > 0) parts.push(`${phoneCount} Telefon${phoneCount !== 1 ? 'nummern' : 'nummer'}`)
    if (dateCount > 0) parts.push(`${dateCount} Datum${dateCount !== 1 ? 'sangaben' : ''}`)
    statsEl.textContent = parts.join(', ') + ` von ${total} Tokens`
  }

  setStatus(
    totalSpecial > 0 ? 'Auf markierte Stellen klicken — oder Alle ersetzen.' : 'Analyse abgeschlossen.',
    'ready'
  )
  purgeBtn.disabled = totalSpecial === 0
  copyBtn.disabled = false
}

// ── Bulk replace ───────────────────────────────────────────────────────────

function purge() {
  currentTokens = currentTokens.map(tok => {
    if (tok.type === 'name' || tok.type === 'honorific-name') {
      return { ...tok, type: 'replaced', placeholder: getPlaceholder(tok.text) }
    }
    if (SPECIAL_TYPES.has(tok.type)) {
      return { ...tok, type: 'replaced', placeholder: getSpecialPlaceholder(tok.text, tok.type) }
    }
    return tok
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

// ── NameScrub+ Modal ───────────────────────────────────────────────────────

const plusModal    = document.getElementById('plus-modal')
const btnPlusOpen  = document.getElementById('btn-plus-open')
const btnPlusClose = document.getElementById('btn-plus-close')
const plusBackdrop = plusModal?.querySelector('.plus-modal-backdrop')

function openPlusModal() {
  plusModal.hidden = false
  document.body.style.overflow = 'hidden'
  btnPlusClose.focus()
}

function closePlusModal() {
  plusModal.hidden = true
  document.body.style.overflow = ''
  btnPlusOpen.focus()
}

btnPlusOpen?.addEventListener('click', openPlusModal)
btnPlusClose?.addEventListener('click', closePlusModal)
plusBackdrop?.addEventListener('click', closePlusModal)

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && plusModal && !plusModal.hidden) closePlusModal()
})

// ── Event listeners ────────────────────────────────────────────────────────

analyseBtn.addEventListener('click', analyse)
purgeBtn.addEventListener('click', purge)
copyBtn.addEventListener('click', copyToClipboard)

// Toggle date legend item visibility when checkbox changes
const legendDateEl = document.getElementById('legend-date')
optDatesEl?.addEventListener('change', () => {
  if (legendDateEl) legendDateEl.hidden = !optDatesEl.checked
})

// Popup schließen bei Klick außerhalb
document.addEventListener('click', closePopup)

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) analyse()
})

init()
