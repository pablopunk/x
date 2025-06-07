"use client";

import { useState, useMemo, useEffect } from "react";
import { X, Layers, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ImageHistoryEntryMetadata } from "@/hooks/use-image-history";

interface ImageHistoryTrayProps {
	historyLog: ImageHistoryEntryMetadata[];
	thumbnailCache: Record<string, string>;
	onSelectEntry: (entryId: string) => void;
	onDeleteEntry: (entryId: string) => void;
	activeEntryId: string | null;
	isLoading: boolean;
}

const FAN_ITEM_WIDTH = 100;
const FAN_ITEM_HEIGHT = 75;
const FAN_SPREAD_X = 60;
const FAN_ROTATE_DEG = 5;
const MAX_FAN_ITEMS_DISPLAY = 7;

const CARDS_Z_INDEX_BASE = 10;

export default function ImageHistoryTray({
	historyLog,
	thumbnailCache,
	onSelectEntry,
	onDeleteEntry,
	activeEntryId,
	isLoading,
}: ImageHistoryTrayProps) {
	const [isExpanded, setIsExpanded] = useState(false);
	const [fanViewStartIndex, setFanViewStartIndex] = useState(0);
	const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);

	useEffect(() => {
		if (!isExpanded) return;
		const maxPossibleStartIndex = Math.max(
			0,
			historyLog.length - MAX_FAN_ITEMS_DISPLAY,
		);
		if (fanViewStartIndex > maxPossibleStartIndex) {
			setFanViewStartIndex(maxPossibleStartIndex);
		}
	}, [historyLog, isExpanded, fanViewStartIndex]);

	const itemsToDisplay = useMemo(() => {
		const endIndex = fanViewStartIndex + MAX_FAN_ITEMS_DISPLAY;
		return historyLog.slice(fanViewStartIndex, endIndex).reverse();
	}, [historyLog, fanViewStartIndex]);

	const latestEntryForStack = historyLog[0];
	const isLatestThumbnailReady =
		latestEntryForStack && thumbnailCache[latestEntryForStack.thumbnailId];

	const canGoPrev = fanViewStartIndex > 0;
	const canGoNext =
		fanViewStartIndex + MAX_FAN_ITEMS_DISPLAY < historyLog.length;

	const handlePrev = () => {
		if (canGoPrev) {
			setFanViewStartIndex((prev) => Math.max(0, prev - 1));
		}
	};

	const handleNext = () => {
		if (canGoNext) {
			setFanViewStartIndex((prev) => prev + 1);
		}
	};

	useEffect(() => {
		if (!isExpanded) {
			setFanViewStartIndex(0);
			setHoveredItemId(null);
		}
	}, [isExpanded]);

	if (historyLog.length === 0 && !isLoading) {
		return (
			<div className="fixed bottom-4 left-4 z-20">
				<TooltipProvider delayDuration={300}>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								className="h-14 w-14 shadow-lg p-0"
								disabled
							>
								<Layers className="h-6 w-6 text-muted-foreground" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={10}>
							<p>No edit history yet.</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={300}>
			<div className="fixed bottom-4 left-4 z-20">
				{!isExpanded && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="outline"
								className="h-20 w-28 p-0 shadow-lg hover:ring-2 hover:ring-primary data-[loading=true]:opacity-70 relative"
								onClick={() => setIsExpanded(true)}
								disabled={isLoading && !isLatestThumbnailReady}
								data-loading={isLoading && !isLatestThumbnailReady}
							>
								{isLatestThumbnailReady ? (
									<img
										src={
											thumbnailCache[latestEntryForStack.thumbnailId] ||
											"/placeholder.svg"
										}
										alt={latestEntryForStack.originalImageName || "Latest edit"}
										className="h-full w-full object-cover rounded-md"
									/>
								) : (
									<div className="h-full w-full flex items-center justify-center bg-muted rounded-md">
										<Layers className="h-8 w-8 text-muted-foreground" />
									</div>
								)}
								{historyLog.length > 1 && (
									<div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-md">
										{historyLog.length}
									</div>
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={10}>
							<p>View Edit History ({historyLog.length})</p>
							{latestEntryForStack && (
								<p className="text-xs text-muted-foreground">
									{latestEntryForStack.originalImageName ||
										`Edit from ${new Date(latestEntryForStack.lastModified).toLocaleTimeString()}`}
								</p>
							)}
						</TooltipContent>
					</Tooltip>
				)}

				{isExpanded && (
					<div className="flex flex-col items-start">
						{/* Controls Container */}
						<div
							className="flex items-center gap-1 mb-2 pl-1"
							style={{ height: "32px" }}
						>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-full bg-background/80 shadow-md hover:bg-muted"
										onClick={handlePrev}
										disabled={!canGoPrev || isLoading}
										aria-label="Previous history items"
									>
										<ChevronLeft className="h-5 w-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Previous</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-full bg-background/80 shadow-md hover:bg-muted"
										onClick={() => setIsExpanded(false)}
										disabled={isLoading}
										aria-label="Close history fan"
									>
										<X className="h-5 w-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Close</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 rounded-full bg-background/80 shadow-md hover:bg-muted"
										onClick={handleNext}
										disabled={!canGoNext || isLoading}
										aria-label="Next history items"
									>
										<ChevronRight className="h-5 w-5" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>Next</TooltipContent>
							</Tooltip>
							{historyLog.length > MAX_FAN_ITEMS_DISPLAY && (
								<span className="text-xs text-muted-foreground ml-2">
									{fanViewStartIndex + 1}-
									{Math.min(
										fanViewStartIndex + MAX_FAN_ITEMS_DISPLAY,
										historyLog.length,
									)}{" "}
									of {historyLog.length}
								</span>
							)}
						</div>

						{/* Container for Fan Items */}
						<div
							className="relative"
							style={{
								height: FAN_ITEM_HEIGHT + 20,
								minWidth:
									(itemsToDisplay.length > 1
										? (itemsToDisplay.length - 1) * FAN_SPREAD_X
										: 0) +
									(itemsToDisplay.length > 0 ? FAN_ITEM_WIDTH : 0) +
									10,
							}}
						>
							{/* Single loop for rendering each item as a complete unit */}
							{itemsToDisplay.map((entry, index) => {
								const isThumbnailReady = !!thumbnailCache[entry.thumbnailId];
								const totalItemsInCurrentFanView = itemsToDisplay.length;
								const rotation =
									(index - (totalItemsInCurrentFanView - 1) / 2) *
									FAN_ROTATE_DEG *
									(2 / Math.max(1, totalItemsInCurrentFanView - 1));
								const transform = isExpanded
									? `translateX(${index * FAN_SPREAD_X}px) rotate(${rotation}deg)`
									: `translateX(0px) rotate(0deg) scale(0.5)`;
								const transitionDelay = isExpanded
									? `${index * 0.03}s`
									: `${(totalItemsInCurrentFanView - 1 - index) * 0.03}s`;
								const isButtonVisible =
									hoveredItemId === entry.id && isExpanded;

								return (
									<div
										key={entry.id}
										className="absolute bottom-0 left-0 transition-all duration-300 ease-out origin-bottom-left"
										style={{
											width: FAN_ITEM_WIDTH,
											height: FAN_ITEM_HEIGHT,
											zIndex: CARDS_Z_INDEX_BASE + index,
											opacity: isExpanded ? 1 : 0,
											transform: transform,
											transitionDelay: transitionDelay,
										}}
										onMouseEnter={() => setHoveredItemId(entry.id)}
										onMouseLeave={() => setHoveredItemId(null)}
									>
										{/* The Card and its Tooltip */}
										<Tooltip>
											<TooltipTrigger asChild>
												<Card
													className={`w-full h-full p-0.5 overflow-hidden shadow-lg cursor-pointer relative
                                      hover:ring-2 hover:ring-offset-1 hover:ring-primary focus:ring-2 focus:ring-offset-1 focus:ring-primary
                                      ${activeEntryId === entry.id ? "ring-2 ring-offset-1 ring-primary" : ""}
                                      ${isLoading ? "cursor-not-allowed opacity-70" : ""}`}
													onClick={() => !isLoading && onSelectEntry(entry.id)}
													aria-disabled={isLoading}
													tabIndex={0}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ")
															!isLoading && onSelectEntry(entry.id);
													}}
												>
													{isThumbnailReady ? (
														<img
															src={
																thumbnailCache[entry.thumbnailId] ||
																"/placeholder.svg"
															}
															alt={
																entry.originalImageName || `Edit ${entry.id}`
															}
															className="w-full h-full object-cover rounded-[0.2rem]"
														/>
													) : (
														<div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground rounded-[0.2rem]">
															<Layers className="h-5 w-5 text-muted-foreground/50" />
														</div>
													)}
												</Card>
											</TooltipTrigger>
											<TooltipContent side="top" align="center">
												<p>
													{entry.originalImageName ||
														`Edit ${new Date(entry.lastModified).toLocaleTimeString()}`}
												</p>
											</TooltipContent>
										</Tooltip>

										{/* The Delete Button and its Tooltip, positioned absolutely within the main wrapper */}
										<Tooltip>
											<TooltipTrigger asChild>
												<Button
													variant="destructive"
													size="icon"
													className="absolute top-1 left-1 h-6 w-6 rounded-full transition-opacity"
													style={{
														opacity: isButtonVisible ? 1 : 0,
														pointerEvents: isButtonVisible ? "auto" : "none",
														zIndex:
															CARDS_Z_INDEX_BASE + itemsToDisplay.length + 1, // Ensure button is on top of all cards
													}}
													onClick={(e) => {
														e.stopPropagation();
														if (!isLoading) onDeleteEntry(entry.id);
													}}
													disabled={isLoading || !isButtonVisible}
													aria-label={`Delete ${entry.originalImageName || "entry"}`}
													tabIndex={isButtonVisible ? 0 : -1}
												>
													<Trash2 className="h-3 w-3" />
												</Button>
											</TooltipTrigger>
											<TooltipContent
												side="bottom"
												align="start"
												sideOffset={5}
											>
												<p>Delete</p>
											</TooltipContent>
										</Tooltip>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}
