import { useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSignedUrl } from '../../hooks/useSignedUrl'

interface SignedImageProps {
  path: string
  alt: string
  className?: string
}

/**
 * Storage パス → 署名URL → <img>。
 * 表示中に署名が切れて 403 になった場合は一度だけ再署名して復帰する。
 */
export function SignedImage({ path, alt, className }: SignedImageProps) {
  const { data: url, isLoading, isError } = useSignedUrl(path)
  const qc = useQueryClient()
  const retriedRef = useRef(false)

  if (isLoading) {
    return <div className={`animate-pulse bg-panel2 ${className ?? ''}`} />
  }

  if (isError || !url) {
    return (
      <div
        className={`flex items-center justify-center bg-panel2 ${className ?? ''}`}
      >
        <span className="microlabel">NO IMAGE</span>
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => {
        if (!retriedRef.current) {
          retriedRef.current = true
          void qc.invalidateQueries({ queryKey: ['signed-url', path] })
        }
      }}
    />
  )
}
