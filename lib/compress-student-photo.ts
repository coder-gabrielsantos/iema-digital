/**
 * Redimensiona e recompressa uma foto em base64 no cliente para exibição em lista.
 * Não altera dados no servidor; serve só para decodificar menos pixels no navegador.
 */
export function compressStudentPhotoForThumbnail(
  photoData: string,
  photoMime: string,
  maxDimension: number,
  quality = 0.68
): Promise<string> {
  if (typeof window === 'undefined') {
    return Promise.resolve(`data:${photoMime};base64,${photoData}`);
  }
  if (!photoData || photoData.length < 12) {
    return Promise.resolve(`data:${photoMime};base64,${photoData}`);
  }

  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve(`data:${photoMime};base64,${photoData}`);
          return;
        }

        const longest = Math.max(w, h);
        const scale = longest > maxDimension ? maxDimension / longest : 1;
        const tw = Math.max(1, Math.round(w * scale));
        const th = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(`data:${photoMime};base64,${photoData}`);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, tw, th);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(`data:${photoMime};base64,${photoData}`);
      }
    };

    img.onerror = () => resolve(`data:${photoMime};base64,${photoData}`);
    img.src = `data:${photoMime};base64,${photoData}`;
  });
}
