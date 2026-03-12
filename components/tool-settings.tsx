"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DEFAULT_FILL_ALPHA,
	DEFAULT_HIGHLIGHT_ALPHA,
	PREDEFINED_OPAQUE_COLORS,
	type Tool,
	hexToRgba,
	rgbaToHex,
} from "@/lib/annotations";
import { Code, Heading, Type } from "lucide-react";
import type React from "react";

export interface ToolSettingsProps {
	activeToolType: Tool | undefined;
	strokeColor: string;
	setStrokeColor: (val: string) => void;
	strokeWidth: number;
	setStrokeWidth: (val: number) => void;
	useFill: boolean;
	setUseFill: (val: boolean) => void;
	fillColor: string;
	setFillColor: (val: string) => void;
	fontSize: number;
	setFontSize: (val: number) => void;
	fontFamily: string;
	setFontFamily: (val: string) => void;
	spotlightDarkness: number;
	setSpotlightDarkness: (val: number) => void;
	pixelSize: number;
	setPixelSize: (val: number) => void;
	highlightColor: string;
	setHighlightColor: (val: string) => void;
	highlightStrokeWidth: number;
	setHighlightStrokeWidth: (val: number) => void;
	handleSettingChange: (prop: string, val: unknown) => void;
}

export default function ToolSettings({
	activeToolType,
	strokeColor,
	setStrokeColor,
	strokeWidth,
	setStrokeWidth,
	useFill,
	setUseFill,
	fillColor,
	setFillColor,
	fontSize,
	setFontSize,
	fontFamily,
	setFontFamily,
	spotlightDarkness,
	setSpotlightDarkness,
	pixelSize,
	setPixelSize,
	highlightColor,
	setHighlightColor,
	highlightStrokeWidth,
	setHighlightStrokeWidth,
	handleSettingChange,
}: ToolSettingsProps) {
	const debugSliderEnabled = () =>
		typeof window !== "undefined" &&
		window.localStorage.getItem("debugSlider") === "1";

	const logSlider = (
		id: string,
		eventName: string,
		event: React.SyntheticEvent<HTMLInputElement>,
	) => {
		if (!debugSliderEnabled()) return;
		const target = event.currentTarget;
		console.log(`[slider:${id}] ${eventName}`, {
			value: target.value,
			type: event.type,
			buttons:
				"buttons" in event ? (event as unknown as MouseEvent).buttons : 0,
		});
	};

	const SizeSlider = ({
		id,
		value,
		min,
		max,
		step = 1,
		onChange,
		ariaLabel,
		tooltip,
		suffix = "",
	}: {
		id: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		onChange: (val: number) => void;
		ariaLabel: string;
		tooltip: string;
		suffix?: string;
	}) => {
		const valueFromClientX = (input: HTMLInputElement, clientX: number) => {
			const rect = input.getBoundingClientRect();
			const ratio = Math.min(
				1,
				Math.max(0, (clientX - rect.left) / rect.width),
			);
			const raw = min + ratio * (max - min);
			const stepped = Math.round((raw - min) / step) * step + min;
			const normalized = Number(stepped.toFixed(4));
			return Math.min(max, Math.max(min, normalized));
		};

		return (
			<div
				className="flex items-center gap-2 rounded-md border border-input px-2 py-1 min-w-32"
				title={tooltip}
			>
				<input
					id={id}
					type="range"
					min={min}
					max={max}
					step={step}
					value={value}
					onInput={(e) => {
						logSlider(id, "input", e);
						onChange(Number((e.target as HTMLInputElement).value));
					}}
					onChange={(e) => {
						logSlider(id, "change", e);
						onChange(Number(e.target.value));
					}}
					onPointerDown={(e) => {
						e.stopPropagation();
						e.currentTarget.setPointerCapture(e.pointerId);
						onChange(valueFromClientX(e.currentTarget, e.clientX));
					}}
					onPointerMove={(e) => {
						logSlider(id, "pointermove", e);
						if (e.buttons !== 1) return;
						onChange(valueFromClientX(e.currentTarget, e.clientX));
					}}
					onPointerUp={(e) => {
						logSlider(id, "pointerup", e);
						if (e.currentTarget.hasPointerCapture(e.pointerId)) {
							e.currentTarget.releasePointerCapture(e.pointerId);
						}
					}}
					onMouseDown={(e) => e.stopPropagation()}
					onTouchStart={(e) => e.stopPropagation()}
					onDragStart={(e) => e.preventDefault()}
					draggable={false}
					aria-label={ariaLabel}
					className="w-full h-2 accent-primary cursor-pointer"
				/>
				<span className="text-xs tabular-nums text-muted-foreground w-10 text-right">
					{value}
					{suffix}
				</span>
			</div>
		);
	};

	const ColorPickerWithSwatches = ({
		currentColor,
		onColorSelect,
		colorType,
		tooltip,
	}: {
		currentColor: string;
		onColorSelect: (newColor: string) => void;
		colorType: "opaque" | "fill" | "highlight";
		tooltip: string;
	}) => {
		const handleSwatchClick = (hexColor: string) => {
			if (colorType === "opaque") onColorSelect(hexColor);
			else if (colorType === "fill")
				onColorSelect(hexToRgba(hexColor, DEFAULT_FILL_ALPHA));
			else if (colorType === "highlight")
				onColorSelect(hexToRgba(hexColor, DEFAULT_HIGHLIGHT_ALPHA));
		};
		const spectrumInputValue =
			colorType === "opaque" ? currentColor : rgbaToHex(currentColor);
		const handleSpectrumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
			const hexColor = e.target.value;
			if (colorType === "opaque") onColorSelect(hexColor);
			else if (colorType === "fill")
				onColorSelect(hexToRgba(hexColor, DEFAULT_FILL_ALPHA));
			else if (colorType === "highlight")
				onColorSelect(hexToRgba(hexColor, DEFAULT_HIGHLIGHT_ALPHA));
		};
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center gap-1 p-1 rounded-md border border-input">
						{PREDEFINED_OPAQUE_COLORS.map((hex) => (
							<button
								key={hex}
								type="button"
								className={`w-5 h-5 rounded-sm border hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
									(colorType === "opaque" && currentColor === hex) ||
									(colorType !== "opaque" && rgbaToHex(currentColor) === hex)
										? "ring-2 ring-offset-1 ring-primary"
										: "border-muted-foreground/50"
								}`}
								style={{
									backgroundColor:
										colorType === "opaque"
											? hex
											: hexToRgba(
													hex,
													colorType === "fill"
														? DEFAULT_FILL_ALPHA
														: DEFAULT_HIGHLIGHT_ALPHA,
												),
								}}
								onClick={() => handleSwatchClick(hex)}
							/>
						))}
						<Separator orientation="vertical" className="h-5 mx-1" />
						<Input
							type="color"
							value={spectrumInputValue}
							onChange={handleSpectrumChange}
							className="h-6 w-6 p-0 border-none bg-transparent"
						/>
					</div>
				</TooltipTrigger>
				<TooltipContent>{tooltip}</TooltipContent>
			</Tooltip>
		);
	};

	switch (activeToolType) {
		case "rectangle":
		case "ellipse":
			return (
				<>
					<ColorPickerWithSwatches
						currentColor={strokeColor}
						onColorSelect={(newColor) => {
							setStrokeColor(newColor);
							handleSettingChange("strokeColor", newColor);
						}}
						colorType="opaque"
						tooltip="Stroke Color"
					/>
					<SizeSlider
						id="strokeWidth"
						value={strokeWidth}
						min={1}
						max={24}
						onChange={(val) => {
							setStrokeWidth(val);
							handleSettingChange("strokeWidth", val);
						}}
						ariaLabel="Stroke Width"
						tooltip="Stroke Width"
					/>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="flex items-center p-2 rounded-md hover:bg-accent">
								<Checkbox
									id="useFill"
									checked={useFill}
									onCheckedChange={(checked) => {
										const val = Boolean(checked);
										setUseFill(val);
										handleSettingChange("useFill", val);
									}}
									aria-label="Fill Shape"
								/>
							</div>
						</TooltipTrigger>
						<TooltipContent>Fill Shape</TooltipContent>
					</Tooltip>
					{useFill && (
						<ColorPickerWithSwatches
							currentColor={fillColor}
							onColorSelect={(newColor) => {
								setFillColor(newColor);
								handleSettingChange("fillColor", newColor);
							}}
							colorType="fill"
							tooltip="Fill Color"
						/>
					)}
				</>
			);
		case "arrow":
		case "line":
		case "text":
			return (
				<>
					<ColorPickerWithSwatches
						currentColor={strokeColor}
						onColorSelect={(newColor) => {
							setStrokeColor(newColor);
							handleSettingChange("color", newColor);
						}}
						colorType="opaque"
						tooltip="Color"
					/>
					{activeToolType !== "text" && (
						<SizeSlider
							id="strokeWidth"
							value={strokeWidth}
							min={1}
							max={24}
							onChange={(val) => {
								setStrokeWidth(val);
								handleSettingChange("strokeWidth", val);
							}}
							ariaLabel="Line Width"
							tooltip="Line Width"
						/>
					)}
					{activeToolType === "text" && (
						<>
							<SizeSlider
								id="fontSize"
								value={fontSize}
								min={8}
								max={128}
								onChange={(val) => {
									setFontSize(val);
									handleSettingChange("fontSize", val);
								}}
								ariaLabel="Font Size"
								tooltip="Font Size"
							/>
							<div className="flex items-center gap-1 w-full">
								<Tooltip>
									<TooltipTrigger asChild>
										<Input
											id="fontFamily"
											type="text"
											value={fontFamily}
											onChange={(e) => {
												setFontFamily(e.target.value);
												handleSettingChange("fontFamily", e.target.value);
											}}
											className="h-8 flex-1 min-w-24"
											placeholder="Arial"
											aria-label="Font Family"
										/>
									</TooltipTrigger>
									<TooltipContent>Font Family</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant={
												fontFamily === "Arial, sans-serif"
													? "default"
													: "outline"
											}
											size="sm"
											className="h-8 w-8 p-0"
											onClick={() => {
												setFontFamily("Arial, sans-serif");
												handleSettingChange("fontFamily", "Arial, sans-serif");
											}}
											aria-label="Sans-serif font"
										>
											<Type className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Sans-serif (Arial)</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant={
												fontFamily === "Georgia, serif" ? "default" : "outline"
											}
											size="sm"
											className="h-8 w-8 p-0"
											onClick={() => {
												setFontFamily("Georgia, serif");
												handleSettingChange("fontFamily", "Georgia, serif");
											}}
											aria-label="Serif font"
										>
											<Heading className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Serif (Georgia)</TooltipContent>
								</Tooltip>
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant={
												fontFamily === "Monaco, monospace"
													? "default"
													: "outline"
											}
											size="sm"
											className="h-8 w-8 p-0"
											onClick={() => {
												setFontFamily("Monaco, monospace");
												handleSettingChange("fontFamily", "Monaco, monospace");
											}}
											aria-label="Monospace font"
										>
											<Code className="h-4 w-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent>Monospace (Monaco)</TooltipContent>
								</Tooltip>
							</div>
						</>
					)}
				</>
			);
		case "spotlight-area":
			return (
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="w-32">
							<Slider
								id="spotlightDarkness"
								min={0}
								max={1}
								step={0.01}
								value={[spotlightDarkness]}
								onValueChange={(val) => setSpotlightDarkness(val[0])}
								aria-label="Spotlight Darkness"
							/>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						Spotlight Darkness ({Math.round(spotlightDarkness * 100)}%)
					</TooltipContent>
				</Tooltip>
			);
		case "pixelate-area":
			return (
				<SizeSlider
					id="pixelSize"
					value={pixelSize}
					min={2}
					max={50}
					onChange={(val) => {
						setPixelSize(val);
						handleSettingChange("pixelSize", val);
					}}
					ariaLabel="Pixel Size"
					tooltip="Pixel Size"
					suffix="px"
				/>
			);
		case "highlight":
			return (
				<>
					<ColorPickerWithSwatches
						currentColor={highlightColor}
						onColorSelect={(newColor) => {
							setHighlightColor(newColor);
							handleSettingChange("color", newColor);
						}}
						colorType="highlight"
						tooltip="Highlight Color"
					/>
					<SizeSlider
						id="highlightStrokeWidth"
						value={highlightStrokeWidth}
						min={1}
						max={60}
						onChange={(val) => {
							setHighlightStrokeWidth(val);
							handleSettingChange("strokeWidth", val);
						}}
						ariaLabel="Highlight Width"
						tooltip="Highlight Width"
					/>
				</>
			);
		default:
			return null;
	}
}
