"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Annotation, TextAnnotation } from "@/lib/annotations";
import {
	ArrowUpRight,
	Circle,
	Eye,
	EyeOff,
	GripVertical,
	Highlighter,
	Minus,
	Square,
	Trash2,
	Type,
} from "lucide-react";
import React, { useState, useCallback, useEffect, useRef, memo } from "react";

// Constants
const PANEL_WIDTH = 256; // w-64 = 256px
const PANEL_MAX_HEIGHT_VH = 0.7; // max-h-[70vh]
const PADDING = 20;
const TOOLBAR_HEIGHT = 80; // Approximate toolbar height
const SNAP_ANIMATION_DURATION = 400;
const RESIZE_ANIMATION_DURATION = 300;
const STORAGE_KEY = "layersPanelPosition";

interface LayersSidebarProps {
	annotations: Annotation[];
	selectedAnnotation: string | null;
	onAnnotationSelect: (id: string | null) => void;
	onAnnotationDelete: (id: string) => void;
	onAnnotationVisibilityToggle: (id: string) => void;
	onAnnotationReorder: (fromIndex: number, toIndex: number) => void;
}

interface Position {
	x: number;
	y: number;
}

const getAnnotationIcon = (annotation: Annotation) => {
	switch (annotation.type) {
		case "rectangle":
			return <Square className="h-4 w-4" />;
		case "ellipse":
			return <Circle className="h-4 w-4" />;
		case "text":
			return <Type className="h-4 w-4" />;
		case "arrow":
			return <ArrowUpRight className="h-4 w-4" />;
		case "line":
			return <Minus className="h-4 w-4" />;
		case "highlight":
			return <Highlighter className="h-4 w-4" />;
		case "spotlight-area":
			return <Square className="h-4 w-4" />;
		case "pixelate-area":
			return <Square className="h-4 w-4" />;
		default:
			return <Square className="h-4 w-4" />;
	}
};

const getAnnotationLabel = (annotation: Annotation): string => {
	switch (annotation.type) {
		case "rectangle":
			return "Rectangle";
		case "ellipse":
			return "Ellipse";
		case "text": {
			const textAnn = annotation as TextAnnotation;
			return textAnn.text.length > 15
				? `Text: "${textAnn.text.substring(0, 15)}..."`
				: `Text: "${textAnn.text}"`;
		}
		case "arrow":
			return "Arrow";
		case "line":
			return "Line";
		case "highlight":
			return "Highlight";
		case "spotlight-area":
			return "Spotlight";
		case "pixelate-area":
			return "Pixelate";
		default:
			return annotation.type;
	}
};

const getAnnotationColor = (annotation: Annotation): string => {
	if ("strokeColor" in annotation) {
		return annotation.strokeColor;
	}
	if ("color" in annotation) {
		return annotation.color;
	}
	return "#94a3b8";
};

