import { useState } from 'react';
import { cld } from '../../services/cloudinary/config';
import { cn } from '../../shared/utils/cn';
import { AdvancedImage, placeholder, lazyload } from '@cloudinary/react';
import { scale } from '@cloudinary/url-gen/actions/resize';

interface CloudinaryImageProps {
  publicId: string;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  onLoad?: () => void;
}

export function CloudinaryImage({
  publicId,
  alt = 'Imagem do Álbum',
  className,
  width,
  style,
  onLoad,
}: CloudinaryImageProps) {
  const [loaded, setLoaded] = useState(false);

  if (!publicId) return null;

  const handleLoad = () => {
    setLoaded(true);
    if (onLoad) onLoad();
  };

  // Se for URL completa (fallback/legado), usa img padrão
  if (publicId.startsWith('http://') || publicId.startsWith('https://')) {
    return (
      <img
        src={publicId}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn('object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', className)}
        style={style}
        onLoad={handleLoad}
      />
    );
  }

  // Cloudinary publicId → gera URL otimizada com Lazy Load e Blur Up
  const myImage = cld.image(publicId);
  myImage.format('auto').quality('auto');
  if (width) {
    myImage.resize(scale().width(width));
  } else {
    // Limite seguro padrão para cards mobile (Timeline/cards) evitando carregar 4000px no celular
    myImage.resize(scale().width(700));
  }

  return (
    <AdvancedImage
      cldImg={myImage}
      plugins={[lazyload(), placeholder({ mode: 'blur' })]}
      alt={alt}
      decoding="async"
      className={cn('object-cover', className)}
      style={style}
      onLoad={handleLoad}
    />
  );
}
