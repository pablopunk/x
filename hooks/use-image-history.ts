"use client";

import { useState, useEffect, useCallback } from "react";
import { storeBlob, getBlob, deleteBlob } from "@/lib/idb-helper";
import { createThumbnail } from "@/lib/image-utils";
import type { Annotation } from "@/components/annotation-canvas";

const MAX_HISTORY_ITEMS = 100;
const LOCAL_STORAGE_KEY = "imageAnnotationHistoryLog";
const THUMBNAIL_WIDTH = 100;
const THUMBNAIL_HEIGHT = 75;

export interface ImageHistoryEntryMetadata {
	id: string;
	originalImageName?: string;
	imageId: string;
	thumbnailId: string;
	annotations: Annotation[];
	lastModified: number;
}

export interface LoadedHistoryEntry {
	image: HTMLImageElement;
	annotations: Annotation[];
	id: string;
	originalImageName?: string;
}

export const useImageHistory = () => {
	const [historyLog, setHistoryLog] = useState<ImageHistoryEntryMetadata[]>([]);
	const [isLoading, setIsLoading] = useState(true); // For significant operations
	const [activeHistoryEntryId, setActiveHistoryEntryId] = useState<
		string | null
	>(null);
	const [thumbnailCache, setThumbnailCache] = useState<Record<string, string>>(
		{},
	);

	useEffect(() => {
		setIsLoading(true);
		try {
			const storedLog = localStorage.getItem(LOCAL_STORAGE_KEY);
			if (storedLog) {
				setHistoryLog(JSON.parse(storedLog));
			}
		} catch (error) {
			console.error("Failed to load history from localStorage:", error);
		}
		// setIsLoading(false) handled by sync effect
	}, []);

	useEffect(() => {
		let isActive = true;
		setIsLoading(true);

		const syncThumbnails = async () => {
			const newCacheEntries: Record<string, string> = {};
			const idsInLog = new Set(historyLog.map((entry) => entry.thumbnailId));

			setThumbnailCache((currentCache) => {
				const updatedCache = { ...currentCache };
				const idsInCurrentCache = Object.keys(updatedCache);
				idsInCurrentCache.forEach((cachedId) => {
					if (!idsInLog.has(cachedId)) {
						if (updatedCache[cachedId]?.startsWith("blob:")) {
							URL.revokeObjectURL(updatedCache[cachedId]);
						}
						delete updatedCache[cachedId];
					}
				});
				return updatedCache;
			});

			const loadPromises = historyLog.map(async (entry) => {
				if (!thumbnailCache[entry.thumbnailId]) {
					try {
						const blob = await getBlob(entry.thumbnailId);
						if (blob) {
							const url = URL.createObjectURL(blob);
							if (isActive) {
								newCacheEntries[entry.thumbnailId] = url;
							} else {
								URL.revokeObjectURL(url);
							}
						} else {
							console.warn(
								`Thumbnail blob not found for ID: ${entry.thumbnailId}`,
							);
						}
					} catch (error) {
						console.error(
							`Error fetching thumbnail blob ${entry.thumbnailId}:`,
							error,
						);
					}
				} else {
					if (idsInLog.has(entry.thumbnailId)) {
						newCacheEntries[entry.thumbnailId] =
							thumbnailCache[entry.thumbnailId];
					}
				}
			});

			await Promise.all(loadPromises);

			if (isActive) {
				setThumbnailCache((prevCache) => {
					const finalCache: Record<string, string> = {};
					historyLog.forEach((logEntry) => {
						if (newCacheEntries[logEntry.thumbnailId]) {
							finalCache[logEntry.thumbnailId] =
								newCacheEntries[logEntry.thumbnailId];
						} else if (prevCache[logEntry.thumbnailId]) {
							finalCache[logEntry.thumbnailId] =
								prevCache[logEntry.thumbnailId];
						}
					});
					return finalCache;
				});
				setIsLoading(false);
			} else {
				Object.values(newCacheEntries).forEach((url) => {
					if (url.startsWith("blob:")) URL.revokeObjectURL(url);
				});
			}
		};

		if (historyLog.length > 0 || localStorage.getItem(LOCAL_STORAGE_KEY)) {
			syncThumbnails();
		} else {
			setIsLoading(false);
		}

		return () => {
			isActive = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [historyLog]);

	useEffect(() => {
		return () => {
			setThumbnailCache((currentCache) => {
				Object.values(currentCache).forEach((url) => {
					if (url?.startsWith("blob:")) {
						URL.revokeObjectURL(url);
					}
				});
				return {};
			});
		};
	}, []);

	const saveHistoryLogToLocalStorage = useCallback(
		(log: ImageHistoryEntryMetadata[]) => {
			try {
				localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(log));
			} catch (error) {
				console.error("Failed to save history to localStorage:", error);
			}
		},
		[],
	);

	const loadImageDataFromMetadata = useCallback(
		async (
			entryMetadata: ImageHistoryEntryMetadata,
		): Promise<{ image: HTMLImageElement } | null> => {
			// This function inherently involves loading, so it's okay if it's part of a flow that sets isLoading.
			try {
				const imageBlob = await getBlob(entryMetadata.imageId);
				if (!imageBlob) {
					console.error(
						"loadImageDataFromMetadata: Image blob not found for ID:",
						entryMetadata.imageId,
					);
					return null;
				}
				const image = new Image();
				const objectURL = URL.createObjectURL(imageBlob);
				return new Promise((resolve, reject) => {
					image.onload = () => {
						URL.revokeObjectURL(objectURL);
						resolve({ image });
					};
					image.onerror = (err) => {
						URL.revokeObjectURL(objectURL);
						console.error(
							"loadImageDataFromMetadata: Failed to load image from blob:",
							err,
						);
						reject(err);
					};
					image.src = objectURL;
				});
			} catch (error) {
				console.error(
					"loadImageDataFromMetadata: Error loading image data:",
					error,
				);
				return null;
			}
		},
		[],
	);

	const addOrUpdateHistoryEntry = useCallback(
		async (
			imageFile: File | null,
			annotations: Annotation[],
			existingEntryId?: string | null,
		): Promise<ImageHistoryEntryMetadata | null> => {
			const isAnnotationOnlyUpdate = !imageFile && !!existingEntryId;

			const currentLogSnapshot = [...historyLog];
			const existingEntryIndex = existingEntryId
				? currentLogSnapshot.findIndex((e) => e.id === existingEntryId)
				: -1;

			// --- START OF ADDED CODE ---
			// If this is an annotation-only update, check if the annotations have actually changed.
			if (isAnnotationOnlyUpdate && existingEntryIndex !== -1) {
				const oldEntry = currentLogSnapshot[existingEntryIndex];
				// By comparing stringified versions, we do a deep-ish check.
				if (
					JSON.stringify(oldEntry.annotations) === JSON.stringify(annotations)
				) {
					// console.log("Annotations are identical, skipping save.");
					return oldEntry; // Abort the save and return the existing data.
				}
			}
			// --- END OF ADDED CODE ---

			if (!isAnnotationOnlyUpdate) {
				setIsLoading(true); // Only set global loading for new/replacement image operations
			}

			let newEntryMetadata: ImageHistoryEntryMetadata;
			try {
				const entryId =
					existingEntryId ||
					Date.now().toString() + Math.random().toString(36).substring(2, 9);
				let imageId = "";
				let thumbnailId = "";
				let originalImageName = imageFile?.name;

				// const currentLogSnapshot = [...historyLog] // This is already defined above
				// const existingEntryIndex = existingEntryId ? currentLogSnapshot.findIndex((e) => e.id === existingEntryId) : -1 // This is also defined above

				if (imageFile) {
					// New image or replacing image
					imageId = `img_${entryId}`;
					thumbnailId = `thumb_${entryId}`;
					if (existingEntryIndex !== -1) {
						const oldEntry = currentLogSnapshot[existingEntryIndex];
						if (oldEntry.imageId) await deleteBlob(oldEntry.imageId);
						if (oldEntry.thumbnailId) {
							await deleteBlob(oldEntry.thumbnailId);
							setThumbnailCache((prev) => {
								const newCache = { ...prev };
								if (newCache[oldEntry.thumbnailId]?.startsWith("blob:"))
									URL.revokeObjectURL(newCache[oldEntry.thumbnailId]);
								delete newCache[oldEntry.thumbnailId];
								return newCache;
							});
						}
					}
					const imageBlob = new Blob([imageFile], { type: imageFile.type });
					await storeBlob(imageId, imageBlob);
					const thumbBlob = await createThumbnail(
						imageBlob,
						THUMBNAIL_WIDTH,
						THUMBNAIL_HEIGHT,
					);
					await storeBlob(thumbnailId, thumbBlob);
					const newThumbUrl = URL.createObjectURL(thumbBlob);
					setThumbnailCache((prev) => ({
						...prev,
						[thumbnailId]: newThumbUrl,
					}));
				} else if (existingEntryIndex !== -1) {
					// Annotation-only update
					const existing = currentLogSnapshot[existingEntryIndex];
					imageId = existing.imageId;
					thumbnailId = existing.thumbnailId;
					originalImageName = existing.originalImageName;
				} else {
					console.error(
						"Cannot update history: No image file and no existing entry ID.",
					);
					if (!isAnnotationOnlyUpdate) setIsLoading(false);
					return null;
				}

				newEntryMetadata = {
					id: entryId,
					originalImageName,
					imageId,
					thumbnailId,
					annotations,
					lastModified: Date.now(),
				};

				const updatedLog = [...currentLogSnapshot];
				if (existingEntryIndex !== -1) {
					updatedLog[existingEntryIndex] = newEntryMetadata;
				} else {
					updatedLog.unshift(newEntryMetadata);
				}

				const entriesToPrune: ImageHistoryEntryMetadata[] = [];
				while (updatedLog.length > MAX_HISTORY_ITEMS) {
					const oldestEntry = updatedLog.pop();
					if (oldestEntry) entriesToPrune.push(oldestEntry);
				}

				setHistoryLog(updatedLog);
				saveHistoryLogToLocalStorage(updatedLog);

				if (entriesToPrune.length > 0) {
					Promise.all(
						entriesToPrune.map((entry) =>
							deleteBlob(entry.imageId).then(() =>
								deleteBlob(entry.thumbnailId),
							),
						),
					).then(() => {
						setThumbnailCache((prevCache) => {
							const newCache = { ...prevCache };
							entriesToPrune.forEach((pruned) => {
								if (newCache[pruned.thumbnailId]?.startsWith("blob:"))
									URL.revokeObjectURL(newCache[pruned.thumbnailId]);
								delete newCache[pruned.thumbnailId];
							});
							return newCache;
						});
					});
				}
				return newEntryMetadata;
			} catch (error) {
				console.error("Failed to save history entry:", error);
				return null;
			} finally {
				if (!isAnnotationOnlyUpdate) {
					// setIsLoading(false) // Let the sync effect triggered by setHistoryLog handle this
				}
			}
		},
		[historyLog, saveHistoryLogToLocalStorage],
	);

	const loadAndActivateEntryFromMetadata = useCallback(
		async (
			entryMetadata: ImageHistoryEntryMetadata,
		): Promise<LoadedHistoryEntry | null> => {
			setIsLoading(true); // This is a significant load operation
			try {
				const imageData = await loadImageDataFromMetadata(entryMetadata);
				if (!imageData) {
					console.error(
						"loadAndActivateEntryFromMetadata: Failed to get image data.",
					);
					return null;
				}
				setActiveHistoryEntryId(entryMetadata.id);
				return {
					...imageData,
					annotations: entryMetadata.annotations,
					id: entryMetadata.id,
					originalImageName: entryMetadata.originalImageName,
				};
			} catch (error) {
				console.error(
					"Failed to load and activate entry from metadata:",
					error,
				);
				return null;
			} finally {
				setIsLoading(false);
			}
		},
		[loadImageDataFromMetadata],
	);

	const loadHistoryEntry = useCallback(
		async (entryId: string): Promise<LoadedHistoryEntry | null> => {
			// This function itself doesn't set isLoading, it calls loadAndActivateEntryFromMetadata which does.
			const entryMetadata = historyLog.find((e) => e.id === entryId);
			if (!entryMetadata) {
				console.warn(
					`loadHistoryEntry: Metadata not found for entryId ${entryId}.`,
				);
				return null;
			}
			return loadAndActivateEntryFromMetadata(entryMetadata);
		},
		[historyLog, loadAndActivateEntryFromMetadata],
	);

	const deleteHistoryEntry = useCallback(
		async (entryId: string) => {
			setIsLoading(true); // Deletion can involve DB ops and affect UI, so show loader
			const entryToDelete = historyLog.find((e) => e.id === entryId);

			const newHistoryLog = historyLog.filter((e) => e.id !== entryId);
			setHistoryLog(newHistoryLog); // This will trigger sync effect which will set isLoading(false)
			saveHistoryLogToLocalStorage(newHistoryLog);

			if (entryToDelete) {
				await deleteBlob(entryToDelete.imageId);
				await deleteBlob(entryToDelete.thumbnailId);
				setThumbnailCache((prev) => {
					const newCache = { ...prev };
					if (newCache[entryToDelete.thumbnailId]?.startsWith("blob:"))
						URL.revokeObjectURL(newCache[entryToDelete.thumbnailId]);
					delete newCache[entryToDelete.thumbnailId];
					return newCache;
				});
			}

			if (activeHistoryEntryId === entryId) {
				setActiveHistoryEntryId(null);
			}
			// setIsLoading(false) will be handled by the sync effect after historyLog updates
		},
		[historyLog, activeHistoryEntryId, saveHistoryLogToLocalStorage],
	);

	return {
		historyLog,
		isLoadingHistory: isLoading,
		activeHistoryEntryId,
		addOrUpdateHistoryEntry,
		loadHistoryEntry,
		loadAndActivateEntryFromMetadata,
		deleteHistoryEntry,
		thumbnailCache,
		setActiveHistoryEntryId,
	};
};
