"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
	Eraser,
	Square,
	Eye,
	Copy,
	Save,
	Type,
	ArrowUpRight,
	Circle,
	Minus,
	Highlighter,
	Undo2,
	Redo2,
	MousePointer2,
	Trash2,
	Grid,
	Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useHistory as useAnnotationHistory } from "@/hooks/use-history";
import { useImageHistory } from "@/hooks/use-image-history";
import ImageHistoryTray from "@/components/image-history-tray";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
import Image from "next/image";
import ToolSettings from "@/components/tool-settings";
import { useCanvasActions } from "@/hooks/use-canvas-actions";
import {
	Tool,
	Point,
	Annotation,
	DEFAULT_STROKE_COLOR,
	DEFAULT_FILL_COLOR,
	DEFAULT_HIGHLIGHT_COLOR,
	DEFAULT_PIXEL_SIZE,
} from "@/lib/annotations";

export default function AnnotationCanvas() {
	const { theme, resolvedTheme } = useTheme();
	const { toast } = useToast();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [mainImage, setMainImage] = useState<HTMLImageElement | null>(null);
	const { copyToClipboard, saveToDisk } = useCanvasActions(
		canvasRef,
		mainImage,
	);
	const {
		historyLog,
		isLoadingHistory,
		activeHistoryEntryId,
		addOrUpdateHistoryEntry,
		loadHistoryEntry,
		loadAndActivateEntryFromMetadata,
		deleteHistoryEntry,
		thumbnailCache,
		setActiveHistoryEntryId,
	} = useImageHistory();

	const annotationHistory = useAnnotationHistory<Annotation[]>([]);
	const [currentTool, setCurrentTool] = useState<Tool>("cursor");
	const [isDrawing, setIsDrawing] = useState(false);
	const [startPoint, setStartPoint] = useState<Point | null>(null);
	const [currentEndPoint, setCurrentEndPoint] = useState<Point | null>(null);
	const [currentText, setCurrentText] = useState("");
	const [textInputPosition, setTextInputPosition] = useState<Point | null>(
		null,
	);
	const [currentHighlightPoints, setCurrentHighlightPoints] = useState<Point[]>(
		[],
	);
	const [strokeColor, setStrokeColor] = useState(DEFAULT_STROKE_COLOR);
	const [fillColor, setFillColor] = useState(DEFAULT_FILL_COLOR);
	const [useFill, setUseFill] = useState(false);
	const [strokeWidth, setStrokeWidth] = useState(3);
	const [spotlightDarkness, setSpotlightDarkness] = useState(0.7);
	const [pixelSize, setPixelSize] = useState(DEFAULT_PIXEL_SIZE);
	const [fontSize, setFontSize] = useState(24);
	const [fontFamily, setFontFamily] = useState("Arial");
	const [highlightColor, setHighlightColor] = useState(DEFAULT_HIGHLIGHT_COLOR);
	const [highlightStrokeWidth, setHighlightStrokeWidth] = useState(15);
	const [isCanvasLoading, setIsCanvasLoading] = useState(false);
	const [selectedAnnotationId, setSelectedAnnotationId] = useState<
		string | null
	>(null);
	const [isDraggingAnnotation, setIsDraggingAnnotation] = useState(false);
	const [dragOffset, setDragOffset] = useState<Point | null>(null);
	const textInputFieldRef = useRef<HTMLInputElement>(null);
	const textCardRef = useRef<HTMLDivElement>(null);
	const canvasContainerRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const getSelectedAnnotation = useCallback(() => {
		if (!selectedAnnotationId) return null;
		return (
			annotationHistory.state.find((a) => a.id === selectedAnnotationId) || null
		);
	}, [annotationHistory.state, selectedAnnotationId]);

	useEffect(() => {
		if (currentTool === "cursor" && selectedAnnotationId) {
			const selectedAnno = getSelectedAnnotation();
			if (selectedAnno) {
				switch (selectedAnno.type) {
					case "rectangle":
					case "ellipse":
						setStrokeColor(selectedAnno.strokeColor);
						setStrokeWidth(selectedAnno.strokeWidth);
						setUseFill(!!selectedAnno.fillColor);
						setFillColor(selectedAnno.fillColor || DEFAULT_FILL_COLOR);
						break;
					case "text":
						setStrokeColor(selectedAnno.color);
						setFontSize(selectedAnno.fontSize);
						setFontFamily(selectedAnno.fontFamily);
						break;
					case "arrow":
					case "line":
						setStrokeColor(selectedAnno.color);
						setStrokeWidth(selectedAnno.strokeWidth);
						break;
					case "highlight":
						setHighlightColor(selectedAnno.color);
						setHighlightStrokeWidth(selectedAnno.strokeWidth);
						break;
					case "pixelate-area":
						setPixelSize(selectedAnno.pixelSize);
						break;
				}
			}
		}
	}, [selectedAnnotationId, currentTool, getSelectedAnnotation]);

	const handleSettingChange = useCallback(
		<K extends keyof Annotation, V>(propName: K, value: V) => {
			if (currentTool === "cursor" && selectedAnnotationId) {
				annotationHistory.set((prevAnnos) =>
					prevAnnos.map((anno) => {
						if (anno.id === selectedAnnotationId) {
							const updatedAnno = { ...anno, [propName]: value };
							if (propName === "useFill") {
								(
									updatedAnno as RectangleAnnotation | EllipseAnnotation
								).fillColor = value ? fillColor : undefined;
							}
							if (
								propName === "strokeColor" &&
								(anno.type === "text" ||
									anno.type === "arrow" ||
									anno.type === "line")
							) {
								(
									updatedAnno as
										| TextAnnotation
										| ArrowAnnotation
										| LineAnnotation
								).color = value as string;
							}
							if (
								propName === "fillColor" &&
								(anno.type === "rectangle" || anno.type === "ellipse")
							) {
								(
									updatedAnno as RectangleAnnotation | EllipseAnnotation
								).fillColor = value as string;
							}
							if (propName === "highlightColor" && anno.type === "highlight") {
								(updatedAnno as HighlightAnnotation).color = value as string;
							}
							return updatedAnno;
						}
						return anno;
					}),
				);
			}
		},
		[currentTool, selectedAnnotationId, annotationHistory, fillColor],
	);

	const drawCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		if (!mainImage) {
			const canvasEl = canvasRef.current;
			if (!canvasEl) return;

			// Improved theme detection for canvas placeholder
			let placeholderBgHsl = "210 40% 96.1%"; // Light theme default
			let placeholderTextHsl = "215.4 16.3% 46.9%"; // Light theme default

			// Check multiple sources for current theme
			const isDarkMode =
				theme === "dark" ||
				resolvedTheme === "dark" ||
				document.documentElement.classList.contains("dark") ||
				window.matchMedia("(prefers-color-scheme: dark)").matches;

			if (isDarkMode) {
				placeholderBgHsl = "217.2 32.6% 17.5%"; // Dark theme
				placeholderTextHsl = "215 20.2% 65.1%"; // Dark theme
			}

			// Try to read actual CSS variables as override
			try {
				const computedStyle = getComputedStyle(document.documentElement);
				const mutedVar = computedStyle.getPropertyValue("--muted").trim();
				const mutedFgVar = computedStyle
					.getPropertyValue("--muted-foreground")
					.trim();

				if (mutedVar) {
					placeholderBgHsl = mutedVar;
				}
				if (mutedFgVar) {
					placeholderTextHsl = mutedFgVar;
				}
			} catch (e) {
				console.warn(
					"Could not read theme CSS variables for canvas placeholder.",
					e,
				);
			}

			ctx.fillStyle = `hsl(${placeholderBgHsl})`;
			ctx.fillRect(0, 0, canvasEl.width, canvasEl.height);
			ctx.fillStyle = `hsl(${placeholderTextHsl})`;
			ctx.font = "20px Arial";
			ctx.textAlign = "center";
			ctx.fillText(
				"Drop an image here or click to upload",
				canvasEl.width / 2,
				canvasEl.height / 2,
			);
			return;
		}

		ctx.drawImage(mainImage, 0, 0, canvas.width, canvas.height);

		const pixelateAreas = annotationHistory.state.filter(
			(a) => a.type === "pixelate-area",
		) as PixelateAreaAnnotation[];
		const spotlightAreas = annotationHistory.state.filter(
			(a) => a.type === "spotlight-area",
		) as SpotlightAreaAnnotation[];
		const shapeAnnotations = annotationHistory.state.filter(
			(a) => a.type !== "pixelate-area" && a.type !== "spotlight-area",
		);

		pixelateAreas.forEach((pixelate) => {
			const tempWidth = Math.max(
				1,
				Math.ceil(pixelate.width / pixelate.pixelSize),
			);
			const tempHeight = Math.max(
				1,
				Math.ceil(pixelate.height / pixelate.pixelSize),
			);
			const tempCanvas = document.createElement("canvas");
			tempCanvas.width = tempWidth;
			tempCanvas.height = tempHeight;
			const tempCtx = tempCanvas.getContext("2d");
			if (tempCtx) {
				tempCtx.drawImage(
					mainImage,
					pixelate.x,
					pixelate.y,
					pixelate.width,
					pixelate.height,
					0,
					0,
					tempWidth,
					tempHeight,
				);
				ctx.save();
				ctx.imageSmoothingEnabled = false;
				ctx.drawImage(
					tempCanvas,
					0,
					0,
					tempWidth,
					tempHeight,
					pixelate.x,
					pixelate.y,
					pixelate.width,
					pixelate.height,
				);
				ctx.restore();
			}
		});

		if (spotlightAreas.length > 0) {
			ctx.save();
			ctx.fillStyle = `rgba(0, 0, 0, ${spotlightDarkness})`;
			ctx.beginPath();
			ctx.rect(0, 0, canvas.width, canvas.height);
			spotlightAreas.forEach((spot) => {
				ctx.moveTo(spot.x, spot.y);
				ctx.lineTo(spot.x, spot.y + spot.height);
				ctx.lineTo(spot.x + spot.width, spot.y + spot.height);
				ctx.lineTo(spot.x + spot.width, spot.y);
				ctx.closePath();
			});
			ctx.fill("evenodd");
			ctx.restore();
		}

		shapeAnnotations.forEach((anno) => {
			ctx.save();
			if (anno.type === "rectangle") {
				const rect = anno as RectangleAnnotation;
				ctx.strokeStyle = rect.strokeColor;
				ctx.lineWidth = rect.strokeWidth;
				if (rect.fillColor) {
					ctx.fillStyle = rect.fillColor;
					ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
				}
				ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
			} else if (anno.type === "text") {
				const textAnno = anno as TextAnnotation;
				ctx.fillStyle = textAnno.color;
				ctx.font = `${textAnno.fontSize}px ${textAnno.fontFamily}`;
				ctx.textAlign = "left";
				ctx.textBaseline = "top";
				ctx.fillText(textAnno.text, textAnno.x, textAnno.y);
			} else if (anno.type === "arrow") {
				const arrow = anno as ArrowAnnotation;
				ctx.strokeStyle = arrow.color;
				ctx.lineWidth = arrow.strokeWidth;
				ctx.fillStyle = arrow.color;
				const angle = Math.atan2(
					arrow.endY - arrow.startY,
					arrow.endX - arrow.startX,
				);
				const headlen = 10 + arrow.strokeWidth * 2;
				const pullBackDistance = headlen * Math.cos(Math.PI / 6);
				const shaftEndX = arrow.endX - pullBackDistance * Math.cos(angle);
				const shaftEndY = arrow.endY - pullBackDistance * Math.sin(angle);
				ctx.beginPath();
				ctx.moveTo(arrow.startX, arrow.startY);
				ctx.lineTo(shaftEndX, shaftEndY);
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(arrow.endX, arrow.endY);
				ctx.lineTo(
					arrow.endX - headlen * Math.cos(angle - Math.PI / 6),
					arrow.endY - headlen * Math.sin(angle - Math.PI / 6),
				);
				ctx.lineTo(
					arrow.endX - headlen * Math.cos(angle + Math.PI / 6),
					arrow.endY - headlen * Math.sin(angle + Math.PI / 6),
				);
				ctx.closePath();
				ctx.fill();
			} else if (anno.type === "ellipse") {
				const ellipse = anno as EllipseAnnotation;
				ctx.strokeStyle = ellipse.strokeColor;
				ctx.lineWidth = ellipse.strokeWidth;
				ctx.beginPath();
				ctx.ellipse(
					ellipse.centerX,
					ellipse.centerY,
					ellipse.radiusX,
					ellipse.radiusY,
					0,
					0,
					2 * Math.PI,
				);
				if (ellipse.fillColor) {
					ctx.fillStyle = ellipse.fillColor;
					ctx.fill();
				}
				ctx.stroke();
			} else if (anno.type === "line") {
				const line = anno as LineAnnotation;
				ctx.strokeStyle = line.color;
				ctx.lineWidth = line.strokeWidth;
				ctx.beginPath();
				ctx.moveTo(line.startX, line.startY);
				ctx.lineTo(line.endX, line.endY);
				ctx.stroke();
			} else if (anno.type === "highlight") {
				const highlight = anno as HighlightAnnotation;
				ctx.strokeStyle = highlight.color;
				ctx.lineWidth = highlight.strokeWidth;
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.beginPath();
				if (highlight.points.length > 0) {
					ctx.moveTo(highlight.points[0].x, highlight.points[0].y);
					for (let i = 1; i < highlight.points.length; i++) {
						ctx.lineTo(highlight.points[i].x, highlight.points[i].y);
					}
					ctx.stroke();
				}
			}
			if (selectedAnnotationId === anno.id && currentTool === "cursor") {
				ctx.strokeStyle = "rgba(0, 100, 255, 0.7)";
				ctx.lineWidth = 2;
				ctx.setLineDash([4, 4]);
				const padding = 5;
				ctx.strokeRect(
					anno.x - padding / 2,
					anno.y - padding / 2,
					anno.width + padding,
					anno.height + padding,
				);
				ctx.setLineDash([]);
			}
			ctx.restore();
		});

		if (
			isDrawing &&
			startPoint &&
			currentEndPoint &&
			currentTool !== "cursor"
		) {
			ctx.save();
			const x = Math.min(startPoint.x, currentEndPoint.x);
			const y = Math.min(startPoint.y, currentEndPoint.y);
			const width = Math.abs(startPoint.x - currentEndPoint.x);
			const height = Math.abs(startPoint.y - currentEndPoint.y);

			if (currentTool === "rectangle") {
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = strokeWidth;
				if (useFill && fillColor) {
					ctx.fillStyle = fillColor;
					ctx.fillRect(x, y, width, height);
				}
				ctx.strokeRect(x, y, width, height);
			} else if (
				currentTool === "spotlight-area" ||
				currentTool === "pixelate-area"
			) {
				ctx.strokeStyle = "rgba(0,0,255,0.5)";
				ctx.lineWidth = 1;
				ctx.setLineDash([5, 5]);
				ctx.strokeRect(x, y, width, height);
				ctx.setLineDash([]);
			} else if (currentTool === "arrow" || currentTool === "line") {
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = strokeWidth;
				if (currentTool === "arrow") {
					const angle = Math.atan2(
						currentEndPoint.y - startPoint.y,
						currentEndPoint.x - startPoint.x,
					);
					const headlen = 10 + strokeWidth * 2;
					const pullBackDistance = headlen * Math.cos(Math.PI / 6);
					const shaftEndX =
						currentEndPoint.x - pullBackDistance * Math.cos(angle);
					const shaftEndY =
						currentEndPoint.y - pullBackDistance * Math.sin(angle);
					ctx.beginPath();
					ctx.moveTo(startPoint.x, startPoint.y);
					ctx.lineTo(shaftEndX, shaftEndY);
					ctx.stroke();
					ctx.beginPath();
					ctx.moveTo(currentEndPoint.x, currentEndPoint.y);
					ctx.lineTo(
						currentEndPoint.x - headlen * Math.cos(angle - Math.PI / 6),
						currentEndPoint.y - headlen * Math.sin(angle - Math.PI / 6),
					);
					ctx.lineTo(
						currentEndPoint.x - headlen * Math.cos(angle + Math.PI / 6),
						currentEndPoint.y - headlen * Math.sin(angle + Math.PI / 6),
					);
					ctx.closePath();
					ctx.fillStyle = strokeColor;
					ctx.fill();
				} else {
					ctx.beginPath();
					ctx.moveTo(startPoint.x, startPoint.y);
					ctx.lineTo(currentEndPoint.x, currentEndPoint.y);
					ctx.stroke();
				}
			} else if (currentTool === "ellipse") {
				const radiusX = width / 2;
				const radiusY = height / 2;
				const centerX = x + radiusX;
				const centerY = y + radiusY;
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = strokeWidth;
				ctx.beginPath();
				ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
				if (useFill && fillColor) {
					ctx.fillStyle = fillColor;
					ctx.fill();
				}
				ctx.stroke();
			} else if (
				currentTool === "highlight" &&
				currentHighlightPoints.length > 0
			) {
				ctx.strokeStyle = highlightColor;
				ctx.lineWidth = highlightStrokeWidth;
				ctx.lineCap = "round";
				ctx.lineJoin = "round";
				ctx.beginPath();
				ctx.moveTo(currentHighlightPoints[0].x, currentHighlightPoints[0].y);
				for (let i = 1; i < currentHighlightPoints.length; i++) {
					ctx.lineTo(currentHighlightPoints[i].x, currentHighlightPoints[i].y);
				}
				ctx.stroke();
			}
			ctx.restore();
		}
	}, [
		mainImage,
		annotationHistory.state,
		isDrawing,
		startPoint,
		currentEndPoint,
		currentTool,
		strokeColor,
		fillColor,
		useFill,
		strokeWidth,
		spotlightDarkness,
		pixelSize,
		fontSize,
		fontFamily,
		highlightColor,
		highlightStrokeWidth,
		currentHighlightPoints,
		selectedAnnotationId,
		theme,
		resolvedTheme,
	]);

	useEffect(() => {
		drawCanvas();
	}, [drawCanvas]);

	const addOrUpdateHistoryEntryRef = useRef(addOrUpdateHistoryEntry);
	useEffect(() => {
		addOrUpdateHistoryEntryRef.current = addOrUpdateHistoryEntry;
	}, [addOrUpdateHistoryEntry]);

	const saveCurrentAnnotationsToHistory = useCallback(async () => {
		if (activeHistoryEntryId && mainImage && annotationHistory) {
			await addOrUpdateHistoryEntryRef.current(
				null,
				annotationHistory.state,
				activeHistoryEntryId,
			);
		}
	}, [activeHistoryEntryId, mainImage, annotationHistory]);

	const debouncedSaveAnnotationsRef = useRef<NodeJS.Timeout | null>(null);
	useEffect(() => {
		if (mainImage && activeHistoryEntryId) {
			if (debouncedSaveAnnotationsRef.current) {
				clearTimeout(debouncedSaveAnnotationsRef.current);
			}
			debouncedSaveAnnotationsRef.current = setTimeout(() => {
				saveCurrentAnnotationsToHistory();
			}, 1000);
		}
		return () => {
			if (debouncedSaveAnnotationsRef.current) {
				clearTimeout(debouncedSaveAnnotationsRef.current);
			}
		};
	}, [
		annotationHistory,
		mainImage,
		activeHistoryEntryId,
		saveCurrentAnnotationsToHistory,
	]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas) {
			if (!mainImage) {
				const isActiveEntryInLog =
					activeHistoryEntryId &&
					historyLog.some(
						(entry) => entry.id === activeHistoryEntryId && entry.imageId,
					);
				if (!isActiveEntryInLog) {
					canvas.width = 600;
					canvas.height = 400;
				}
			}
			drawCanvas();
		}
	}, [mainImage, drawCanvas, activeHistoryEntryId, historyLog]);

	useEffect(() => {
		if (textInputPosition && textInputFieldRef.current) {
			setTimeout(() => textInputFieldRef.current?.focus(), 0);
		}
	}, [textInputPosition]);

	useEffect(() => {
		if (!textInputPosition) return;
		function handleClickOutside(event: MouseEvent) {
			if (
				textCardRef.current &&
				!textCardRef.current.contains(event.target as Node)
			) {
				setTextInputPosition(null);
				setCurrentText("");
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [textInputPosition]);

	const handleImageUpload = async (file: File) => {
		setIsCanvasLoading(true);
		try {
			if (mainImage && activeHistoryEntryId) {
				await addOrUpdateHistoryEntry(
					null,
					annotationHistory.state,
					activeHistoryEntryId,
				);
			}
			const newEntryMetadata = await addOrUpdateHistoryEntry(file, []);
			if (newEntryMetadata) {
				const loadedEntry =
					await loadAndActivateEntryFromMetadata(newEntryMetadata);
				if (loadedEntry) {
					setMainImage(loadedEntry.image);
					annotationHistory.reset(loadedEntry.annotations);
					setSelectedAnnotationId(null);
					const canvas = canvasRef.current;
					if (canvas) {
						canvas.width = loadedEntry.image.width;
						canvas.height = loadedEntry.image.height;
					}
				} else {
					setMainImage(null);
					annotationHistory.reset([]);
				}
			}
		} catch (error) {
			console.error("Error during image upload process:", error);
		} finally {
			setIsCanvasLoading(false);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			handleImageUpload(e.target.files[0]);
		}
	};
	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleImageUpload(e.dataTransfer.files[0]);
		}
	};
	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};
	const getMousePosition = (e: React.MouseEvent): Point => {
		const canvas = canvasRef.current;
		if (!canvas) return { x: 0, y: 0 };
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / rect.width;
		const scaleY = canvas.height / rect.height;
		return {
			x: (e.clientX - rect.left) * scaleX,
			y: (e.clientY - rect.top) * scaleY,
		};
	};
	const isPointInRect = (
		point: Point,
		rect: { x: number; y: number; width: number; height: number },
	): boolean => {
		return (
			point.x >= rect.x &&
			point.x <= rect.x + rect.width &&
			point.y >= rect.y &&
			point.y <= rect.y + rect.height
		);
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (
			!mainImage ||
			(textInputPosition && textCardRef.current?.contains(e.target as Node))
		)
			return;
		const pos = getMousePosition(e);
		if (currentTool === "cursor") {
			let foundAnnotation: Annotation | null = null;
			for (let i = annotationHistory.state.length - 1; i >= 0; i--) {
				const anno = annotationHistory.state[i];
				if (
					isPointInRect(pos, {
						x: anno.x,
						y: anno.y,
						width: anno.width,
						height: anno.height,
					})
				) {
					foundAnnotation = anno;
					break;
				}
			}
			if (foundAnnotation) {
				setSelectedAnnotationId(foundAnnotation.id);
				setIsDraggingAnnotation(true);
				setDragOffset({
					x: pos.x - foundAnnotation.x,
					y: pos.y - foundAnnotation.y,
				});
				setStartPoint(pos);
			} else {
				setSelectedAnnotationId(null);
				setIsDraggingAnnotation(false);
			}
			setIsDrawing(false);
			return;
		}
		setSelectedAnnotationId(null);
		if (currentTool === "text") {
			setTextInputPosition(pos);
			setCurrentText("");
			setIsDrawing(false);
		} else {
			setIsDrawing(true);
			setStartPoint(pos);
			setCurrentEndPoint(pos);
			if (currentTool === "highlight") setCurrentHighlightPoints([pos]);
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (!mainImage || (!isDrawing && !isDraggingAnnotation)) return;
		const pos = getMousePosition(e);
		if (
			isDraggingAnnotation &&
			selectedAnnotationId &&
			dragOffset &&
			startPoint
		) {
			const newX = pos.x - dragOffset.x;
			const newY = pos.y - dragOffset.y;
			annotationHistory.set((prevAnnotations) =>
				prevAnnotations.map((anno) => {
					if (anno.id === selectedAnnotationId) {
						const deltaX = newX - anno.x;
						const deltaY = newY - anno.y;
						let updatedAnno = { ...anno, x: newX, y: newY };
						if (anno.type === "arrow" || anno.type === "line") {
							updatedAnno = {
								...updatedAnno,
								startX: anno.startX + deltaX,
								startY: anno.startY + deltaY,
								endX: anno.endX + deltaX,
								endY: anno.endY + deltaY,
							};
						} else if (anno.type === "ellipse") {
							updatedAnno = {
								...updatedAnno,
								centerX: anno.centerX + deltaX,
								centerY: anno.centerY + deltaY,
							};
						} else if (anno.type === "highlight") {
							updatedAnno = {
								...updatedAnno,
								points: anno.points.map((p) => ({
									x: p.x + deltaX,
									y: p.y + deltaY,
								})),
							};
						} else if (anno.type === "text") {
							updatedAnno = {
								...updatedAnno,
								x: newX,
								y: newY,
							};
						}
						return updatedAnno;
					}
					return anno;
				}),
			);
		} else if (
			isDrawing &&
			startPoint &&
			currentTool !== "cursor" &&
			currentTool !== "text"
		) {
			setCurrentEndPoint(pos);
			if (currentTool === "highlight") {
				setCurrentHighlightPoints((prev) => [...prev, pos]);
			}
		}
	};

	const handleMouseUp = () => {
		if (isDraggingAnnotation) {
			setIsDraggingAnnotation(false);
			return;
		}
		if (currentTool === "cursor" || currentTool === "text") {
			setIsDrawing(false);
			setStartPoint(null);
			setCurrentEndPoint(null);
			return;
		}
		if (!isDrawing || !mainImage || !startPoint || !currentEndPoint) {
			if (currentTool === "highlight" && currentHighlightPoints.length > 1) {
				const newAnnotation: HighlightAnnotation = {
					id: Date.now().toString(),
					type: "highlight",
					points: [...currentHighlightPoints],
					color: highlightColor,
					strokeWidth: highlightStrokeWidth,
					x: Math.min(...currentHighlightPoints.map((p) => p.x)),
					y: Math.min(...currentHighlightPoints.map((p) => p.y)),
					width:
						Math.max(...currentHighlightPoints.map((p) => p.x)) -
						Math.min(...currentHighlightPoints.map((p) => p.x)),
					height:
						Math.max(...currentHighlightPoints.map((p) => p.y)) -
						Math.min(...currentHighlightPoints.map((p) => p.y)),
				};
				annotationHistory.set((prev) => [...prev, newAnnotation]);
			}
			setIsDrawing(false);
			setStartPoint(null);
			setCurrentEndPoint(null);
			setCurrentHighlightPoints([]);
			return;
		}

		const x = Math.min(startPoint.x, currentEndPoint.x);
		const y = Math.min(startPoint.y, currentEndPoint.y);
		const width = Math.abs(startPoint.x - currentEndPoint.x);
		const height = Math.abs(startPoint.y - currentEndPoint.y);

		if (width === 0 && height === 0 && currentTool !== "highlight") {
			setIsDrawing(false);
			setStartPoint(null);
			setCurrentEndPoint(null);
			return;
		}

		let newAnnotation: Annotation | null = null;
		switch (currentTool) {
			case "rectangle":
				newAnnotation = {
					id: Date.now().toString(),
					type: "rectangle",
					x,
					y,
					width,
					height,
					strokeColor,
					fillColor: useFill ? fillColor : undefined,
					strokeWidth,
				};
				break;
			case "spotlight-area":
				newAnnotation = {
					id: Date.now().toString(),
					type: "spotlight-area",
					x,
					y,
					width,
					height,
				};
				break;
			case "pixelate-area":
				newAnnotation = {
					id: Date.now().toString(),
					type: "pixelate-area",
					x,
					y,
					width,
					height,
					pixelSize,
				};
				break;
			case "arrow":
				newAnnotation = {
					id: Date.now().toString(),
					type: "arrow",
					startX: startPoint.x,
					startY: startPoint.y,
					endX: currentEndPoint.x,
					endY: currentEndPoint.y,
					color: strokeColor,
					strokeWidth,
					x,
					y,
					width,
					height,
				};
				break;
			case "ellipse":
				const radiusX = width / 2;
				const radiusY = height / 2;
				newAnnotation = {
					id: Date.now().toString(),
					type: "ellipse",
					centerX: x + radiusX,
					centerY: y + radiusY,
					radiusX,
					radiusY,
					strokeColor,
					fillColor: useFill ? fillColor : undefined,
					strokeWidth,
					x,
					y,
					width,
					height,
				};
				break;
			case "line":
				newAnnotation = {
					id: Date.now().toString(),
					type: "line",
					startX: startPoint.x,
					startY: startPoint.y,
					endX: currentEndPoint.x,
					endY: currentEndPoint.y,
					color: strokeColor,
					strokeWidth,
					x,
					y,
					width,
					height,
				};
				break;
			case "highlight":
				if (currentHighlightPoints.length > 1) {
					newAnnotation = {
						id: Date.now().toString(),
						type: "highlight",
						points: [...currentHighlightPoints],
						color: highlightColor,
						strokeWidth: highlightStrokeWidth,
						x: Math.min(...currentHighlightPoints.map((p) => p.x)),
						y: Math.min(...currentHighlightPoints.map((p) => p.y)),
						width:
							Math.max(...currentHighlightPoints.map((p) => p.x)) -
							Math.min(...currentHighlightPoints.map((p) => p.x)),
						height:
							Math.max(...currentHighlightPoints.map((p) => p.y)) -
							Math.min(...currentHighlightPoints.map((p) => p.y)),
					};
				}
				break;
		}
		if (newAnnotation)
			annotationHistory.set((prev) => [...prev, newAnnotation]);
		setIsDrawing(false);
		setStartPoint(null);
		setCurrentEndPoint(null);
		setCurrentHighlightPoints([]);
	};

	const handleTextSubmit = () => {
		if (!textInputPosition || !currentText.trim()) {
			setTextInputPosition(null);
			setCurrentText("");
			return;
		}
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.font = `${fontSize}px ${fontFamily}`;
		const textMetrics = ctx.measureText(currentText);
		const newTextAnnotation: TextAnnotation = {
			id: Date.now().toString(),
			type: "text",
			x: textInputPosition.x,
			y: textInputPosition.y,
			text: currentText,
			color: strokeColor,
			fontSize,
			fontFamily,
			width: textMetrics.width,
			height: fontSize,
		};
		annotationHistory.set((prev) => [...prev, newTextAnnotation]);
		setTextInputPosition(null);
		setCurrentText("");
	};

	const clearAllAnnotations = () => {
		annotationHistory.reset([]);
		setSelectedAnnotationId(null);
	};

	const handleDeleteSelectedAnnotation = () => {
		if (selectedAnnotationId) {
			annotationHistory.set((prev) =>
				prev.filter((anno) => anno.id !== selectedAnnotationId),
			);
			setSelectedAnnotationId(null);
		}
	};

	const switchTool = (tool: Tool) => {
		setCurrentTool(tool);
		if (tool !== "cursor") setSelectedAnnotationId(null);
		if (textInputPosition && tool !== "text") {
			setTextInputPosition(null);
			setCurrentText("");
		}
	};

	const toolList: {
		name: Tool;
		icon: React.ElementType;
		label: string;
		shortcut: string;
	}[] = [
		{ name: "cursor", icon: MousePointer2, label: "Cursor", shortcut: "V" },
		{ name: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
		{
			name: "spotlight-area",
			icon: Eye,
			label: "Spotlight Area",
			shortcut: "S",
		},
		{
			name: "pixelate-area",
			icon: Grid,
			label: "Pixelate Area",
			shortcut: "P",
		},
		{ name: "text", icon: Type, label: "Text", shortcut: "T" },
		{ name: "arrow", icon: ArrowUpRight, label: "Arrow", shortcut: "A" },
		{ name: "ellipse", icon: Circle, label: "Ellipse", shortcut: "E" },
		{ name: "line", icon: Minus, label: "Line", shortcut: "L" },
		{ name: "highlight", icon: Highlighter, label: "Highlight", shortcut: "B" },
	];

	const handleSelectHistoryEntry = async (entryId: string) => {
		if (isCanvasLoading || entryId === activeHistoryEntryId) return;
		setIsCanvasLoading(true);
		try {
			if (
				mainImage &&
				activeHistoryEntryId &&
				annotationHistory.state &&
				activeHistoryEntryId !== entryId
			) {
				await addOrUpdateHistoryEntry(
					null,
					annotationHistory.state,
					activeHistoryEntryId,
				);
			}
			const loadedEntry = await loadHistoryEntry(entryId);
			if (loadedEntry) {
				setMainImage(loadedEntry.image);
				annotationHistory.reset(loadedEntry.annotations);
				setSelectedAnnotationId(null);
				const canvas = canvasRef.current;
				if (canvas) {
					canvas.width = loadedEntry.image.width;
					canvas.height = loadedEntry.image.height;
				}
			}
		} catch (error) {
			console.error("Error selecting history entry:", error);
		} finally {
			setIsCanvasLoading(false);
		}
	};

	const handleDeleteFromTray = async (entryId: string) => {
		setIsCanvasLoading(true);
		try {
			await deleteHistoryEntry(entryId);
			if (entryId === activeHistoryEntryId) {
				setMainImage(null);
				annotationHistory.reset([]);
				const newLog = historyLog.filter((e) => e.id !== entryId);
				if (newLog.length > 0) {
					await handleSelectHistoryEntry(newLog[0].id);
				}
			} else if (historyLog.filter((e) => e.id !== entryId).length === 0) {
				setMainImage(null);
				annotationHistory.reset([]);
			}
		} catch (error) {
			console.error("Error deleting from tray:", error);
		} finally {
			setIsCanvasLoading(false);
		}
	};

	// Add keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't trigger shortcuts if user is typing in an input
			if (e.target instanceof HTMLInputElement) return;

			switch (e.key.toLowerCase()) {
				case "v":
					switchTool("cursor");
					break;
				case "b":
					switchTool("highlight");
					break;
				case "r":
					switchTool("rectangle");
					break;
				case "s":
					switchTool("spotlight-area");
					break;
				case "p":
					switchTool("pixelate-area");
					break;
				case "t":
					switchTool("text");
					break;
				case "a":
					switchTool("arrow");
					break;
				case "e":
					switchTool("ellipse");
					break;
				case "l":
					switchTool("line");
					break;
				case "z":
					if (e.metaKey || e.ctrlKey) {
						e.preventDefault();
						annotationHistory.undo();
					}
					break;
				case "backspace":
				case "delete":
					if (selectedAnnotationId && currentTool === "cursor") {
						handleDeleteSelectedAnnotation();
					}
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [annotationHistory, selectedAnnotationId, currentTool]);

	const selectedAnno = getSelectedAnnotation();
	const activeToolType: Tool =
		currentTool === "cursor" && selectedAnno ? selectedAnno.type : currentTool;

	return (
		<TooltipProvider>
			<div className="w-full h-full flex flex-col bg-background relative">
				<div className="flex flex-nowrap items-center overflow-x-auto gap-1 p-2">
					<Image
						src="/favicon/favicon-96x96.png"
						alt="Logo"
						width={32}
						height={32}
						className="rounded-sm mr-2"
					/>
					{toolList.map((tool) => (
						<Tooltip key={tool.name}>
							<TooltipTrigger asChild>
								<Button
									variant={currentTool === tool.name ? "secondary" : "ghost"}
									size="icon"
									onClick={() => switchTool(tool.name)}
									disabled={isCanvasLoading || isLoadingHistory}
								>
									<tool.icon className="h-5 w-5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{tool.label} ({tool.shortcut})
							</TooltipContent>
						</Tooltip>
					))}
					<Separator orientation="vertical" className="h-8 mx-2" />
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={annotationHistory.undo}
								title="Undo Annotation"
								disabled={
									!annotationHistory.canUndo ||
									isCanvasLoading ||
									isLoadingHistory
								}
							>
								<Undo2 className="h-5 w-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Undo</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={annotationHistory.redo}
								title="Redo Annotation"
								disabled={
									!annotationHistory.canRedo ||
									isCanvasLoading ||
									isLoadingHistory
								}
							>
								<Redo2 className="h-5 w-5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Redo</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={clearAllAnnotations}
								title="Clear Annotations"
								disabled={isCanvasLoading || isLoadingHistory}
							>
								<Eraser className="h-5 w-5 text-amber-500 dark:text-amber-400" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Clear All Annotations</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={handleDeleteSelectedAnnotation}
								disabled={
									!selectedAnnotationId ||
									currentTool !== "cursor" ||
									isCanvasLoading ||
									isLoadingHistory
								}
								title="Delete Selected"
							>
								<Trash2 className="h-5 w-5 text-red-500 dark:text-red-400" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Delete Selected Annotation</TooltipContent>
					</Tooltip>
					<Separator orientation="vertical" className="h-8 mx-2" />
					<div className="flex items-center gap-2 flex-wrap mr-auto">
						<ToolSettings
							activeToolType={activeToolType}
							strokeColor={strokeColor}
							setStrokeColor={setStrokeColor}
							strokeWidth={strokeWidth}
							setStrokeWidth={setStrokeWidth}
							useFill={useFill}
							setUseFill={setUseFill}
							fillColor={fillColor}
							setFillColor={setFillColor}
							fontSize={fontSize}
							setFontSize={setFontSize}
							fontFamily={fontFamily}
							setFontFamily={setFontFamily}
							spotlightDarkness={spotlightDarkness}
							setSpotlightDarkness={setSpotlightDarkness}
							pixelSize={pixelSize}
							setPixelSize={setPixelSize}
							highlightColor={highlightColor}
							setHighlightColor={setHighlightColor}
							highlightStrokeWidth={highlightStrokeWidth}
							setHighlightStrokeWidth={setHighlightStrokeWidth}
							handleSettingChange={handleSettingChange}
						/>
					</div>
					<div className="flex items-center gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={() =>
										window.open("https://github.com/pablopunk/x", "_blank")
									}
									className="h-9 w-9"
								>
									<Github className="h-5 w-5" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>View on GitHub</TooltipContent>
						</Tooltip>
						<ThemeToggleButton />
						<Separator orientation="vertical" className="h-8 mx-2" />
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={copyToClipboard}
									disabled={!mainImage || isCanvasLoading || isLoadingHistory}
									className="h-9 w-9 text-teal-500 dark:text-teal-400"
								>
									<Copy className="h-5 w-5 text-teal-500 dark:text-teal-400" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Copy to Clipboard</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									onClick={saveToDisk}
									disabled={!mainImage || isCanvasLoading || isLoadingHistory}
									className="h-9 w-9 text-emerald-500 dark:text-emerald-400"
								>
									<Save className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>Save to Disk</TooltipContent>
						</Tooltip>
					</div>
				</div>

				<div
					ref={canvasContainerRef}
					className={`relative flex-grow bg-muted flex items-center justify-center overflow-hidden ${currentTool === "cursor" ? "cursor-default" : currentTool === "text" ? "text-cursor" : "cursor-crosshair"}`}
					onDrop={handleDrop}
					onDragOver={handleDragOver}
					onClick={(e) => {
						if (
							!mainImage &&
							fileInputRef.current &&
							!(isCanvasLoading || isLoadingHistory)
						)
							fileInputRef.current.click();
						if (currentTool === "cursor" && e.target === e.currentTarget) {
							const pos = getMousePosition(e as unknown as React.MouseEvent);
							let onAnnotation = false;
							if (canvasRef.current) {
								const canvasRect = canvasRef.current.getBoundingClientRect();
								const clickX = e.clientX - canvasRect.left;
								const clickY = e.clientY - canvasRect.top;
								if (
									clickX >= 0 &&
									clickX <= canvasRect.width &&
									clickY >= 0 &&
									clickY <= canvasRect.height
								) {
									for (const anno of annotationHistory.state) {
										if (
											isPointInRect(pos, {
												x: anno.x,
												y: anno.y,
												width: anno.width,
												height: anno.height,
											})
										) {
											onAnnotation = true;
											break;
										}
									}
								}
							}
							if (!onAnnotation) setSelectedAnnotationId(null);
						}
					}}
				>
					<canvas
						ref={canvasRef}
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
						onMouseLeave={handleMouseUp}
						className="max-w-full max-h-full object-contain"
						style={{ visibility: "visible" }}
					/>
					{textInputPosition && (
						<div
							ref={textCardRef}
							style={(() => {
								if (
									canvasRef.current &&
									canvasContainerRef.current &&
									textInputPosition
								) {
									const canvasEl = canvasRef.current;
									const containerEl = canvasContainerRef.current;
									const canvasRect = canvasEl.getBoundingClientRect();
									const containerRect = containerEl.getBoundingClientRect();
									const canvasDisplayXInContainer =
										canvasRect.left - containerRect.left;
									const canvasDisplayYInContainer =
										canvasRect.top - containerRect.top;
									const currentDisplayScaleX =
										canvasRect.width / canvasEl.width;
									const currentDisplayScaleY =
										canvasRect.height / canvasEl.height;
									const clickXOnDisplayedCanvas =
										textInputPosition.x * currentDisplayScaleX;
									const clickYOnDisplayedCanvas =
										textInputPosition.y * currentDisplayScaleY;
									const cardLeft =
										canvasDisplayXInContainer + clickXOnDisplayedCanvas;
									const cardTop =
										canvasDisplayYInContainer + clickYOnDisplayedCanvas;
									return {
										position: "absolute",
										left: `${cardLeft}px`,
										top: `${cardTop}px`,
										zIndex: 10,
									};
								}
								return { display: "none" };
							})()}
						>
							<Card className="w-64 shadow-xl">
								<CardContent className="p-2">
									<Input
										ref={textInputFieldRef}
										type="text"
										value={currentText}
										onChange={(e) => setCurrentText(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") handleTextSubmit();
											if (e.key === "Escape") {
												setTextInputPosition(null);
												setCurrentText("");
											}
										}}
										className="w-full h-10 text-sm"
										placeholder="Type text & press Enter..."
									/>
								</CardContent>
							</Card>
						</div>
					)}
				</div>
				<input
					type="file"
					accept="image/*"
					ref={fileInputRef}
					onChange={handleFileChange}
					className="hidden"
				/>
				<ImageHistoryTray
					historyLog={historyLog}
					thumbnailCache={thumbnailCache}
					onSelectEntry={handleSelectHistoryEntry}
					onDeleteEntry={handleDeleteFromTray}
					activeEntryId={activeHistoryEntryId}
					isLoading={isLoadingHistory || isCanvasLoading}
				/>
			</div>
		</TooltipProvider>
	);
}
