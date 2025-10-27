"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
	Eye,
	EyeOff,
	Trash2,
	GripVertical,
	Square,
	Circle,
	Type,
	ArrowUpRight,
	Minus,
	Highlighter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Annotation, TextAnnotation } from "@/lib/annotations";

interface LayersSidebarProps {
	annotations: Annotation[];
	selectedAnnotation: string | null;
	onAnnotationSelect: (id: string | null) => void;
	onAnnotationDelete: (id: string) => void;
	onAnnotationVisibilityToggle: (id: string) => void;
	onAnnotationReorder: (fromIndex: number, toIndex: number) => void;
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
		case "text":
			const textAnn = annotation as TextAnnotation;
			return textAnn.text.length > 15
				? `Text: "${textAnn.text.substring(0, 15)}..."`
				: `Text: "${textAnn.text}"`;
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
			return (annotation as any).type;
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
	const [position, setPosition] = useState({ x: 0, y: 0 });
	const [isDraggingPanel, setIsDraggingPanel] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [isSnapping, setIsSnapping] = useState(false);
	const [snapTarget, setSnapTarget] = useState({ x: 0, y: 0 });

	// Define drop zones
	const dropZones = {
		"top-left": { x: 20, y: 20 },
		"top-right": { x: 0, y: 20 }, // Will be calculated as window width - panel width
		left: { x: 20, y: 0 }, // Will be calculated as window height / 2 - panel height / 2
		right: { x: 0, y: 0 }, // Will be calculated as window width - panel width, window height / 2 - panel height / 2
		"bottom-left": { x: 20, y: 0 }, // Will be calculated as window height - panel height
		"bottom-right": { x: 0, y: 0 }, // Will be calculated as window width - panel width, window height - panel height
	};

	const getDropZonePosition = (zone: keyof typeof dropZones) => {
		const panelWidth = 256; // w-64 = 256px
		const panelHeight = window.innerHeight * 0.7; // max-h-[70vh]
		const padding = 20;
		const toolbarHeight = 80; // Approximate toolbar height

		switch (zone) {
			case "top-left":
				return { x: padding, y: padding + toolbarHeight };
			case "top-right":
				return {
					x: window.innerWidth - panelWidth - padding,
					y: padding + toolbarHeight,
				};
			case "left":
				return { x: padding, y: window.innerHeight / 2 - panelHeight / 2 };
			case "right":
				return {
					x: window.innerWidth - panelWidth - padding,
					y: window.innerHeight / 2 - panelHeight / 2,
				};
			case "bottom-left":
				return { x: padding, y: window.innerHeight - panelHeight - padding };
			case "bottom-right":
				return {
					x: window.innerWidth - panelWidth - padding,
					y: window.innerHeight - panelHeight - padding,
				};
			default:
				return { x: 0, y: 0 };
		}
	};

	const findClosestDropZone = (currentX: number, currentY: number) => {
		let closestZone: keyof typeof dropZones = "right";
		let minDistance = Infinity;

		Object.keys(dropZones).forEach((zone) => {
			const zonePosition = getDropZonePosition(zone as keyof typeof dropZones);
			const distance = Math.sqrt(
				Math.pow(currentX - zonePosition.x, 2) +
					Math.pow(currentY - zonePosition.y, 2),
			);

			if (distance < minDistance) {
				minDistance = distance;
				closestZone = zone as keyof typeof dropZones;
			}
		});

		return closestZone;
	};

	const handleDeleteClick = (id: string) => {
		onAnnotationDelete(id);
		if (selectedAnnotation === id) {
			onAnnotationSelect(null);
		}
	};

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
			const closestZone = findClosestDropZone(position.x, position.y);
			const snapPosition = getDropZonePosition(closestZone);
			setSnapTarget(snapPosition);
			setIsSnapping(true);

			// Animate to snap position
			const startX = position.x;
			const startY = position.y;
			const targetX = snapPosition.x;
			const targetY = snapPosition.y;
			const duration = 400; // ms
			const startTime = Date.now();

			const animate = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				// Ease out cubic for smooth deceleration
				const easeProgress = 1 - Math.pow(1 - progress, 3);

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
		}
		setIsDraggingPanel(false);
	}, [isDraggingPanel, position.x, position.y]);

	useEffect(() => {
		// Set initial position after mount to default "right" drop zone
		if (typeof window !== "undefined" && position.x === 0 && position.y === 0) {
			const rightPosition = getDropZonePosition("right");
			setPosition(rightPosition);
		}
	}, [position.x, position.y]);

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

	useEffect(() => {
		const handleWindowResize = () => {
			// Snap to closest drop zone on window resize
			const closestZone = findClosestDropZone(position.x, position.y);
			const snapPosition = getDropZonePosition(closestZone);
			setSnapTarget(snapPosition);
			setIsSnapping(true);

			// Animate to snap position
			const startX = position.x;
			const startY = position.y;
			const targetX = snapPosition.x;
			const targetY = snapPosition.y;
			const duration = 300; // ms
			const startTime = Date.now();

			const animate = () => {
				const elapsed = Date.now() - startTime;
				const progress = Math.min(elapsed / duration, 1);
				// Ease out cubic for smooth deceleration
				const easeProgress = 1 - Math.pow(1 - progress, 3);

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
		};

		window.addEventListener("resize", handleWindowResize);
		return () => {
			window.removeEventListener("resize", handleWindowResize);
		};
	}, [position.x, position.y]);

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
			>
				<CardTitle
					className="text-sm font-semibold select-none p-3 cursor-move"
					onMouseDown={handlePanelMouseDown}
				>
					Layers
				</CardTitle>
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
									.map((annotation, index) => {
										const isSelected = selectedAnnotation === annotation.id;
										const isHidden = annotation.hidden ?? false;
										const color = getAnnotationColor(annotation);

										return (
											<div
												key={annotation.id}
												draggable
												onDragStart={(e) => handleDragStart(e, index)}
												onDragOver={(e) => handleDragOver(e, index)}
												onDragLeave={handleDragLeave}
												onDrop={(e) => handleDrop(e, index)}
												onDragEnd={handleDragEnd}
												className={`group flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
													isSelected
														? "bg-primary/10 border-primary/30"
														: "hover:bg-muted/50 border-border"
												} ${
													dragOverIndex === index
														? "border-primary bg-primary/5"
														: ""
												} ${draggedIndex === index ? "opacity-50" : ""} ${
													isHidden ? "opacity-40" : ""
												}`}
												onClick={() =>
													onAnnotationSelect(isSelected ? null : annotation.id)
												}
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
													<span className="text-xs text-muted-foreground">
														Layer {annotations.length - index}
													</span>
												</div>

												<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
													<Button
														variant="ghost"
														size="sm"
														className="h-8 w-8 p-0"
														onClick={(e) => {
															e.stopPropagation();
															onAnnotationVisibilityToggle(annotation.id);
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
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteClick(annotation.id);
														}}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												</div>
											</div>
										);
									})
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</>
	);
}
