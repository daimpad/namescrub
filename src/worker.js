/**
 * Web Worker: loads the German dictionary once and analyses text on demand.
 * Runs off the main thread to keep UI responsive with large texts.
 */

const HONORIFICS = new Set([
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
const PARTICLES = new Set([
  'von', 'van', 'de', 'du', 'zu', 'zur', 'zum',
  'ten', 'den', 'la', 'le', 'el', 'af', 'av', 'der',
])

// Improvement 9: very common German surnames that also exist as dictionary
// words (occupations, adjectives). Flagged as name candidates even when the
// dict would return true, because in personal-text context they're names.
const COMMON_SURNAMES = new Set([
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

// Improvement 7: word endings strongly associated with German surnames.
// Applied after the dict check so common-word stems that happen to end in
// these still get flagged (e.g. "Goldmann", "Rosenstein").
const NAME_SUFFIX_RE = /(mann|stein|berg|thal|tal|feld|burg|hausen|dorf|beck|ow|ke|ki)$/i

// Endings that are characteristic of German adjectives and adverbs — never names.
// Covers -lich (freundlich), -isch (technisch), -ig (zuverlässig), -weise (erstaunlicherweise),
// -haft (ernsthaft), -sam (langsam), -bar (verfügbar), -los (planlos), -voll (wertvoll),
// -reich (erfolgreich), -arm (ressourcenarm), -mäßig (regelmäßig), -artig (eigenartig),
// -fähig (arbeitsfähig), -würdig (vertrauenswürdig), -fertig (startfertig),
// -wert (beachtenswert), -bereit (einsatzbereit).
const WORD_SUFFIX_RE = /(lich|isch|haft|sam|bar|los|voll|reich|arm|weise|mäßig|artig|fähig|würdig|fertig|bereit|wert|ung|schaft|heit|keit|tum|nis|sal)$/i

// German legal / organisational forms — never personal names.
const LEGAL_FORMS = new Set([
  'gmbh', 'ag', 'kg', 'kgaa', 'ohg', 'gbr', 'ug', 'ev', 'se',
  'mbh', 'sarl', 'llc', 'ltd', 'inc', 'bv', 'nv',
])

// Abbreviations that end in "." but are NOT sentence boundaries.
// Used in findSentenceStarts to avoid false sentence splits.
const SENT_ABBREV = new Set([
  // Honorifics (without trailing dot — normalised below)
  'dr', 'prof', 'hr', 'fr', 'sr', 'jr', 'mag', 'ing', 'dipl',
  // Common German abbreviations
  'nr', 'str', 'tel', 'fax', 'abs', 'art', 'abb', 'ca', 'ggf',
  'inkl', 'exkl', 'evtl', 'zzgl', 'mwst', 'bsp', 'vgl', 'usw',
  'bzw', 'etc', 'zb', 'dh', 'ua', 'oa', 'ff', 'ibd',
  // Months
  'jan', 'feb', 'mär', 'mar', 'apr', 'jun', 'jul',
  'aug', 'sep', 'sept', 'okt', 'nov', 'dez',
])

/** Lazily loaded dictionary Set */
let dict = null

async function loadDictionary(dictUrl) {
  const res = await fetch(dictUrl)
  if (!res.ok) throw new Error(`Dictionary fetch failed: ${res.status}`)
  const arr = await res.json()
  dict = new Set(arr)
}

/**
 * Strip leading/trailing punctuation for lookup purposes.
 */
function normalise(token) {
  return token
    .replace(/^[«»„"'"'()\[\]{}<>!?,;:.…–—\-\/\\]+/u, '')
    .replace(/[«»„"'"'()\[\]{}<>!?,;:.…–—\-\/\\]+$/u, '')
    .toLowerCase()
}

/**
 * Improvement 4: abbreviation detection.
 * Covers all-caps (AG, USA), mixed-case org forms (GmbH, KGaA),
 * and dot-separated abbreviations (e.V., z.B.).
 */
function isAbbreviation(raw) {
  const nodots = raw.replace(/\./g, '')
  if (nodots.length < 2 || nodots.length > 7) return false
  // All uppercase/digit: AG, USA, VW, NATO
  if (/^[A-ZÄÖÜ0-9]+$/.test(nodots)) return true
  // Mixed-case with at least 2 uppercase letters: GmbH, KGaA, GbR
  const uppers = (nodots.match(/[A-ZÄÖÜ]/g) || []).length
  if (uppers >= 2 && nodots.length <= 6) return true
  return false
}

/**
 * Improvement 2: check dictionary including common German inflection suffixes.
 * Helps avoid marking inflected common nouns as names ("Häusers" → "Häuser").
 */
const INFLECTION_SUFFIXES = [
  // Noun / adjective inflections
  'ens', 'ern', 'ers', 'nen', 'em', 'en', 'er', 'es', 'e', 's',
  // Adjective superlatives / comparatives
  'sten', 'stem', 'ster', 'stes', 'ste',
  // Common verb endings (helps with "-ung", "-keit", "-heit" derived nouns in inflected form)
  'ung', 'ungen', 'keit', 'keiten', 'heit', 'heiten',
]
function inDict(lower) {
  if (dict.has(lower)) return true
  for (const s of INFLECTION_SUFFIXES) {
    if (lower.length - s.length >= 3 && lower.endsWith(s)) {
      if (dict.has(lower.slice(0, -s.length))) return true
    }
  }
  return false
}

/**
 * Normalise a potential compound segment: strip a single Fugen element
 * (s, n, e) from the start and return the bare form, or the original.
 * Used so both 2-part and 3-part compound checks can reuse the same logic.
 */
function stripFuge(s) {
  if (s.length > 3 && (s[0] === 's' || s[0] === 'n' || s[0] === 'e')) return s.slice(1)
  return s
}

/**
 * German compound word detector.
 * 2-part split:  "Nachmittags|sonne", "Bundes|republik"
 * 3-part split:  "Bundes|verwaltungs|gericht", "Arbeits|unfall|versicherung"
 * Handles Fugen-s/n/e at each join point.
 * Minimum segment length 3 keeps noise low.
 */
function isCompoundWord(lower) {
  if (lower.length < 7) return false

  // ── 2-part ────────────────────────────────────────────────────────────
  for (let i = 3; i <= lower.length - 3; i++) {
    const left = lower.slice(0, i)
    const right = lower.slice(i)
    if (inDict(left) && inDict(right)) return true
    const rightBare = stripFuge(right)
    if (rightBare !== right && rightBare.length >= 3 && inDict(left) && inDict(rightBare)) return true
  }

  // ── 3-part (only for longer words to keep perf reasonable) ────────────
  if (lower.length < 10) return false
  for (let i = 3; i <= lower.length - 6; i++) {
    const left = lower.slice(0, i)
    if (!inDict(left)) continue          // prune: left part must be a word
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
 * Return up to `limit` non-whitespace tokens before index (closest first),
 * skipping through PARTICLES so honorific context is preserved across them.
 * E.g. "Herr von Müller" → prevWords("Müller") still finds "herr".
 */
function prevWords(tokens, index, limit = 5) {
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
function classify(token, index, tokens, sentenceStarts) {
  if (!token.trim()) return 'skip'

  const clean = normalise(token)
  if (!clean || !/[a-zA-ZäöüÄÖÜß]/.test(clean)) return 'skip'

  const lower = clean.toLowerCase()

  // Honorific itself → skip, not a name
  if (HONORIFICS.has(lower)) return 'skip'

  // Particle → skip (transparent, handled in chaining passes)
  if (PARTICLES.has(lower)) return 'skip'

  // Legal / org form → skip (GmbH, AG, e.V. …)
  if (LEGAL_FORMS.has(lower)) return 'skip'

  // Improvement 4: abbreviation → skip (all-caps, mixed-caps short tokens)
  if (isAbbreviation(clean)) return 'skip'

  // Word after an honorific (searching back through particles and whitespace)
  const preceding = prevWords(tokens, index, 5)
  if (preceding.some(w => HONORIFICS.has(w))) return 'honorific-name'

  const firstLetter = token.replace(/^[^a-zA-ZäöüÄÖÜß]+/, '')[0] || ''
  const startsUpper = /^[A-ZÄÖÜ]$/.test(firstLetter)

  // Improvement 9: known surname overrides dict — "Müller" mid-sentence is a name
  if (COMMON_SURNAMES.has(lower) && startsUpper) return 'name'

  // Dictionary check (improvement 2: with suffix stripping)
  if (inDict(lower)) {
    // Improvement 7: word in dict but ends with a name-typical suffix and starts
    // uppercase mid-sentence → likely a surname (e.g. "Goldmann", "Rosenstein")
    if (startsUpper && !sentenceStarts.has(index) && NAME_SUFFIX_RE.test(lower)) return 'name'
    return 'word'
  }

  // Adjective / adverb suffix → definitively not a name
  // (-lich, -isch, -ig, -haft, -sam, -bar, -los, -weise, -mäßig, …)
  if (WORD_SUFFIX_RE.test(lower)) return 'word'

  // Compound word detector: "Bundesverwaltungsgericht", "Nachmittagssonne" → word
  if (isCompoundWord(lower)) return 'word'

  // Sentence-start words that are unknown: default to word to avoid false positives.
  // Names at sentence start are still caught via COMMON_SURNAMES (above) or
  // honorific context (above), and via Pass 3 consistency if they also appear
  // mid-sentence in the same text.
  if (sentenceStarts.has(index)) return 'word'

  // Mid-sentence uppercase word not in dict → name candidate
  if (startsUpper) return 'name'

  return 'word'
}

/**
 * Tokenise text preserving whitespace and punctuation as separate spans.
 */
function tokenise(text) {
  return text.split(/(\s+)/)
}

/**
 * Identify token indices that start a new sentence.
 * Skips abbreviation periods: "Dr.", "Nr.", "Jan." are not sentence ends.
 */
function findSentenceStarts(tokens) {
  const starts = new Set()
  starts.add(0)
  for (let i = 0; i < tokens.length; i++) {
    if (!/[.!?…]\s*$/.test(tokens[i])) continue
    // Treat "!" and "?" always as sentence ends; for "." check if abbreviation
    if (/[!?…]\s*$/.test(tokens[i])) {
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].trim()) { starts.add(j); break }
      }
      continue
    }
    // "." — only a sentence end if the token is not a known abbreviation
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
 * Returns -1 if none found within `maxSkip` tokens.
 */
function nextContentToken(result, from, maxSkip = 3) {
  let skipped = 0
  for (let i = from + 1; i < result.length; i++) {
    if (result[i].type === 'space') continue
    if (PARTICLES.has(normalise(result[i].text).toLowerCase())) { skipped++; continue }
    if (skipped > maxSkip) break
    return i
  }
  return -1
}

function analyse(text) {
  const tokens = tokenise(text)
  const sentenceStarts = findSentenceStarts(tokens)

  // ── Pass 1: base classification ───────────────────────────────────────
  const result = tokens.map((token, i) => {
    if (/^\s+$/.test(token)) return { text: token, type: 'space' }
    return { text: token, type: classify(token, i, tokens, sentenceStarts) }
  })

  // ── Pass 2: name-chaining ─────────────────────────────────────────────
  // A word immediately following a recognised name gets promoted if it
  // starts with uppercase — covers "Vorname Nachname" patterns and
  // nobility chains like "Herr von Müller".
  for (let i = 0; i < result.length; i++) {
    const t = result[i]
    if (t.type !== 'name' && t.type !== 'honorific-name') continue

    const j = nextContentToken(result, i, 2)
    if (j === -1) continue

    const candidate = result[j]
    if (candidate.type === 'space' || candidate.type === 'honorific-name' || candidate.type === 'name') continue

    const raw = candidate.text
    const clean = normalise(raw)
    const firstLetter = raw.replace(/^[^a-zA-ZäöüÄÖÜß]+/, '')[0] || ''

    // Only promote if it starts with uppercase (surname, not a verb/article)
    if (!/^[A-ZÄÖÜ]$/.test(firstLetter)) continue

    // After a confirmed honorific-name: promote regardless of dictionary
    // After a regular name: only promote if not a dictionary word (avoids
    // turning "Hans Haus" into two names)
    if (t.type === 'honorific-name' || !inDict(clean.toLowerCase())) {
      result[j] = { ...candidate, type: 'name' }
    }
  }

  // ── Pass 3: consistency propagation ──────────────────────────────────
  // Collect all confirmed name keys (min 3 chars to avoid noise)
  const nameKeys = new Set()
  for (const tok of result) {
    if (tok.type === 'name' || tok.type === 'honorific-name') {
      const key = normalise(tok.text).toLowerCase()
      if (key.length >= 3) nameKeys.add(key)
    }
  }

  // Re-classify any 'word' token whose normalised form is a known name
  if (nameKeys.size > 0) {
    for (let i = 0; i < result.length; i++) {
      if (result[i].type === 'word') {
        const key = normalise(result[i].text).toLowerCase()
        if (nameKeys.has(key)) {
          result[i] = { ...result[i], type: 'name' }
        }
      }
    }
  }

  // ── Pass 4: bilateral context (look forward) ──────────────────────────
  // Improvement 11: a 'word' that starts with uppercase and is NOT in the
  // dictionary, immediately preceding a confirmed name, is very likely a
  // first name whose base form happened to be a dict word — promote it.
  for (let i = 0; i < result.length; i++) {
    if (result[i].type !== 'word') continue
    const raw = result[i].text
    const clean = normalise(raw)
    const lower = clean.toLowerCase()
    const fl = raw.replace(/^[^a-zA-ZäöüÄÖÜß]+/, '')[0] || ''
    if (!/^[A-ZÄÖÜ]$/.test(fl)) continue
    if (inDict(lower)) continue   // genuine dict word → skip

    // Find the next non-space, non-particle content token
    const j = nextContentToken(result, i, 1)
    if (j === -1) continue
    if (result[j].type === 'name' || result[j].type === 'honorific-name') {
      result[i] = { ...result[i], type: 'name' }
    }
  }

  return result
}

self.onmessage = async (e) => {
  const { id, action, payload } = e.data
  try {
    if (action === 'init') {
      await loadDictionary(payload.dictUrl)
      self.postMessage({ id, ok: true })
    } else if (action === 'analyse') {
      if (!dict) throw new Error('Dictionary not loaded yet')
      const tokens = analyse(payload.text)
      self.postMessage({ id, ok: true, tokens })
    } else {
      throw new Error(`Unknown action: ${action}`)
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message })
  }
}
