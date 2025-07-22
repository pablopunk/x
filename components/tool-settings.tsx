"use client";

import React from "react";
import {
	PREDEFINED_OPAQUE_COLORS,
	DEFAULT_FILL_ALPHA,
	DEFAULT_HIGHLIGHT_ALPHA,
	hexToRgba,
	rgbaToHex,
	Tool,
} from "@/lib/annotations";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Type, Heading, Code } from "lucide-react";

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
	handleSettingChange: <K extends keyof any, V>(prop: K, val: V) => void;
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
									{
										true: colorType === "opaque" && currentColor === hex,
										false:
											colorType !== "opaque" && rgbaToHex(currentColor) === hex,
									}[true]
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
					<Tooltip>
						<TooltipTrigger asChild>
							<Input
								id="strokeWidth"
								type="number"
								value={strokeWidth}
								onChange={(e) => {
									const val = Number.parseInt(e.target.value);
									setStrokeWidth(val);
									handleSettingChange("strokeWidth", val);
								}}
								min="1"
								className="h-8 w-16"
								aria-label="Stroke Width"
							/>
						</TooltipTrigger>
						<TooltipContent>Stroke Width</TooltipContent>
					</Tooltip>
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
						<Tooltip>
							<TooltipTrigger asChild>
								<Input
									id="strokeWidth"
									type="number"
									value={strokeWidth}
									onChange={(e) => {
										const val = Number.parseInt(e.target.value);
										setStrokeWidth(val);
										handleSettingChange("strokeWidth", val);
									}}
									min="1"
									className="h-8 w-16"
									aria-label="Line Width"
								/>
							</TooltipTrigger>
							<TooltipContent>Line Width</TooltipContent>
						</Tooltip>
					)}
					{activeToolType === "text" && (
						<>
							<Tooltip>
								<TooltipTrigger asChild>
									<Input
										id="fontSize"
										type="number"
										value={fontSize}
										onChange={(e) => {
											const val = Number.parseInt(e.target.value);
											setFontSize(val);
											handleSettingChange("fontSize", val);
										}}
										min="8"
										className="h-8 w-16"
										aria-label="Font Size"
									/>
								</TooltipTrigger>
								<TooltipContent>Font Size</TooltipContent>
							</Tooltip>
							<div className="flex items-center gap-1">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											variant={fontFamily === "Arial, sans-serif" ? "default" : "outline"}
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
											variant={fontFamily === "Georgia, serif" ? "default" : "outline"}
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
											variant={fontFamily === "Monaco, monospace" ? "default" : "outline"}
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
										className="h-8 w-24"
										placeholder="Arial"
										aria-label="Font Family"
									/>
								</TooltipTrigger>
								<TooltipContent>Font Family</TooltipContent>
							</Tooltip>
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
				<Tooltip>
					<TooltipTrigger asChild>
						<div className="w-32">
							<Slider
								id="pixelSize"
								min={2}
								max={50}
								step={1}
								value={[pixelSize]}
								onValueChange={(val) => {
									setPixelSize(val[0]);
									handleSettingChange("pixelSize", val[0]);
								}}
								aria-label="Pixel Size"
							/>
						</div>
					</TooltipTrigger>
					<TooltipContent>Pixel Size ({pixelSize}px)</TooltipContent>
				</Tooltip>
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
					<Tooltip>
						<TooltipTrigger asChild>
							<Input
								id="highlightStrokeWidth"
								type="number"
								value={highlightStrokeWidth}
								onChange={(e) => {
									const val = Number.parseInt(e.target.value);
									setHighlightStrokeWidth(val);
									handleSettingChange("strokeWidth", val);
								}}
								min="1"
								className="h-8 w-16"
								aria-label="Highlight Width"
							/>
						</TooltipTrigger>
						<TooltipContent>Highlight Width</TooltipContent>
					</Tooltip>
				</>
			);
		default:
			return null;
	}
}
