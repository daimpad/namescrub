/**
 * Pure analysis functions — no Worker / fetch dependencies.
 * Can be imported directly in tests or bundled into worker.js.
 */

export const HONORIFICS = new Set([
  // German titles
  'herr', 'frau', 'fräulein',
  'dr', 'prof', 'professor', 'professorin',
  'doktor', 'doktorin',
  'mag', 'ing', 'dipl',
  'bsc', 'msc', 'mba', 'phd',
  'sr', 'jr',
  // Church / official
  'pastor', 'pastorin', 'pfarrer', 'pfarrerin',
  'bischof', 'kardinal', 'papst',
  'senator', 'senatorin', 'minister', 'ministerin',
  'präsident', 'präsidentin', 'direktor', 'direktorin',
  'bürgermeister', 'bürgermeisterin', 'bundeskanzler', 'bundeskanzlerin',
  // Military
  'general', 'oberst', 'hauptmann', 'leutnant',
  // Courtesy / nobility
  'herren', 'damen', 'fürst', 'fürstin', 'graf', 'gräfin', 'baron', 'baronin',
])

// Nobility/origin particles — transparent when looking for honorific context
export const PARTICLES = new Set([
  'von', 'van', 'de', 'du', 'zu', 'zur', 'zum',
  'ten', 'den', 'la', 'le', 'el', 'af', 'av', 'der',
])

// Very common German surnames that also exist as dictionary words (occupations,
// adjectives). Flagged as name candidates even when the dict would return true.
export const COMMON_SURNAMES = new Set([
  'müller', 'schneider', 'fischer', 'meyer', 'weber', 'schulz', 'wagner',
  'becker', 'hoffmann', 'schäfer', 'koch', 'bauer', 'richter', 'klein',
  'wolf', 'schröder', 'neumann', 'schwarz', 'zimmermann', 'braun',
  'krüger', 'hofmann', 'hartmann', 'lange', 'schmitt', 'werner', 'schmitz',
  'krause', 'meier', 'lehmann', 'schmid', 'schulze', 'maier', 'köhler',
  'herrmann', 'könig', 'walter', 'mayer', 'huber', 'kaiser', 'fuchs',
  'lang', 'möller', 'weiß', 'jung', 'hahn', 'schubert', 'vogel',
  'keller', 'frank', 'berger', 'winkler', 'roth', 'beck', 'baumann',
  'schuster', 'simon', 'böhm', 'winter', 'kraus', 'kramer', 'ritter',
  'engel', 'stern', 'sommer', 'graf', 'kurz', 'sauer', 'gross', 'groß',
])

// Word endings strongly associated with German surnames.
export const NAME_SUFFIX_RE = /(mann|stein|berg|thal|tal|feld|burg|hausen|dorf|beck|ow|ke|ki)$/i

// Endings characteristic of German adjectives and adverbs — never names.
export const WORD_SUFFIX_RE = /(lich|isch|haft|sam|bar|los|voll|reich|arm|weise|mäßig|artig|fähig|würdig|fertig|bereit|wert|ung|schaft|heit|keit|tum|nis|sal|tion|sion|ismus|ität|ment|enz)$/i

// German legal / organisational forms — never personal names.
export const LEGAL_FORMS = new Set([
  'gmbh', 'ag', 'kg', 'kgaa', 'ohg', 'gbr', 'ug', 'ev', 'se',
  'mbh', 'sarl', 'llc', 'ltd', 'inc', 'bv', 'nv',
])

// Proper nouns frequently appearing in German text that are NOT person names.
// Tech brands, platforms and widely used loanwords that would otherwise be
// classified as name candidates (unknown uppercase mid-sentence words).
export const KNOWN_NON_PERSONS = new Set([
  // Tech companies / platforms
  'google','apple','microsoft','amazon','meta','netflix','spotify',
  'facebook','instagram','twitter','youtube','whatsapp','telegram',
  'tiktok','linkedin','snapchat','pinterest','reddit','twitch',
  'paypal','ebay','airbnb','uber','tesla',
  // Crypto / finance
  'bitcoin','ethereum','blockchain',
  // Generic tech terms used as proper nouns
  'internet','intranet','software','hardware','podcast',
  'android','ios','linux','windows','macos',
  // News / media orgs commonly abbreviated or written as single proper nouns
  'spiegel','focus','bild','stern','zeit',
])

