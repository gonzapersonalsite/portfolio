import React, { useState } from 'react'
import './ImageWithFallback.css'

const FALLBACK_BY_TYPE: Record<'project' | 'profile', string> = {
  project: '/images/no-image.svg',
  profile: '/profile-fallback.webp',
}

const parseAspectDimensions = (aspectRatio: string): { readonly width?: number; readonly height?: number } => {
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(aspectRatio.trim())
  if (!match) return {}
  return { width: Number(match[1]), height: Number(match[2]) }
}

export interface ImageWithFallbackProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  readonly src?: string
  readonly alt: string
  readonly type: 'project' | 'profile'
  readonly aspectRatio: string
  readonly imageClassName?: string
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  type,
  aspectRatio,
  className,
  imageClassName,
  style,
  srcSet,
  loading,
  decoding = 'async',
  onLoad,
  onError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)

  if (src !== prevSrc) {
    setPrevSrc(src)
    setHasError(false)
    setIsLoaded(false)
  }

  const fallback = FALLBACK_BY_TYPE[type]
  const resolvedSrc = hasError || !src ? fallback : src
  const resolvedSrcSet = hasError || !src ? undefined : srcSet
  const isEager = loading === 'eager'
  const intrinsicDimensions = parseAspectDimensions(aspectRatio)

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true)
    onLoad?.(event)
  }

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true)
    setIsLoaded(true)
    onError?.(event)
  }

  const imgClasses = [
    'img-fallback__img',
    isEager ? 'is-eager' : '',
    isLoaded || isEager ? 'is-loaded' : '',
    type === 'profile' ? 'is-profile' : '',
    imageClassName ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className ? `img-fallback ${className}` : 'img-fallback'} style={{ aspectRatio, ...style }}>
      <img
        {...props}
        src={resolvedSrc}
        srcSet={resolvedSrcSet}
        alt={alt}
        width={intrinsicDimensions.width}
        height={intrinsicDimensions.height}
        loading={loading}
        decoding={decoding}
        onLoad={handleLoad}
        onError={handleError}
        className={imgClasses}
      />
    </div>
  )
}

export default ImageWithFallback
