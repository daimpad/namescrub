import { describe, it, expect, beforeAll } from 'vitest'
import { setDict, setFirstNames, analyse, preProcess, normalise, isAbbreviation, tokenise, isValidIban } from './analyser.js'

// Minimal test dictionary — common German words that should NOT be classified as names
const TEST_DICT = new Set([
  'arzt', 'arbeitet', 'rief', 'schreibt', 'kommt', 'ist', 'war', 'der', 'die', 'das',
  'und', 'oder', 'mit', 'von', 'nach', 'bei', 'im', 'in', 'an', 'auf', 'für', 'zu',
  'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'nicht', 'auch', 'noch', 'aber', 'dann', 'wenn', 'weil', 'dass', 'wie',
  'brief', 'haus', 'auto', 'geld', 'zeit', 'tag', 'nacht', 'welt', 'land',
  'schule', 'arbeit', 'firma', 'bank', 'stadt', 'straße', 'leer', 'steht',
  'meldete', 'rekordgewinn', 'trafen', 'sich', 'berichtete',
  // Words that happen to also be dict entries — must not spread as names via Pass 3
  'sommer', 'winter', 'vogel', 'firma',
  'wärme', 'hund', 'kaputt', 'gern', 'vielen', 'dank', 'alles',
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

describe('false-positive reduction', () => {
  it('KNOWN_NON_PERSONS: Google is not a name', () => {
    const tokens = analyse('Google veröffentlichte gestern neue Daten.', {})
    expect(tokens.find(t => t.text === 'Google')?.type).not.toBe('name')
  })

  it('KNOWN_NON_PERSONS: Apple is not a name', () => {
    const tokens = analyse('Apple ist ein Tech-Unternehmen.', {})
    expect(tokens.find(t => t.text === 'Apple')?.type).not.toBe('name')
  })

  it('Pass 3: plain dict word not spread via consistency propagation', () => {
    // 'Firma' is in the test dict and not a COMMON_SURNAME.
    // Even when it appears mid-sentence in uppercase it must stay 'word',
    // and must NOT cause a sentence-start occurrence to be promoted to 'name'.
    const tokens = analyse('Die Firma arbeitet hier. Firma ist bekannt.', {})
    const all = tokens.filter(t => t.text === 'Firma')
    expect(all.every(t => t.type !== 'name')).toBe(true)
  })

  it('Pass 2: phone token after name not chained as name', () => {
    // A phone number immediately following a name must stay a phone token,
    // not be absorbed as a chained name by Pass 2.
    const tokens = analyse('Thomas +49 30 12345678 ist erreichbar.', {})
    expect(tokens.some(t => t.type === 'phone')).toBe(true)
  })
})

describe('analyse — address detection', () => {
  it('returns address token when detectAddresses is true', () => {
    const tokens = analyse('Er wohnt in der Musterstraße 12 hier.', { detectAddresses: true })
    expect(tokens.some(t => t.type === 'address')).toBe(true)
  })

  it('does NOT return address token when detectAddresses is false', () => {
    const tokens = analyse('Er wohnt in der Musterstraße 12 hier.', { detectAddresses: false })
    expect(tokens.some(t => t.type === 'address')).toBe(false)
  })

  it('does NOT return address token when option is omitted', () => {
    const tokens = analyse('Er wohnt in der Musterstraße 12 hier.')
    expect(tokens.some(t => t.type === 'address')).toBe(false)
  })

  it('detects address with postcode and city', () => {
    const tokens = analyse('Schick es an Bahnhofstraße 5, 10115 Berlin bitte.', { detectAddresses: true })
    const addr = tokens.find(t => t.type === 'address')
    expect(addr?.text).toContain('Bahnhofstraße 5')
    expect(addr?.text).toContain('10115 Berlin')
  })

  it('Pass 2: address after a name stays an address token', () => {
    const tokens = analyse('Frau Müller, Musterstraße 12, kommt morgen.', { detectAddresses: true })
    const addr = tokens.find(t => t.type === 'address')
    expect(addr?.text).toContain('Musterstraße 12')
  })
})

describe('recall improvements', () => {
  it('genitive of a first name at sentence start', () => {
    const tokens = analyse('Annas Auto ist kaputt.', {})
    expect(tokens.find(t => t.text === 'Annas')?.type).toBe('name')
  })

  it('genitive of a common surname at sentence start', () => {
    const tokens = analyse('Schmidts Hund ist hier.', {})
    expect(tokens.find(t => t.text === 'Schmidts')?.type).toBe('name')
  })

  it('noun genitive with article is NOT a name', () => {
    const tokens = analyse('Wir lieben die Wärme des Sommers hier.', {})
    expect(tokens.find(t => t.text === 'Sommers')?.type).not.toBe('name')
  })

  it('greeting rescues unknown name at sentence start', () => {
    const tokens = analyse('Hallo. Zorlu hier.', {})
    expect(tokens.find(t => t.text === 'Zorlu')?.type).toBe('name')
  })

  it('greeting does not flag dict words', () => {
    const tokens = analyse('Hallo. Welt ist schön.', {})
    expect(tokens.find(t => t.text === 'Welt')?.type).not.toBe('name')
  })

  it('und-pair rescues unknown name at sentence start', () => {
    const tokens = analyse('Xenia und Thomas kommen morgen.', {})
    expect(tokens.find(t => t.text === 'Xenia')?.type).toBe('name')
  })

  it('hyphenated surname pair with dict-word parts', () => {
    const tokens = analyse('Das Urteil von Sommer-Winter ist da.', {})
    expect(tokens.find(t => t.text === 'Sommer-Winter')?.type).toBe('name')
  })

  it('final propagation spreads genitive of late-promoted names', () => {
    const tokens = analyse('Behrang schreibt gern. Behrangs Auto ist kaputt.', {})
    expect(tokens.find(t => t.text === 'Behrang')?.type).toBe('name')
    expect(tokens.find(t => t.text === 'Behrangs')?.type).toBe('name')
  })

  it('schmidt is recognised as a common surname', () => {
    const tokens = analyse('Herr Schmidt und Frau Weber sprechen.', {})
    expect(tokens.find(t => t.text === 'Schmidt')?.type).toBe('honorific-name')
  })
})

describe('IBAN detection', () => {
  it('validates a correct German IBAN', () => {
    expect(isValidIban('DE89370400440532013000')).toBe(true)
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true)
  })

  it('rejects a wrong checksum', () => {
    expect(isValidIban('DE89370400440532013001')).toBe(false)
  })

  it('detects a compact IBAN in text', () => {
    const tokens = analyse('Bitte an DE89370400440532013000 überweisen.', {})
    const iban = tokens.find(t => t.type === 'iban')
    expect(iban?.text).toBe('DE89370400440532013000')
  })

  it('detects a grouped IBAN in text', () => {
    const tokens = analyse('Konto: DE89 3704 0044 0532 0130 00 bei der Bank.', {})
    const iban = tokens.find(t => t.type === 'iban')
    expect(iban?.text).toContain('DE89 3704')
  })

  it('does not flag IBAN-like strings with bad checksum', () => {
    const tokens = analyse('Referenz DE00123456781234567890 im Betreff.', {})
    expect(tokens.some(t => t.type === 'iban')).toBe(false)
  })
})

describe('honorific chain precision', () => {
  it('chain breaks at lowercase words after the name', () => {
    const tokens = analyse('Frau Weber, vielen Dank für alles.', {})
    expect(tokens.find(t => t.text.startsWith('Weber'))?.type).toBe('honorific-name')
    expect(tokens.find(t => t.text === 'vielen')?.type).toBe('word')
    expect(tokens.find(t => t.text === 'Dank')?.type).toBe('word')
  })

  it('chain survives long academic title sequences', () => {
    const tokens = analyse('Prof. Dr. med. Dr. h.c. mult. Zorbek spricht heute.', {})
    expect(tokens.find(t => t.text === 'Zorbek')?.type).toBe('honorific-name')
  })

  it('herrn (dative) counts as honorific', () => {
    const tokens = analyse('Ich sprach mit Herrn Zorbek darüber.', {})
    expect(tokens.find(t => t.text === 'Zorbek')?.type).toBe('honorific-name')
  })

  it('lowercase token after honorific stays untouched', () => {
    const tokens = analyse('Die Frau dort ist nett.', {})
    expect(tokens.find(t => t.text === 'dort')?.type).toBe('word')
  })
})

describe('abbreviation handling', () => {
  it('all-caps acronyms are skipped, not names', () => {
    const tokens = analyse('MFG Zorbek. Die DSGVO gilt.', {})
    expect(tokens.find(t => t.text === 'MFG')?.type).toBe('skip')
    expect(tokens.find(t => t.text.startsWith('DSGVO'))?.type).toBe('skip')
  })

  it('ALL-CAPS name from the surname list is still a name', () => {
    const tokens = analyse('Ich traf MÜLLER gestern.', {})
    expect(tokens.find(t => t.text === 'MÜLLER')?.type).toBe('name')
  })

  it('acronym behind honorific particle chain is not chained', () => {
    const tokens = analyse('Frau Müller von der IHK spricht.', {})
    const ihk = tokens.find(t => t.text.startsWith('IHK'))
    expect(ihk?.type).toBe('skip')
  })

  it('ALL-CAPS token directly after honorific is a name', () => {
    const tokens = analyse('Kontakt: Frau MEIER bitte anrufen.', {})
    expect(tokens.find(t => t.text === 'MEIER')?.type).toBe('honorific-name')
  })
})