// Abbreviations that end in "." but are NOT sentence boundaries.
export const SENT_ABBREV = new Set([
  'dr', 'prof', 'hr', 'fr', 'sr', 'jr', 'mag', 'ing', 'dipl',
  'nr', 'str', 'tel', 'fax', 'abs', 'art', 'abb', 'ca', 'ggf',
  'inkl', 'exkl', 'evtl', 'zzgl', 'mwst', 'bsp', 'vgl', 'usw',
  'bzw', 'etc', 'zb', 'dh', 'ua', 'oa', 'ff', 'ibd',
  'jan', 'feb', 'mär', 'mar', 'apr', 'jun', 'jul',
  'aug', 'sep', 'sept', 'okt', 'nov', 'dez',
])

// Common German 3rd-person-singular verb forms. A capitalised word directly
// before one of these is very likely a sentence subject = a name.
export const VERB_FORMS = new Set([
  // Auxiliaries / modals (highest frequency)
  'ist','war','sei','wäre','hat','hatte','hätte','wird','wurde','würde',
  'kann','konnte','könnte','muss','musste','müsste','soll','sollte',
  'darf','durfte','dürfte','mag','mochte','möchte','will','wollte',
  // Movement / state
  'geht','kommt','läuft','fährt','fliegt','reist','zieht','bleibt',
  'steht','sitzt','liegt','wohnt','lebt','stirbt','scheint','gilt',
  // Communication
  'sagt','spricht','erklärt','berichtet','schreibt','liest','fragt',
  'antwortet','ruft','postet','tweetet','teilt','veröffentlicht',
  'betont','bestätigt','meldet','kündigt','klagt','verkündet',
  // Cognition
  'denkt','glaubt','weiß','kennt','versteht','meint','findet','sieht',
  'hört','erinnert','ahnt','hofft','befürchtet','stimmt','zweifelt',
  // Action
  'macht','tut','arbeitet','hilft','kämpft','sucht','nimmt','gibt',
  'bringt','trägt','hält','lässt','stellt','setzt','legt','zeigt',
  'öffnet','schließt','beginnt','endet','startet','stoppt','wartet',
  'kauft','verkauft','zahlt','besitzt','gehört','betreibt','wechselt',
  'trifft','besucht','empfängt','begrüßt','schläft','isst','trinkt',
  'spielt','singt','tanzt','lernt','übt','trainiert','streitet',
  // Professional
  'leitet','führt','studiert','lehrt','forscht','entwickelt','plant',
  'entscheidet','beschließt','verhandelt','fordert','kritisiert',
  'unterstützt','vertritt','übernimmt','verantwortet','präsentiert',
  'kandidiert','protestiert','demonstriert','streikt','investiert',
  // Life events
  'heiratet','bekommt','erhält','verliert','gewinnt','erreicht','scheitert','feiert',
  'zählt','rechnet','unterschreibt',
])

/** Dictionary inflection suffixes for lookup */
export const INFLECTION_SUFFIXES = [
  'ens', 'ern', 'ers', 'nen', 'em', 'en', 'er', 'es', 'e', 's',
  'sten', 'stem', 'ster', 'stes', 'ste',
  'ung', 'ungen', 'keit', 'keiten', 'heit', 'heiten',
]

/** Lazily loaded data */
export let dict = null
export let firstNames = null

export function setDict(d) { dict = d }
export function setFirstNames(fn) { firstNames = fn }

/**
 * Strip leading/trailing punctuation for lookup purposes.
 */
