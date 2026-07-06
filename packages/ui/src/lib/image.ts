export function convertToWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.type === "image/webp") {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("WebP conversion failed"));
              return;
            }
            const nameWithoutExt =
              file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
            const convertedFile = new File([blob], `${nameWithoutExt}.webp`, {
              type: "image/webp",
              lastModified: Date.now(),
            });
            resolve(convertedFile);
          },
          "image/webp",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Image loading failed"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File reading failed"));
    reader.readAsDataURL(file);
  });
}
