import { useState } from 'react'

export function useContent<T>(loader: () => T): { data: T } {
  const [data] = useState<T>(loader)
  return { data }
}
