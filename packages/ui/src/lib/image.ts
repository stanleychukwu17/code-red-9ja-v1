export function convertToWebP(file: File, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    // If the file is already a WebP image, return it as is
    if (file.type === "image/webp") {
      resolve(file);
      return;
    }

    // Read the file as a data URL to load it into an Image object
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      
      // Once the image is loaded, draw it onto a canvas
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw the image onto the canvas context
        ctx.drawImage(img, 0, 0);
        
        // Convert the canvas content to a WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("WebP conversion failed"));
              return;
            }
            
            // Create a new File object with the WebP blob and updated extension
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
