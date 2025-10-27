"use client";

import { useToast } from "@/components/ui/use-toast";
import { useCallback } from "react";

export function useCanvasActions(
	canvasRef: React.RefObject<HTMLCanvasElement | null>,
	mainImage: HTMLImageElement | null,
) {
	const { toast } = useToast();

	const copyToClipboard = useCallback(async () => {
		const canvas = canvasRef.current;
		if (!canvas || !mainImage) return;
		canvas.toBlob(async (blob) => {
			if (!blob) return;
			try {
				await navigator.clipboard.write([
					new ClipboardItem({ [blob.type]: blob }),
				]);
				toast({
					title: "Image Copied",
					description: "The annotated image has been copied to your clipboard.",
				});
			} catch (err: any) {
				console.error("Failed to copy image: ", err);
				toast({
					variant: "destructive",
					title: "Copy Failed",
					description: "Could not copy the image to your clipboard.",
				});
			}
		}, "image/png");
	}, [canvasRef, mainImage, toast]);

	const saveToDisk = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas || !mainImage) return;
		const dataURL = canvas.toDataURL("image/png");
		const link = document.createElement("a");
		link.download = "annotated-image.png";
		link.href = dataURL;
		link.click();
	}, [canvasRef, mainImage]);

	return { copyToClipboard, saveToDisk };
}
