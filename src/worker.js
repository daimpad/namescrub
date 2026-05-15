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

/** Lazily loaded dictionary Set */
let dict = null

async function loadDictionary(dictUrl) {
  const res = await fetch(dictUrl)
  if (!res.ok) throw new Error(`Dictionary fetch failed: ${res.status}`)
  const arr = await res.json()
  dict = new Set(arr)
}

/**
 * Strip leading/trailing punctuation from a token for lookup purposes.
 * Returns the cleaned word and the original token.
 */
function normalise(token) {
  return token
    .replace(/^[«»„"'"'()\[\]{}<>!?,;:.…–—\-\/\\]+/u, '')
    .replace(/[«»„"'"'()\[\]{}<>!?,;:.…–—\-\/\\]+$/u, '')
    .toLowerCase()
}

/**
 * Return up to `limit` non-whitespace tokens before index (closest first).
 */
function prevWords(tokens, index, limit = 3) {
  const words = []
  for (let i = index - 1; i >= 0 && words.length < limit; i--) {
    if (tokens[i].trim()) words.push(normalise(tokens[i]).toLowerCase())
  }
  return words
}

/**
 * Determine whether a raw token (with surrounding context) looks like a name.
 * Returns one of: 'name' | 'honorific-name' | 'word' | 'skip'
 */
function classify(token, index, tokens, sentenceStarts) {
  if (!token.trim()) return 'skip'

  const clean = normalise(token)

  // Non-alphabetic tokens (numbers, punctuation-only) are skipped
  if (!clean || !/[a-zA-ZäöüÄÖÜß]/.test(clean)) return 'skip'

  const lower = clean.toLowerCase()

  // Honorific itself is never a name
  if (HONORIFICS.has(lower)) return 'skip'

  // Word preceded (within 3 non-space tokens) by an honorific → high-priority name.
  // Looks back through chains like "Prof. Dr. Hans" or "Herr Dr. Müller".
  const preceding = prevWords(tokens, index, 3)
  if (preceding.some(w => HONORIFICS.has(w))) return 'honorific-name'

  // In-dictionary check
  if (dict.has(lower)) return 'word'

  // Sentence-start: capitalised common nouns are normal in German — check dict with
  // lowercase; if found it's just a noun, not a name.
  if (sentenceStarts.has(index)) {
    if (dict.has(lower)) return 'word'
    // Still not found → likely a proper noun even at sentence start
  }

  // Starts with uppercase → candidate name
  if (/^[A-ZÄÖÜ]/.test(token.replace(/^[^a-zA-ZäöüÄÖÜß]+/, ''))) {
    return 'name'
  }

  return 'word'
}

/**
 * Tokenise text preserving whitespace and punctuation as separate spans
 * so the original text can be reconstructed perfectly.
 */
function tokenise(text) {
  // Split on whitespace boundaries, keeping the delimiters
  return text.split(/(\s+)/)
}

/**
 * Identify token indices that start a new sentence.
 */
function findSentenceStarts(tokens) {
  const starts = new Set()
  starts.add(0)
  for (let i = 0; i < tokens.length; i++) {
    if (/[.!?…]\s*$/.test(tokens[i])) {
      // Next non-whitespace token starts a new sentence
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].trim()) { starts.add(j); break }
      }
    }
  }
  return starts
}

function analyse(text) {
  const tokens = tokenise(text)
  const sentenceStarts = findSentenceStarts(tokens)

  const result = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (/^\s+$/.test(token)) {
      result.push({ text: token, type: 'space' })
      continue
    }
    const type = classify(token, i, tokens, sentenceStarts)
    result.push({ text: token, type })
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
