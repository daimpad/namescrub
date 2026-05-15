#!/usr/bin/env node
/**
 * Downloads the German wortliste and builds a compact dictionary JSON.
 * Output: public/dictionary.json — an array of lowercase German words.
 * The Worker loads this once and builds a Set for O(1) lookups.
 */

import { createWriteStream, mkdirSync } from 'fs'
import { writeFile, readFile } from 'fs/promises'
import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public')
const OUT_FILE = path.join(OUT_DIR, 'dictionary.json')

// Igno words shorter than this to cut noise
const MIN_LENGTH = 3

// German honorifics — used by the Worker for priority-marking but defined here for reference
const HONORIFICS = new Set(['herr', 'frau', 'dr', 'prof', 'sr', 'jr', 'mag', 'ing', 'dipl'])

const SOURCES = [
  // Primary: Wiktionary-derived German word list (plain text, one word per line)
  'https://raw.githubusercontent.com/davidak/wortliste/master/wortliste.txt',
  // Fallback: smaller SCOWL-derived list
  'https://raw.githubusercontent.com/nicowillis/german-words/master/german.txt',
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
  for (const url of SOURCES) {
    try {
      rawText = await fetchText(url)
      console.log(`Downloaded ${rawText.length.toLocaleString()} bytes`)
      break
    } catch (err) {
      console.warn(`Source failed (${err.message}), trying next...`)
    }
  }

  if (!rawText) {
    throw new Error('All dictionary sources failed. Cannot build dictionary.')
  }

  const words = new Set()
  for (const line of rawText.split('\n')) {
    const word = line.trim()
    if (!word || word.startsWith('#')) continue
    // The davidak list uses ";" as separator between forms — take first form
    const base = word.split(';')[0].trim().toLowerCase()
    if (base.length >= MIN_LENGTH && /^[a-zäöüß]+$/i.test(base)) {
      words.add(base)
    }
  }

  // Also add common German function words / articles that may not be in the list
  const essentials = [
    'der','die','das','den','dem','des','ein','eine','einer','einem','einen','eines',
    'und','oder','aber','weil','wenn','dass','ob','als','wie','bis','seit','nach',
    'vor','über','unter','neben','zwischen','auf','an','in','im','am','vom','zum',
    'zur','bei','mit','ohne','durch','für','gegen','um','aus','von','zu','nach',
    'ich','du','er','sie','es','wir','ihr','sie','mich','dich','sich','uns','euch',
    'mir','dir','ihm','ihr','uns','euch','ihnen','mein','dein','sein','ihr','unser',
    'euer','ihr','kein','keine','nicht','ist','sind','war','waren','hat','haben',
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
  const sizeKB = (JSON.stringify(arr).length / 1024).toFixed(1)
  console.log(`File size: ~${sizeKB} KB`)
}

buildDictionary().catch(err => {
  console.error('Build failed:', err)
  process.exit(1)
})
