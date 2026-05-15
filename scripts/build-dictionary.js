#!/usr/bin/env node
/**
 * Downloads a German common-words list (NO proper nouns) and builds a
 * compact JSON array for O(1) Set lookups in the Web Worker.
 * Output: public/dictionary.json
 *
 * Source priority:
 * 1. enz/german-wordlist — spell-check list, explicitly excludes proper nouns
 * 2. wooorm/dictionaries Hunspell DE — another clean common-words source
 */

import { mkdirSync } from 'fs'
import { writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public')
const OUT_FILE = path.join(OUT_DIR, 'dictionary.json')

const MIN_LENGTH = 3

const SOURCES = [
  // Primary: spell-check list — explicitly excludes proper nouns/names/places
  'https://raw.githubusercontent.com/enz/german-wordlist/master/words',
  // Fallback: Hunspell DE base form list (also no proper nouns)
  'https://raw.githubusercontent.com/wooorm/dictionaries/main/dictionaries/de/index.dic',
]

async function fetchText(url) {
  console.log(`Fetching: ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  return res.text()
}

async function buildDictionary() {
  mkdirSync(OUT_DIR, { recursive: true })

  let rawText = null
  let sourceUsed = ''
  for (const url of SOURCES) {
    try {
      rawText = await fetchText(url)
      sourceUsed = url
      console.log(`Downloaded ${rawText.length.toLocaleString()} bytes from ${url}`)
      break
    } catch (err) {
      console.warn(`Source failed (${err.message}), trying next...`)
    }
  }

  if (!rawText) {
    throw new Error('All dictionary sources failed.')
  }

  const words = new Set()
  const isHunspell = sourceUsed.includes('wooorm')

  for (const line of rawText.split('\n')) {
    let word = line.trim()
    if (!word || word.startsWith('#') || word.startsWith('%')) continue

    if (isHunspell) {
      // Hunspell .dic format: "word/FLAGS" or just "word" — skip proper nouns (uppercase)
      word = word.split('/')[0].trim()
      // Skip entries starting with uppercase → proper nouns in Hunspell
      if (/^[A-ZÄÖÜ]/.test(word)) continue
    }

    const lower = word.toLowerCase()
    if (lower.length >= MIN_LENGTH && /^[a-zäöüß\-]+$/.test(lower)) {
      words.add(lower)
    }
  }

  // Essential German function words guaranteed to be present
  const essentials = [
    'der','die','das','den','dem','des','ein','eine','einer','einem','einen','eines',
    'und','oder','aber','weil','wenn','dass','ob','als','wie','bis','seit','nach',
    'vor','über','unter','neben','zwischen','auf','an','in','im','am','vom','zum',
    'zur','bei','mit','ohne','durch','für','gegen','um','aus','von','zu',
    'ich','du','er','sie','es','wir','ihr','mich','dich','sich','uns','euch',
    'mir','dir','ihm','ihnen','mein','dein','sein','unser','euer',
    'kein','keine','nicht','ist','sind','war','waren','hat','haben',
    'hatte','hatten','wird','werden','wurde','wurden','kann','können','konnte',
    'muss','müssen','musste','soll','sollen','sollte','will','wollen','wollte',
    'darf','dürfen','durfte','mag','mögen','mochte','ja','nein','auch','noch',
    'schon','nur','sehr','ganz','mehr','so','dann','hier','dort','jetzt','heute',
    'gestern','morgen','immer','nie','oft','manchmal','bitte','danke','herr','frau',
  ]
  for (const w of essentials) words.add(w)

  const arr = Array.from(words).sort()
  await writeFile(OUT_FILE, JSON.stringify(arr))

  console.log(`Dictionary built: ${arr.length.toLocaleString()} words → ${OUT_FILE}`)
  console.log(`File size: ~${(JSON.stringify(arr).length / 1024).toFixed(1)} KB`)
}

buildDictionary().catch(err => {
  console.error('Build failed:', err)
  process.exit(1)
})
