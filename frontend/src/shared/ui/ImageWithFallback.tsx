import React, { useState } from 'react'
import { Box, Skeleton } from '@mui/material'
import type { BoxProps } from '@mui/material'

const FALLBACK_URLS = {
  profile: '/profile-fallback.webp',
  project: '/images/no-image.svg',
} as const

const parseAspectDimensions = (aspectRatio: string): { readonly width?: number; readonly height?: number } => {
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(aspectRatio.trim())
  if (!match) return {}
  const width = Number(match[1])
  const height = Number(match[2])
  return width > 0 && height > 0 ? { width, height } : {}
}

interface ImageWithFallbackProps extends BoxProps<'img'> {
  src?: string
  alt: string
  type: keyof typeof FALLBACK_URLS
  // Reserves the box before the image loads, so nothing shifts (CLS).
  aspectRatio: string
}

const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({ src, alt, type, aspectRatio, sx, srcSet, ...props }) => {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const onImageRef = (img: HTMLImageElement | null) => {
    if (img) {
      setIsLoading(!img.complete)
    }
  }

  const handleError = () => {
    if (!hasError) {
      setHasError(true)
      setIsLoading(false)
    }
  }

  const handleLoad = () => {
    setIsLoading(false)
  }

  const showFallback = hasError || !src
  const finalSrc = showFallback ? FALLBACK_URLS[type] : src
  // A srcset wins over src, so it has to go as well for the fallback to show.
  const finalSrcSet = showFallback ? undefined : srcSet
  const intrinsicDimensions = parseAspectDimensions(aspectRatio)
  const isEager = props.loading === 'eager'

  return (
    <Box
      sx={[
        {
          position: 'relative',
          width: '100%',
          aspectRatio,
          overflow: 'hidden',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {isLoading && (
        <Skeleton variant="rectangular" width="100%" height="100%" sx={{ position: 'absolute', top: 0, left: 0 }} />
      )}
      <Box
        component="img"
        src={finalSrc}
        alt={alt}
        width={intrinsicDimensions.width}
        height={intrinsicDimensions.height}
        onError={handleError}
        onLoad={handleLoad}
        ref={onImageRef}
        srcSet={finalSrcSet}
        {...props}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isEager || !isLoading ? 1 : 0,
          transition: isEager ? 'none' : 'opacity 0.3s ease-in-out',
        }}
      />
    </Box>
  )
}

export default ImageWithFallback
