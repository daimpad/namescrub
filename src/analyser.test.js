import { describe, it, expect, beforeAll } from 'vitest'
import { setDict, setFirstNames, analyse, preProcess, normalise, isAbbreviation, tokenise } from './analyser.js'

// Minimal test dictionary — common German words that should NOT be classified as names
const TEST_DICT = new Set([
  'arzt', 'arbeitet', 'rief', 'schreibt', 'kommt', 'ist', 'war', 'der', 'die', 'das',
  'und', 'oder', 'mit', 'von', 'nach', 'bei', 'im', 'in', 'an', 'auf', 'für', 'zu',
  'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'nicht', 'auch', 'noch', 'aber', 'dann', 'wenn', 'weil', 'dass', 'wie',
  'brief', 'haus', 'auto', 'geld', 'zeit', 'tag', 'nacht', 'welt', 'land',
  'schule', 'arbeit', 'firma', 'bank', 'stadt', 'straße', 'leer', 'steht',
  'meldete', 'rekordgewinn', 'trafen', 'sich', 'berichtete',
])

const TEST_NAMES = new Set([
  'thomas', 'anna', 'peter', 'maria', 'hans', 'lisa', 'michael', 'sarah',
])

beforeAll(() => {
  setDict(TEST_DICT)
  setFirstNames(TEST_NAMES)
})

describe('normalise', () => {
  it('strips leading/trailing punctuation', () => {
    expect(normalise('"Müller"')).toBe('müller')
    expect(normalise('Schmidt,')).toBe('schmidt')
    expect(normalise('…Thomas…')).toBe('thomas')
  })

  it('lowercases output', () => {
    expect(normalise('MÜLLER')).toBe('müller')
  })
})

describe('isAbbreviation', () => {
  it('recognises all-caps abbreviations', () => {
    expect(isAbbreviation('AG')).toBe(true)
    expect(isAbbreviation('USA')).toBe(true)
    expect(isAbbreviation('GmbH')).toBe(true)
  })

  it('rejects normal words', () => {
    expect(isAbbreviation('Müller')).toBe(false)
    expect(isAbbreviation('Thomas')).toBe(false)
  })
})

describe('tokenise', () => {
  it('splits text preserving whitespace', () => {
    const tokens = tokenise('Hallo Welt')
    expect(tokens).toEqual(['Hallo', ' ', 'Welt'])
  })

  it('preserves multiple spaces', () => {
    const tokens = tokenise('A  B')
    expect(tokens).toContain('  ')
  })
})

describe('preProcess', () => {
  it('detects email addresses', () => {
    const { markerMap } = preProcess('Schreib an hans@example.com bitte.', {})
    const values = [...markerMap.values()]
    expect(values.some(v => v.type === 'email' && v.original === 'hans@example.com')).toBe(true)
  })

  it('detects international phone numbers', () => {
    const { markerMap } = preProcess('Ruf +49 30 12345678 an.', {})
    const values = [...markerMap.values()]
    expect(values.some(v => v.type === 'phone')).toBe(true)
  })

  it('detects dates when opt-in', () => {
    const { markerMap } = preProcess('Am 12.03.2024 war es so.', { detectDates: true })
    const values = [...markerMap.values()]
    expect(values.some(v => v.type === 'date' && v.original === '12.03.2024')).toBe(true)
  })

  it('does NOT detect dates without opt-in', () => {
    const { markerMap } = preProcess('Am 12.03.2024 war es so.', {})
    const values = [...markerMap.values()]
    expect(values.some(v => v.type === 'date')).toBe(false)
  })

  it('removes overlapping matches', () => {
    const { markerMap } = preProcess('test@example.com', {})
    expect(markerMap.size).toBe(1)
  })
})

describe('analyse — name detection', () => {
  it('detects known first name mid-sentence', () => {
    const tokens = analyse('Ich treffe Thomas heute.', {})
    expect(tokens.find(t => t.text === 'Thomas')?.type).toBe('name')
  })

  it('detects name via verb context', () => {
    const tokens = analyse('Thomas schreibt den Brief.', {})
    expect(tokens.find(t => t.text === 'Thomas')?.type).toBe('name')
  })

  it('does NOT flag dict words as names', () => {
    const tokens = analyse('Der Arzt arbeitet hier.', {})
    // 'Arzt' is in dict and starts the sentence after 'Der'
    const arzt = tokens.find(t => t.text === 'Arzt')
    expect(arzt?.type).not.toBe('name')
  })

  it('detects honorifik-chained name', () => {
    const tokens = analyse('Frau Müller rief an.', {})
    const mueller = tokens.find(t => t.text === 'Müller')
    expect(mueller?.type).toBe('honorific-name')
  })

  it('propagates name consistently', () => {
    const tokens = analyse('Thomas Müller arbeitet hier. Müller kommt morgen.', {})
    const all = tokens.filter(t => t.text === 'Müller')
    expect(all.every(t => t.type === 'name' || t.type === 'honorific-name')).toBe(true)
  })
})

describe('analyse — special token detection', () => {
  it('returns email token', () => {
    const tokens = analyse('Schreib an hans@example.com bitte.', {})
    const email = tokens.find(t => t.type === 'email')
    expect(email?.text).toBe('hans@example.com')
  })

  it('returns phone token for +49 number', () => {
    const tokens = analyse('Ruf mich an: +49 30 12345678.', {})
    expect(tokens.some(t => t.type === 'phone')).toBe(true)
  })

  it('returns date token when detectDates is true', () => {
    const tokens = analyse('Am 12.03.2024 war es so.', { detectDates: true })
    const date = tokens.find(t => t.type === 'date')
    expect(date?.text).toBe('12.03.2024')
  })

  it('does not treat email as name even if uppercase-starting', () => {
    const tokens = analyse('Schreib an Hans@Example.com bitte.', {})
    const email = tokens.find(t => t.type === 'email')
    expect(email).toBeTruthy()
    expect(email?.type).toBe('email')
    // Should NOT be classified as 'name'
    expect(tokens.filter(t => t.type === 'name').every(t => t.text !== email?.text)).toBe(true)
  })
})
