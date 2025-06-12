export const createThumbnail = (
	imageBlob: Blob,
	maxWidth: number,
	maxHeight: number,
	type = "image/jpeg",
	quality = 0.7,
): Promise<Blob> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.src = URL.createObjectURL(imageBlob);
		img.onload = () => {
			URL.revokeObjectURL(img.src); // Clean up object URL

			let width = img.width;
			let height = img.height;

			if (width > height) {
				if (width > maxWidth) {
					height = Math.round((height * maxWidth) / width);
					width = maxWidth;
				}
			} else {
				if (height > maxHeight) {
					width = Math.round((width * maxHeight) / height);
					height = maxHeight;
				}
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");

			if (!ctx) {
				return reject(new Error("Failed to get canvas context for thumbnail"));
			}

			ctx.filter = "blur(1px)";
			ctx.drawImage(img, 0, 0, width, height);
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error("Failed to create thumbnail blob"));
					}
				},
				type,
				quality,
			);
		};
		img.onerror = (err) => {
			URL.revokeObjectURL(img.src);
			reject(err);
		};
	});
};
