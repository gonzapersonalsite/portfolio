import { useEffect } from 'react'

interface PageMetaOptions {
  title: string
  description?: string
  robots?: string
}

export const usePageMeta = ({ title, description, robots }: PageMetaOptions) => {
  useEffect(() => {
    const previousTitle = document.title
    const previousDescription = getMetaContent('description')
    const previousOgTitle = getMetaContent('og:title')
    const previousOgDescription = getMetaContent('og:description')
    const previousRobots = getMetaContent('robots')

    document.title = title
    setMeta('og:title', title)
    if (description !== undefined) {
      setMeta('description', description)
      setMeta('og:description', description)
    }
    if (robots !== undefined) {
      setMeta('robots', robots)
    }

    return () => {
      document.title = previousTitle
      restoreMeta('description', previousDescription)
      restoreMeta('og:title', previousOgTitle)
      restoreMeta('og:description', previousOgDescription)
      if (robots !== undefined) {
        restoreMeta('robots', previousRobots)
      }
    }
  }, [title, description, robots])
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
