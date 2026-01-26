import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { cn } from '../../utils/cn';
import { resolveImageUrl } from '../../utils/formatters';

interface MenuItemImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  aspectRatio?: number;
}

const DEFAULT_ASPECT = 4 / 3;

export function MenuItemImage({
  src,
  alt,
  className,
  aspectRatio = DEFAULT_ASPECT,
}: MenuItemImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const resolvedSrc = resolveImageUrl(src);
  const showImage = Boolean(resolvedSrc && !error);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg bg-gray-100',
        className
      )}
      style={{ aspectRatio: String(aspectRatio) }}
    >
      {showImage ? (
        <>
          {!loaded && (
            <div
              className="absolute inset-0 animate-pulse bg-gray-200"
              style={{ aspectRatio: String(aspectRatio) }}
            />
          )}
          <img
            src={resolvedSrc!}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn(
              'h-full w-full object-cover transition-opacity duration-200',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        </>
      ) : (
        <div
          className="flex flex-col items-center justify-center gap-1 text-gray-400"
          style={{ aspectRatio: String(aspectRatio) }}
        >
          <ImageIcon className="h-10 w-10" strokeWidth={1.5} />
          <span className="text-xs font-medium">No image</span>
        </div>
      )}
    </div>
  );
}