// Memoized Layer Item Component
const LayerItem = memo(
	React.forwardRef<
		HTMLDivElement,
		{
			annotation: Annotation;
			index: number;
			isSelected: boolean;
			isFocused: boolean;
			draggedIndex: number | null;
			dragOverIndex: number | null;
			onDragStart: (e: React.DragEvent, index: number) => void;
			onDragOver: (e: React.DragEvent, index: number) => void;
			onDragLeave: () => void;
			onDrop: (e: React.DragEvent, index: number) => void;
			onDragEnd: () => void;
			onSelect: (id: string | null) => void;
			onVisibilityToggle: (id: string) => void;
			onDelete: (id: string) => void;
			onKeyDown: (e: React.KeyboardEvent, index: number) => void;
			totalLayers: number;
		}
	>(
		(
			{
				annotation,
				index,
				isSelected,
				isFocused,
				draggedIndex,
				dragOverIndex,
				onDragStart,
				onDragOver,
				onDragLeave,
				onDrop,
				onDragEnd,
				onSelect,
				onVisibilityToggle,
				onDelete,
				onKeyDown,
				totalLayers,
			},
			ref,
		) => {
			const isHidden = annotation.hidden ?? false;
			const color = getAnnotationColor(annotation);

			return (
				<div
					ref={ref}
					key={annotation.id}
					draggable
					onDragStart={(e) => onDragStart(e, index)}
					onDragOver={(e) => onDragOver(e, index)}
					onDragLeave={onDragLeave}
					onDrop={(e) => onDrop(e, index)}
					onDragEnd={onDragEnd}
					// biome-ignore lint/a11y/useSemanticElements: Div needed for drag-and-drop functionality
					role="button"
					tabIndex={isFocused ? 0 : -1}
					aria-label={getAnnotationLabel(annotation)}
					aria-selected={isSelected}
					onKeyDown={(e) => onKeyDown(e, index)}
					className={`group flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
						isSelected
							? "bg-primary/10 border-primary/30"
							: "hover:bg-muted/50 border-border"
					} ${
						dragOverIndex === index ? "border-primary bg-primary/5" : ""
					} ${draggedIndex === index ? "opacity-50" : ""} ${
						isHidden ? "opacity-40" : ""
					}`}
					onClick={() => onSelect(isSelected ? null : annotation.id)}
				>
					<GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab active:cursor-grabbing" />

					<div
						className="h-4 w-4 rounded-full border-2 flex-shrink-0"
						style={{ backgroundColor: color, borderColor: color }}
					/>

					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							{getAnnotationIcon(annotation)}
							<span className="text-sm font-medium truncate">
								{getAnnotationLabel(annotation)}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							aria-label={isHidden ? "Show layer" : "Hide layer"}
							onClick={(e) => {
								e.stopPropagation();
								onVisibilityToggle(annotation.id);
							}}
						>
							{isHidden ? (
								<EyeOff className="h-4 w-4" />
							) : (
								<Eye className="h-4 w-4" />
							)}
						</Button>

						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0 text-destructive hover:text-destructive"
							aria-label="Delete layer"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(annotation.id);
							}}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					</div>
				</div>
			);
		},
	),
);

LayerItem.displayName = "LayerItem";

type DropZone =
	| "top-left"
	| "top-right"
	| "left"
	| "right"
	| "bottom-left"
	| "bottom-right";

