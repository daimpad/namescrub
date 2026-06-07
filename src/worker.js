/**
 * Web Worker: thin wrapper around analyser.js.
 * Loads the German dictionary once and analyses text on demand.
 * Runs off the main thread to keep UI responsive with large texts.
 */

import {
  setDict, setFirstNames, analyse
} from './analyser.js'

async function loadDictionary(dictUrl) {
  const res = await fetch(dictUrl)
  if (!res.ok) throw new Error(`Dictionary fetch failed: ${res.status}`)
  setDict(new Set(await res.json()))
}

async function loadFirstNames(namesUrl) {
  try {
    const res = await fetch(namesUrl)
    if (!res.ok) return
    setFirstNames(new Set(await res.json()))
  } catch { }
}

self.onmessage = async (e) => {
  const { id, action, payload } = e.data
  try {
    if (action === 'init') {
      await loadDictionary(payload.dictUrl)
      if (payload.namesUrl) await loadFirstNames(payload.namesUrl)
      self.postMessage({ id, ok: true })
    } else if (action === 'analyse') {
      const tokens = analyse(payload.text, payload.options)
      self.postMessage({ id, ok: true, tokens })
    } else {
      throw new Error(`Unknown action: ${action}`)
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message })
  }
}
