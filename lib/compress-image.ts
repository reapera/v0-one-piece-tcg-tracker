const MAX_DIMENSION = 1200; // px on longest side

export function compressImage(file: File, maxBytes = 200 * 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Scale down if larger than MAX_DIMENSION
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);

      // Reduce JPEG quality until under maxBytes
      let quality = 0.85;
      const attempt = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Failed to compress image'));
            if (blob.size <= maxBytes || quality <= 0.1) {
              resolve(blob);
            } else {
              quality = Math.max(quality - 0.1, 0.1);
              attempt();
            }
          },
          'image/jpeg',
          quality,
        );
      };

      attempt();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

// Extract storage path from a Supabase public URL
// e.g. https://xxx.supabase.co/storage/v1/object/public/card-images/uuid.jpg → uuid.jpg
export function getStoragePath(imageUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;
  return imageUrl.slice(idx + marker.length);
}