export default function LayersSidebar({
	annotations,
	selectedAnnotation,
	onAnnotationSelect,
	onAnnotationDelete,
	onAnnotationVisibilityToggle,
	onAnnotationReorder,
}: LayersSidebarProps) {
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
	const [isDraggingPanel, setIsDraggingPanel] = useState(false);
	const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
	const [isSnapping, setIsSnapping] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const positionRef = useRef<Position>({ x: 0, y: 0 });
	const layerRefs = useRef<(HTMLDivElement | null)[]>([]);

	// Keep ref in sync with state
	useEffect(() => {
		positionRef.current = position;
	}, [position]);

	// Set initial focus to first layer
	useEffect(() => {
		if (annotations.length > 0 && focusedIndex === -1) {
			setFocusedIndex(0);
		}
	}, [annotations.length, focusedIndex]);

	// Update refs array size when annotations change
	useEffect(() => {
		layerRefs.current = layerRefs.current.slice(0, annotations.length);
	}, [annotations.length]);

	// Focus the layer element when focusedIndex changes
	useEffect(() => {
		if (focusedIndex >= 0 && layerRefs.current[focusedIndex]) {
			layerRefs.current[focusedIndex]?.focus();
		}
	}, [focusedIndex]);

	const getDropZonePosition = useCallback((zone: DropZone): Position => {
		const panelHeight = window.innerHeight * PANEL_MAX_HEIGHT_VH;

		switch (zone) {
			case "top-left":
				return { x: PADDING, y: PADDING + TOOLBAR_HEIGHT };
			case "top-right":
				return {
					x: window.innerWidth - PANEL_WIDTH - PADDING,
					y: PADDING + TOOLBAR_HEIGHT,
				};
			case "left":
				return { x: PADDING, y: window.innerHeight / 2 - panelHeight / 2 };
			case "right":
				return {
					x: window.innerWidth - PANEL_WIDTH - PADDING,
					y: window.innerHeight / 2 - panelHeight / 2,
				};
			case "bottom-left":
				return { x: PADDING, y: window.innerHeight - panelHeight - PADDING };
			case "bottom-right":
				return {
					x: window.innerWidth - PANEL_WIDTH - PADDING,
					y: window.innerHeight - panelHeight - PADDING,
				};
			default:
				return { x: 0, y: 0 };
		}
	}, []);

	const findClosestDropZone = useCallback(
		(currentX: number, currentY: number): DropZone => {
			let closestZone: DropZone = "right";
			let minDistance = Number.POSITIVE_INFINITY;

			const zones: DropZone[] = [
				"top-left",
				"top-right",
				"left",
				"right",
				"bottom-left",
				"bottom-right",
			];

			for (const zone of zones) {
				const zonePosition = getDropZonePosition(zone);
				const distance = Math.sqrt(
					(currentX - zonePosition.x) ** 2 + (currentY - zonePosition.y) ** 2,
				);

				if (distance < minDistance) {
					minDistance = distance;
					closestZone = zone;
				}
			}

			return closestZone;
		},
		[getDropZonePosition],
	);

	// Reusable animation function
	const animateToPosition = useCallback(
		(targetX: number, targetY: number, duration: number) => {
			const startX = positionRef.current.x;
			const startY = positionRef.current.y;
			const startTime = Date.now();

			setIsSnapping(true);

			const animate = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				// Ease out cubic for smooth deceleration
				const easeProgress = 1 - (1 - progress) ** 3;

				setPosition({
					x: startX + (targetX - startX) * easeProgress,
					y: startY + (targetY - startY) * easeProgress,
				});

				if (progress < 1) {
					requestAnimationFrame(animate);
				} else {
					setIsSnapping(false);
				}
			};

			requestAnimationFrame(animate);
		},
		[],
	);

	const handleDragStart = (e: React.DragEvent, index: number) => {
		setDraggedIndex(index);
		e.dataTransfer.effectAllowed = "move";
	};

	const handleDragOver = (e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOverIndex(index);
	};

	const handleDragLeave = () => {
		setDragOverIndex(null);
	};

	const handleDrop = (e: React.DragEvent, dropIndex: number) => {
		e.preventDefault();
		if (draggedIndex !== null && draggedIndex !== dropIndex) {
			onAnnotationReorder(draggedIndex, dropIndex);
		}
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	const handleDragEnd = () => {
		setDraggedIndex(null);
		setDragOverIndex(null);
	};

	const handlePanelMouseDown = (e: React.MouseEvent) => {
		if (isSnapping) return; // Prevent dragging while snapping
		setIsDraggingPanel(true);
		setDragStart({
			x: e.clientX - position.x,
			y: e.clientY - position.y,
		});
	};

	const handlePanelMouseMove = useCallback(
		(e: MouseEvent) => {
			if (isDraggingPanel) {
				setPosition({
					x: e.clientX - dragStart.x,
					y: e.clientY - dragStart.y,
				});
			}
		},
		[isDraggingPanel, dragStart],
	);

	const handlePanelMouseUp = useCallback(() => {
		if (isDraggingPanel) {
			const closestZone = findClosestDropZone(
				positionRef.current.x,
				positionRef.current.y,
			);
			const snapPosition = getDropZonePosition(closestZone);
			animateToPosition(
				snapPosition.x,
				snapPosition.y,
				SNAP_ANIMATION_DURATION,
			);
		}
		setIsDraggingPanel(false);
	}, [
		isDraggingPanel,
		findClosestDropZone,
		getDropZonePosition,
		animateToPosition,
	]);

	// Load position from localStorage on mount
	useEffect(() => {
		if (typeof window !== "undefined") {
			try {
				const savedPosition = localStorage.getItem(STORAGE_KEY);
				if (savedPosition) {
					const parsed = JSON.parse(savedPosition) as Position;
					setPosition(parsed);
					positionRef.current = parsed;
				} else {
					// Set default position to "right" drop zone
					const rightPosition = getDropZonePosition("right");
					setPosition(rightPosition);
					positionRef.current = rightPosition;
				}
			} catch (error) {
				console.error(
					"Failed to load panel position from localStorage:",
					error,
				);
				const rightPosition = getDropZonePosition("right");
				setPosition(rightPosition);
				positionRef.current = rightPosition;
			}
		}
	}, [getDropZonePosition]);

	// Save position to localStorage when it changes (debounced via snap completion)
	useEffect(() => {
		if (!isSnapping && position.x !== 0 && position.y !== 0) {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
			} catch (error) {
				console.error("Failed to save panel position to localStorage:", error);
			}
		}
	}, [position, isSnapping]);

	useEffect(() => {
		if (isDraggingPanel) {
			document.addEventListener("mousemove", handlePanelMouseMove);
			document.addEventListener("mouseup", handlePanelMouseUp);
			return () => {
				document.removeEventListener("mousemove", handlePanelMouseMove);
				document.removeEventListener("mouseup", handlePanelMouseUp);
			};
		}
	}, [isDraggingPanel, handlePanelMouseMove, handlePanelMouseUp]);

	// Handle window resize - snap to closest zone
	useEffect(() => {
		const handleWindowResize = () => {
			const closestZone = findClosestDropZone(
				positionRef.current.x,
				positionRef.current.y,
			);
			const snapPosition = getDropZonePosition(closestZone);
			animateToPosition(
				snapPosition.x,
				snapPosition.y,
				RESIZE_ANIMATION_DURATION,
			);
		};

		window.addEventListener("resize", handleWindowResize);
		return () => {
			window.removeEventListener("resize", handleWindowResize);
		};
	}, [findClosestDropZone, getDropZonePosition, animateToPosition]);

	const handleDeleteClick = useCallback(
		(id: string) => {
			onAnnotationDelete(id);
			if (selectedAnnotation === id) {
				onAnnotationSelect(null);
			}
		},
		[onAnnotationDelete, onAnnotationSelect, selectedAnnotation],
	);

	const handleLayerKeyDown = useCallback(
		(e: React.KeyboardEvent, index: number) => {
			const reversedAnnotations = annotations.slice().reverse();
			const annotation = reversedAnnotations[index];

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					if (index < annotations.length - 1) {
						setFocusedIndex(index + 1);
					}
					break;
				case "ArrowUp":
					e.preventDefault();
					if (index > 0) {
						setFocusedIndex(index - 1);
					}
					break;
				case "Enter":
				case " ":
					e.preventDefault();
					onAnnotationSelect(
						selectedAnnotation === annotation.id ? null : annotation.id,
					);
					break;
				case "Delete":
				case "Backspace":
					e.preventDefault();
					handleDeleteClick(annotation.id);
					// Adjust focus after deletion
					if (index === annotations.length - 1 && index > 0) {
						setFocusedIndex(index - 1);
					}
					break;
				case "v":
				case "h":
					e.preventDefault();
					onAnnotationVisibilityToggle(annotation.id);
					break;
			}
		},
		[
			annotations,
			selectedAnnotation,
			onAnnotationSelect,
			onAnnotationVisibilityToggle,
			handleDeleteClick,
		],
	);

	if (annotations.length === 0) {
		return null;
	}

	return (
		<>
			<Card
				className="fixed w-64 border shadow-lg z-50 rounded-2xl"
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
					maxHeight: "70vh",
				}}
				role="complementary"
				aria-label="Layers panel"
			>
				<h2
					className="text-sm font-semibold select-none p-3 cursor-move"
					onMouseDown={handlePanelMouseDown}
				>
					Layers
				</h2>
				<Separator />
				<CardContent className="p-0">
					<div className="max-h-[60vh] overflow-y-auto">
						<div className="p-4 space-y-2">
							{annotations.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									No layers yet. Start annotating!
								</p>
							) : (
								annotations
									.slice()
									.reverse()
									.map((annotation, index) => (
										<LayerItem
											key={annotation.id}
											ref={(el) => {
												layerRefs.current[index] = el;
											}}
											annotation={annotation}
											index={index}
											isSelected={selectedAnnotation === annotation.id}
											isFocused={focusedIndex === index}
											draggedIndex={draggedIndex}
											dragOverIndex={dragOverIndex}
											onDragStart={handleDragStart}
											onDragOver={handleDragOver}
											onDragLeave={handleDragLeave}
											onDrop={handleDrop}
											onDragEnd={handleDragEnd}
											onSelect={onAnnotationSelect}
											onVisibilityToggle={onAnnotationVisibilityToggle}
											onDelete={handleDeleteClick}
											onKeyDown={handleLayerKeyDown}
											totalLayers={annotations.length}
										/>
									))
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
