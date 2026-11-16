export function convertToWebP(file: File, quality = 0.85, maxDimension = 1280): Promise<File> {
  return new Promise((resolve, reject) => {
    // Read file as data URL to load into Image element
    const reader = new FileReader();

    // Handle file reading completion and populate image source
    reader.onload = (event) => {
      const img = new Image();

      // Once image loads calculate dimensions and draw onto canvas
      img.onload = () => {
        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Return original if already WebP format and within dimension limits
        if (
          file.type === "image/webp" &&
          (!maxDimension || (width <= maxDimension && height <= maxDimension))
        ) {
          resolve(file);
          return;
        }

        // Scale down dimensions while preserving aspect ratio
        if (maxDimension && (width > maxDimension || height > maxDimension)) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        // Create canvas with calculated target dimensions
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        // Get two-dimensional rendering context for drawing
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw scaled image onto canvas context
        ctx.drawImage(img, 0, 0, width, height);
        // The below will maintain the original dimension of the image
        // ctx.drawImage(img, 0, 0);

        // Convert canvas content to WebP blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("WebP conversion failed"));
            return;
          }

          // Create new File object with WebP blob and updated extension
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
          const convertedFile = new File([blob], `${nameWithoutExt}.webp`, {
            type: "image/webp",
            lastModified: file.lastModified || Date.now(),
          });

          resolve(convertedFile);
        },
          "image/webp",
          quality
        );
      };

      // Handle image decode failure
      img.onerror = () => reject(new Error("Image loading failed"));
      // Assign data URL to trigger image load
      img.src = event.target?.result as string;
    };

    // Handle file read error
    reader.onerror = () => reject(new Error("File reading failed"));

    // Initiate reading original file as data URL
    reader.readAsDataURL(file);
  });
}
