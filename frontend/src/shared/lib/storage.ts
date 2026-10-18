// Browsers that block site data throw a SecurityError on any localStorage access, even reading
// the property. Preferences are optional, so a blocked storage degrades to "nothing saved"
// instead of breaking the page.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

// Returns whether the value was saved.
export function writeStorage(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}
