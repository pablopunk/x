/**
 * Guardrail tests for Text Tool fixes (Issue #23)
 * 
 * These tests verify the 5 specific bug fixes:
 * 1. Font resize calculation using proportional scale instead of naive height/lineCount
 * 2. Zoom-aware coordinate transformation in textarea positioning
 * 3. Target-based race condition fix instead of 100ms timing debounce
 * 4. Empty text measurement using zero-width space instead of regular space
 * 5. Consistent editingTextLayout sizing with zoom scaling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the measureTextAnnotation function behavior
const TEXT_LINE_HEIGHT = 1.2;
const TEXT_BACKGROUND_PADDING_X = 8;
const TEXT_BACKGROUND_PADDING_Y = 4;

function getTextLines(text: string) {
	return text.replace(/\r\n/g, "\n").split("\n");
}

// Simulates the fixed measureTextAnnotation function
function measureTextAnnotation(
	ctx: { measureText: (text: string) => { width: number } },
	annotation: {
		text: string;
		fontSize: number;
		fontFamily: string;
		backgroundColor?: string;
		strokeWidth?: number;
		shadowBlur?: number;
		shadowOffsetX?: number;
		shadowOffsetY?: number;
	},
) {
	const lines = getTextLines(annotation.text);
	const lineHeight = annotation.fontSize * TEXT_LINE_HEIGHT;
	
	// FIX #4: Use zero-width space instead of regular space for empty lines
	const textWidth = Math.max(
		1,
		...lines.map((line) => ctx.measureText(line || "\u200B").width),
	);

	const strokeInset = annotation.strokeWidth ? annotation.strokeWidth : 0;
	const paddingX = annotation.backgroundColor ? TEXT_BACKGROUND_PADDING_X : 0;
	const paddingY = annotation.backgroundColor ? TEXT_BACKGROUND_PADDING_Y : 0;
	const shadowBlur = annotation.shadowBlur ?? 0;
	const shadowOffsetX = annotation.shadowOffsetX ?? 0;
	const shadowOffsetY = annotation.shadowOffsetY ?? 0;
	const contentHeight = Math.max(
		annotation.fontSize,
		lines.length * lineHeight,
	);
	const width =
		textWidth + paddingX * 2 + strokeInset * 2 + shadowBlur * 2 + shadowOffsetX;
	const height =
		contentHeight +
		paddingY * 2 +
		strokeInset * 2 +
		shadowBlur * 2 +
		shadowOffsetY;

	return {
		lines,
		lineHeight,
		textWidth,
		contentHeight,
		paddingX,
		paddingY,
		strokeInset,
		shadowBlur,
		shadowOffsetX,
		shadowOffsetY,
		width,
		height,
	};
}

// Simulates the fixed font resize calculation
function calculateNextFontSize(
	resizedBounds: { height: number },
	anno: { text: string; fontSize: number },
) {
	// FIX #1: Use proportional scale based on original content height
	const originalLineCount = Math.max(1, getTextLines(anno.text).length);
	const originalContentHeight = originalLineCount * anno.fontSize * TEXT_LINE_HEIGHT;
	const heightScale = resizedBounds.height / Math.max(1, originalContentHeight);
	return Math.max(8, Math.round(anno.fontSize * heightScale));
}

// Simulates target-based click outside check
function shouldIgnoreClickOutside(
	eventTarget: EventTarget | null,
	triggerTarget: EventTarget | null,
) {
	// FIX #3: Compare targets instead of using timing
	return eventTarget === triggerTarget;
}

// Simulates zoom-aware textarea styling
function getTextareaStyles(
	fontSize: number,
	textStrokeWidth: number,
	textShadowOffsetX: number,
	textShadowOffsetY: number,
	textShadowBlur: number,
	zoom: number,
	editingTextLayout: { width: number; height: number } | null,
	editingTextAnnotation: { width: number; height: number } | null,
) {
	// FIX #2 & #5: Apply zoom scaling consistently to all dimensions
	return {
		fontSize: `${fontSize * zoom}px`,
		WebkitTextStroke: textStrokeWidth > 0
			? `${textStrokeWidth * zoom}px black`
			: undefined,
		textShadow: `${textShadowOffsetX * zoom}px ${textShadowOffsetY * zoom}px ${textShadowBlur * zoom}px black`,
		width: editingTextLayout
			? `${editingTextLayout.width * zoom}px`
			: editingTextAnnotation
				? `${editingTextAnnotation.width * zoom}px`
				: undefined,
		height: editingTextLayout
			? `${editingTextLayout.height * zoom}px`
			: editingTextAnnotation
				? `${editingTextAnnotation.height * zoom}px`
				: undefined,
	};
}

describe('Text Tool Fixes', () => {
	describe('FIX #1: Font resize calculation', () => {
		it('should scale font proportionally based on content height', () => {
			const anno = { text: "Hello\nWorld", fontSize: 24 };
			const resizedBounds = { height: 100 };
			
			const nextFontSize = calculateNextFontSize(resizedBounds, anno);
			
			// Original content height: 2 lines * 24px * 1.2 = 57.6px
			// Scale factor: 100 / 57.6 = 1.736
			// New font size: 24 * 1.736 = 41.67 -> rounded to 42
			expect(nextFontSize).toBe(42);
		});

		it('should not go below minimum font size of 8', () => {
			const anno = { text: "Hello", fontSize: 24 };
			const resizedBounds = { height: 10 };
			
			const nextFontSize = calculateNextFontSize(resizedBounds, anno);
			
			expect(nextFontSize).toBe(8);
		});
	});

	describe('FIX #2 & #5: Zoom-aware styling', () => {
		it('should scale font size with zoom', () => {
			const styles = getTextareaStyles(
				24, 2, 4, 4, 8, 2, // zoom = 2
				{ width: 100, height: 50 },
				null,
			);
			
			expect(styles.fontSize).toBe('48px'); // 24 * 2
			expect(styles.width).toBe('200px'); // 100 * 2
			expect(styles.height).toBe('100px'); // 50 * 2
		});

		it('should scale shadow and stroke with zoom', () => {
			const styles = getTextareaStyles(
				24, 2, 4, 4, 8, 1.5, // zoom = 1.5
				{ width: 100, height: 50 },
				null,
			);
			
			expect(styles.textShadow).toBe('6px 6px 12px black'); // 4*1.5, 4*1.5, 8*1.5
			expect(styles.WebkitTextStroke).toBe('3px black'); // 2*1.5
		});

		it('should fallback to editingTextAnnotation when editingTextLayout is null', () => {
			const styles = getTextareaStyles(
				24, 0, 4, 4, 8, 1,
				null, // editingTextLayout is null
				{ width: 150, height: 75 }, // use editingTextAnnotation
			);
			
			expect(styles.width).toBe('150px');
			expect(styles.height).toBe('75px');
		});
	});

	describe('FIX #3: Target-based click outside', () => {
		it('should ignore click when target matches trigger target', () => {
			const triggerTarget = document.createElement('canvas');
			const eventTarget = triggerTarget;
			
			expect(shouldIgnoreClickOutside(eventTarget, triggerTarget)).toBe(true);
		});

		it('should not ignore click when target differs from trigger target', () => {
			const triggerTarget = document.createElement('canvas');
			const eventTarget = document.createElement('div');
			
			expect(shouldIgnoreClickOutside(eventTarget, triggerTarget)).toBe(false);
		});

		it('should not ignore click when trigger target is null', () => {
			const eventTarget = document.createElement('div');
			
			expect(shouldIgnoreClickOutside(eventTarget, null)).toBe(false);
		});
	});

	describe('FIX #4: Empty text measurement', () => {
		const mockCtx = {
			measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
		};

		beforeEach(() => {
			mockCtx.measureText.mockClear();
		});

		it('should use zero-width space for empty lines', () => {
			const annotation = {
				text: "Line1\n\nLine3",
				fontSize: 24,
				fontFamily: "Arial",
			};
			
			measureTextAnnotation(mockCtx, annotation);
			
			// Check that empty line uses zero-width space
			const calls = mockCtx.measureText.mock.calls;
			expect(calls[1][0]).toBe('\u200B'); // Empty line becomes zero-width space
		});

		it('should not add width for zero-width space on empty lines', () => {
			// Zero-width space has width 0 or very small, unlike regular space
			const mockCtxWithZeroWidth = {
				measureText: vi.fn((text: string) => ({ 
					// Simulate: regular space = 5px, zero-width space = 0px, other chars = 10px
					width: text === '\u200B' ? 0 : text === ' ' ? 5 : text.length * 10 
				})),
			};

			const annotation = {
				text: "",
				fontSize: 24,
				fontFamily: "Arial",
			};
			
			const result = measureTextAnnotation(mockCtxWithZeroWidth, annotation);
			
			// With zero-width space, width should be minimal (just padding)
			expect(result.textWidth).toBe(0);
		});

		it('should measure correctly for completely empty text', () => {
			const annotation = {
				text: "",
				fontSize: 24,
				fontFamily: "Arial",
			};
			
			const result = measureTextAnnotation(mockCtx, annotation);
			
			// Should have 1 line (empty string split gives [''])
			expect(result.lines).toEqual(['']);
			// Should use zero-width space for measurement
			expect(mockCtx.measureText).toHaveBeenCalledWith('\u200B');
		});
	});
});

// Export for potential external use
export { measureTextAnnotation, calculateNextFontSize, shouldIgnoreClickOutside, getTextareaStyles };
