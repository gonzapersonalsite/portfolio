import { useEffect } from 'react'

interface PageMetaOptions {
  title: string
  description?: string
}

export const usePageMeta = ({ title, description }: PageMetaOptions) => {
  useEffect(() => {
    const previousTitle = document.title
    const previousDescription = getMetaContent('description')
    const previousOgTitle = getMetaContent('og:title')
    const previousOgDescription = getMetaContent('og:description')

    document.title = title
    setMeta('og:title', title)
    if (description !== undefined) {
      setMeta('description', description)
      setMeta('og:description', description)
    }

    return () => {
      document.title = previousTitle
      restoreMeta('description', previousDescription)
      restoreMeta('og:title', previousOgTitle)
      restoreMeta('og:description', previousOgDescription)
    }
  }, [title, description])
}

const metaAttribute = (name: string): 'property' | 'name' => (name.startsWith('og:') ? 'property' : 'name')

const metaSelector = (name: string): string => `meta[${metaAttribute(name)}="${name}"]`

function getMetaContent(name: string): string | undefined {
  return document.querySelector<HTMLMetaElement>(metaSelector(name))?.getAttribute('content') ?? undefined
}

function setMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(metaSelector(name))
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute(metaAttribute(name), name)
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', content)
}

function restoreMeta(name: string, content?: string) {
  if (content === undefined) {
    document.querySelector(metaSelector(name))?.remove()
    return
  }
  setMeta(name, content)
}
