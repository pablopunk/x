// Types and utilities for annotations
"use client";

export type Tool =
	| "cursor"
	| "rectangle"
	| "spotlight-area"
	| "pixelate-area"
	| "text"
	| "arrow"
	| "ellipse"
	| "line"
	| "highlight"
	| "crop";

export interface Point {
	x: number;
	y: number;
}

export interface BaseAnnotation {
	id: string;
	type: Tool;
	x: number;
	y: number;
	width: number;
	height: number;
	hidden?: boolean;
}

export interface RectangleAnnotation extends BaseAnnotation {
	type: "rectangle";
	strokeColor: string;
	fillColor?: string;
	strokeWidth: number;
}

export interface SpotlightAreaAnnotation extends BaseAnnotation {
	type: "spotlight-area";
}

export interface PixelateAreaAnnotation extends BaseAnnotation {
	type: "pixelate-area";
	pixelSize: number;
}

export interface TextAnnotation extends BaseAnnotation {
	type: "text";
	text: string;
	color: string;
	fontSize: number;
	fontFamily: string;
}

export interface ArrowAnnotation extends BaseAnnotation {
	type: "arrow";
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	color: string;
	strokeWidth: number;
}

export interface EllipseAnnotation extends BaseAnnotation {
	type: "ellipse";
	centerX: number;
	centerY: number;
	radiusX: number;
	radiusY: number;
	strokeColor: string;
	fillColor?: string;
	strokeWidth: number;
}

export interface LineAnnotation extends BaseAnnotation {
	type: "line";
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	color: string;
	strokeWidth: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
	type: "highlight";
	color: string; // rgba
	strokeWidth: number;
	points: Point[];
}

export type Annotation =
	| RectangleAnnotation
	| SpotlightAreaAnnotation
	| PixelateAreaAnnotation
	| TextAnnotation
	| ArrowAnnotation
	| EllipseAnnotation
	| LineAnnotation
	| HighlightAnnotation;

export const DEFAULT_STROKE_COLOR = "#FCA5A5"; // Pastel Red
export const DEFAULT_FILL_ALPHA = 0.3;
export const DEFAULT_FILL_COLOR = `rgba(252, 165, 165, ${DEFAULT_FILL_ALPHA})`;
export const DEFAULT_TEXT_COLOR = "#1F2937"; // Dark Gray
export const DEFAULT_HIGHLIGHT_ALPHA = 0.5;
export const DEFAULT_HIGHLIGHT_COLOR = `rgba(253, 224, 71, ${DEFAULT_HIGHLIGHT_ALPHA})`;
export const DEFAULT_PIXEL_SIZE = 10;

export const PREDEFINED_OPAQUE_COLORS = [
	"#FCA5A5",
	"#FDBA74",
	"#FDE047",
	"#86EFAC",
	"#93C5FD",
	"#A5B4FC",
	"#1F2937",
];

export const hexToRgba = (hex: string, alpha = 1): string => {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const rgbaToHex = (rgba: string): string => {
	const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
	if (!match) return "#000000";
	const r = Number.parseInt(match[1]).toString(16).padStart(2, "0");
	const g = Number.parseInt(match[2]).toString(16).padStart(2, "0");
	const b = Number.parseInt(match[3]).toString(16).padStart(2, "0");
	return `#${r}${g}${b}`;
};