export function normalise(token) {
  return token
    .replace(/^[«»„"'"'()\[\]{}<>!?,;:.…–—\-\/\\]+/u, '')
    .replace(/[«»„"'"'()\[\]{}<>!?,;:.…–—\-\/\\]+$/u, '')
    .toLowerCase()
}

/**
 * Abbreviation detection: all-caps (AG, USA), mixed-case org forms (GmbH, KGaA),
 * and dot-separated abbreviations (e.V., z.B.).
 */
export function isAbbreviation(raw) {
  const nodots = raw.replace(/\./g, '')
  if (nodots.length < 2 || nodots.length > 7) return false
  if (/^[A-ZÄÖÜ0-9]+$/.test(nodots)) return true
  const uppers = (nodots.match(/[A-ZÄÖÜ]/g) || []).length
  if (uppers >= 2 && nodots.length <= 6) return true
  return false
}

/**
 * Dictionary lookup with German inflection suffix stripping.
 */
export function inDict(lower) {
  if (!dict) return false
  if (dict.has(lower)) return true
  for (const s of INFLECTION_SUFFIXES) {
    if (lower.length - s.length >= 3 && lower.endsWith(s)) {
      if (dict.has(lower.slice(0, -s.length))) return true
    }
  }
  return false
}

/**
 * Strip a single Fugen element (s/n/e) from the start of a compound segment.
 */
export function stripFuge(s) {
  if (s.length > 3 && (s[0] === 's' || s[0] === 'n' || s[0] === 'e')) return s.slice(1)
  return s
}

/**
 * German compound word detector.
 * 2-part:  "Nachmittags|sonne", "Bundes|republik"
 * 3-part:  "Bundes|verwaltungs|gericht", "Arbeits|unfall|versicherung"
 */
export function isCompoundWord(lower) {
  if (lower.length < 7) return false

  for (let i = 3; i <= lower.length - 3; i++) {
    const left = lower.slice(0, i)
    const right = lower.slice(i)
    if (inDict(left) && inDict(right)) return true
    const rightBare = stripFuge(right)
    if (rightBare !== right && rightBare.length >= 3 && inDict(left) && inDict(rightBare)) return true
  }

  if (lower.length < 10) return false
  for (let i = 3; i <= lower.length - 6; i++) {
    const left = lower.slice(0, i)
    if (!inDict(left)) continue
    const rest = lower.slice(i)
    for (let j = 3; j <= rest.length - 3; j++) {
      const mid = rest.slice(0, j)
      const right = rest.slice(j)
      const midBare = stripFuge(mid)
      const rightBare = stripFuge(right)
      if (inDict(midBare) && inDict(rightBare)) return true
      if (midBare !== mid && inDict(midBare) && right.length >= 3 && inDict(right)) return true
      if (rightBare !== right && inDict(mid) && rightBare.length >= 3 && inDict(rightBare)) return true
    }
  }

  return false
}

/**
 * Return up to `limit` non-whitespace tokens before index (closest first).
 * Limit raised to 8 to handle long title chains like "Prof. Dr. med. Dr. h.c. mult. Name".
 */
export function prevWords(tokens, index, limit = 8) {
  const words = []
  for (let i = index - 1; i >= 0 && words.length < limit; i--) {
    if (!tokens[i].trim()) continue
    const w = normalise(tokens[i]).toLowerCase()
    words.push(w)
  }
  return words
}

/**
 * Pass 1: classify a single token.
 * Returns: 'name' | 'honorific-name' | 'word' | 'skip'
 */
export function classify(token, index, tokens, sentenceStarts) {
  if (!token.trim()) return 'skip'

  const clean = normalise(token)
  if (!clean || !/[a-zA-ZäöüÄÖÜß]/.test(clean)) return 'skip'

  const lower = clean.toLowerCase()

  if (HONORIFICS.has(lower)) return 'skip'
  if (PARTICLES.has(lower)) return 'skip'
  if (LEGAL_FORMS.has(lower)) return 'skip'
  if (KNOWN_NON_PERSONS.has(lower)) return 'word'
  if (isAbbreviation(clean)) return 'skip'

  // Word after an honorific — limit raised to 8 for multi-title chains
  const preceding = prevWords(tokens, index, 8)
  if (preceding.some(w => HONORIFICS.has(w))) return 'honorific-name'

  const firstLetter = token.replace(/^[^a-zA-ZäöüÄÖÜß]+/, '')[0] || ''
  const startsUpper = /^[A-ZÄÖÜ]$/.test(firstLetter)

  // Positive first-name match — strong signal regardless of dictionary
  if (firstNames && firstNames.has(lower) && startsUpper) return 'name'

  // Known surname overrides dict
  if (COMMON_SURNAMES.has(lower) && startsUpper) return 'name'

  // Hyphenated names: Hans-Peter, Karl-Heinz, Marie-Louise, Anna-Lena.
  // Both parts must start uppercase, consist only of letters, and neither
  // part may be a common dictionary word (rules out Ex-Minister, E-Mail …).
  if (token.includes('-')) {
    const parts = token.split('-')
    if (
      parts.length === 2 &&
      parts.every(p => /^[A-ZÄÖÜ][a-zäöüß]{1,}$/.test(p.trim())) &&
      parts.every(p => !inDict(p.trim().toLowerCase()))
    ) return 'name'
  }

  // Dictionary check with inflection stripping
  if (inDict(lower)) {
    if (startsUpper && !sentenceStarts.has(index) && NAME_SUFFIX_RE.test(lower)) return 'name'
    return 'word'
  }

  // Adjective / adverb suffix → definitively not a name
  if (WORD_SUFFIX_RE.test(lower)) return 'word'

  // Compound word → not a name
  if (isCompoundWord(lower)) return 'word'

  // Unknown word at sentence start → conservative default to avoid false positives.
  // Sentence-initial names are caught via firstNames/COMMON_SURNAMES above, or
  // via Pass 3 consistency (if they also appear mid-sentence) or Pass 5 (verb context).
  if (sentenceStarts.has(index)) return 'word'

  // Mid-sentence unknown uppercase word → name candidate
  if (startsUpper) return 'name'

  return 'word'
}

/**
 * Tokenise text preserving whitespace and punctuation as separate spans.
 */
export function tokenise(text) {
  return text.split(/(\s+)/)
}

/**
 * Identify token indices that start a new sentence.
 */
export function findSentenceStarts(tokens) {
  const starts = new Set()
  starts.add(0)
  for (let i = 0; i < tokens.length; i++) {
    if (!/[.!?…]\s*$/.test(tokens[i])) continue
    if (/[!?…]\s*$/.test(tokens[i])) {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].trim()) { starts.add(j); break }
      }
      continue
    }
    const stem = tokens[i].trim().toLowerCase().replace(/\.+$/, '')
    if (SENT_ABBREV.has(stem) || HONORIFICS.has(stem)) continue
    for (let j = i + 1; j < tokens.length; j++) {
      if (tokens[j].trim()) { starts.add(j); break }
    }
  }
  return starts
}

/**
 * Find the index of the next non-space, non-particle token after `from`.
 */
export function nextContentToken(result, from, maxSkip = 3) {
  let skipped = 0
  for (let i = from + 1; i < result.length; i++) {
    if (result[i].type === 'space') continue
    if (PARTICLES.has(normalise(result[i].text).toLowerCase())) { skipped++; continue }
    if (skipped > maxSkip) break
    return i
  }
  return -1
}

// ── Regex patterns for pre-processing ────────────────────────────────────────

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g

// International and German phone numbers:
// +49 30 12345678, +49-30-12345678, 030 12345678, 0800 123456789, etc.
const PHONE_RE = /(?:\+\d{1,3}[\s\-]?)(?:\(?\d{1,4}\)?[\s\-]?)(?:\d[\s\-]?){4,12}\d|\b0\d{2,4}[\s\/\-]?\d{3,}(?:[\s\/\-]\d{2,})*\b/g

// German date formats: DD.MM.YYYY, D.M.YYYY, DD.MM.YY
const DATE_RE = /\b\d{1,2}\.\d{1,2}\.(?:\d{4}|\d{2})\b/g

/**
 * Pre-processing pass: detect emails, phone numbers, and optionally dates.
 * Replaces them with unique placeholder markers in the text so they are not
 * subject to name-classification, then returns a map for later reconstruction.
 *
 * Returns: { processedText: string, markerMap: Map<marker, {type, original}> }
 */
export function preProcess(text, options = {}) {
  const markerMap = new Map()
  let counter = 0

  // Collect all matches with their positions to handle overlaps
  const matches = []

  for (const m of text.matchAll(EMAIL_RE)) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: 'email', original: m[0] })
  }

  for (const m of text.matchAll(PHONE_RE)) {
    matches.push({ start: m.index, end: m.index + m[0].length, type: 'phone', original: m[0] })
  }

  if (options.detectDates) {
    for (const m of text.matchAll(DATE_RE)) {
      matches.push({ start: m.index, end: m.index + m[0].length, type: 'date', original: m[0] })
    }
  }

  // Sort by start position, remove overlapping (keep first / longest)
  matches.sort((a, b) => a.start - b.start || b.end - a.end)
  const filtered = []
  let lastEnd = -1
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m)
      lastEnd = m.end
    }
  }

  if (filtered.length === 0) return { processedText: text, markerMap }

  // Replace from end to start to preserve indices
  let result = text
  for (let i = filtered.length - 1; i >= 0; i--) {
    const { start, end, type, original } = filtered[i]
    const marker = `\x00PP${counter++}\x00`
    markerMap.set(marker, { type, original })
    result = result.slice(0, start) + marker + result.slice(end)
  }

  return { processedText: result, markerMap }
}

/**
 * Main analyse function.
 * Accepts text and options { detectDates } and returns an array of token objects.
 */
export function analyse(text, options = {}) {
  // Pre-process: replace emails, phones, dates with markers
  const { processedText, markerMap } = preProcess(text, options)

  const tokens = tokenise(processedText)
  const sentenceStarts = findSentenceStarts(tokens)

  // ── Pass 1: base classification ───────────────────────────────────────
  const result = tokens.map((token, i) => {
    if (/^\s+$/.test(token)) return { text: token, type: 'space' }

    // Expand pre-processing markers back to original tokens
    if (markerMap.has(token)) {
      const { type, original } = markerMap.get(token)
      return { text: original, type }
    }

    // Check if token contains a marker (e.g. adjacent punctuation)
    for (const [marker, { type, original }] of markerMap) {
      if (token.includes(marker)) {
        return { text: original, type }
      }
    }

    return { text: token, type: classify(token, i, tokens, sentenceStarts) }
  })

  // ── Pass 2: name-chaining ─────────────────────────────────────────────
  for (let i = 0; i < result.length; i++) {
    const t = result[i]
    if (t.type !== 'name' && t.type !== 'honorific-name') continue

    const j = nextContentToken(result, i, 2)
    if (j === -1) continue

    const candidate = result[j]
    if (candidate.type === 'space' || candidate.type === 'honorific-name' || candidate.type === 'name'
        || candidate.type === 'email' || candidate.type === 'phone' || candidate.type === 'date') continue

    const raw = candidate.text
    const clean = normalise(raw)
    const firstLetter = raw.replace(/^[^a-zA-ZäöüÄÖÜß]+/, '')[0] || ''

    if (!/^[A-ZÄÖÜ]$/.test(firstLetter)) continue

    if (t.type === 'honorific-name' || !inDict(clean.toLowerCase())) {
      result[j] = { ...candidate, type: 'name' }
    }
  }

  // ── Pass 3: consistency propagation ──────────────────────────────────
  const nameKeys = new Set()
  for (const tok of result) {
    if (tok.type === 'name' || tok.type === 'honorific-name') {
      const key = normalise(tok.text).toLowerCase()
      if (key.length >= 3 && (!inDict(key) || COMMON_SURNAMES.has(key))) nameKeys.add(key)
    }
  }

  if (nameKeys.size > 0) {
    for (let i = 0; i < result.length; i++) {
      if (result[i].type === 'word') {
        const key = normalise(result[i].text).toLowerCase()
        if (nameKeys.has(key)) result[i] = { ...result[i], type: 'name' }
      }
    }
  }

  // ── Pass 4: bilateral context (look forward) ──────────────────────────
  for (let i = 0; i < result.length; i++) {
    if (result[i].type !== 'word') continue
    const raw = result[i].text
    const clean = normalise(raw)
    const lower = clean.toLowerCase()
    const fl = raw.replace(/^[^a-zA-ZäöüÄÖÜß]+/, '')[0] || ''
    if (!/^[A-ZÄÖÜ]$/.test(fl)) continue
    if (inDict(lower)) continue

    const j = nextContentToken(result, i, 1)
    if (j === -1) continue
    if (result[j].type === 'name' || result[j].type === 'honorific-name') {
      result[i] = { ...result[i], type: 'name' }
    }
  }

  // ── Pass 5: verb context ──────────────────────────────────────────────
  // A 'word' token that starts uppercase and is directly followed by a
  // known 3rd-person-singular verb is very likely a sentence subject = name.
  // This recovers names at sentence start that were held back by the
  // sentence-start guard ("Damian schreibt den Brief.").
  for (let i = 0; i < result.length; i++) {
    if (result[i].type !== 'word') continue
    const raw = result[i].text
    const fl = raw.replace(/^[^a-zA-ZäöüÄÖÜß]+/, '')[0] || ''
    if (!/^[A-ZÄÖÜ]$/.test(fl)) continue

    const lower = normalise(raw).toLowerCase()
    if (inDict(lower) || WORD_SUFFIX_RE.test(lower)) continue   // definitely a word
    if (KNOWN_NON_PERSONS.has(lower)) continue

    const j = nextContentToken(result, i, 1)
    if (j === -1) continue
    const nextLower = normalise(result[j].text).toLowerCase()
    if (VERB_FORMS.has(nextLower)) {
      result[i] = { ...result[i], type: 'name' }
    }
  }

  return result
}
