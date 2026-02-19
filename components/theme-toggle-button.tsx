"use client";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export const ThemeToggleButton = () => {
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [manualTheme, setManualTheme] = useState<string>("system");

	// Only show the UI once mounted on the client
	useEffect(() => {
		setMounted(true);

		// On first mount, if theme is "system", convert it to the actual system preference
		if (mounted && (theme === "system" || !theme)) {
			const systemIsDark = window.matchMedia(
				"(prefers-color-scheme: dark)",
			).matches;
			const initialTheme = systemIsDark ? "dark" : "light";

			if (setTheme) {
				setTheme(initialTheme);
			} else {
				setManualTheme(initialTheme);
				localStorage.setItem("theme", initialTheme);

				// Manually apply theme class
				const root = document.documentElement;
				root.classList.remove("light", "dark");
				if (initialTheme === "dark") {
					root.classList.add("dark");
				}
			}
		}

		// Fallback for when next-themes isn't working
		if (mounted && !theme && !resolvedTheme) {
			const storedTheme = localStorage.getItem("theme");
			if (storedTheme && (storedTheme === "dark" || storedTheme === "light")) {
				setManualTheme(storedTheme);
			} else {
				// No stored theme, use system preference
				const systemIsDark = window.matchMedia(
					"(prefers-color-scheme: dark)",
				).matches;
				const fallbackTheme = systemIsDark ? "dark" : "light";
				setManualTheme(fallbackTheme);
				localStorage.setItem("theme", fallbackTheme);
			}
		}
	}, [mounted, theme, resolvedTheme, setTheme]);

	// Function to handle theme toggling (only between dark and light)
	const handleToggleTheme = () => {
		// Determine current theme
		const currentTheme = theme || resolvedTheme || manualTheme;

		// Toggle between dark and light only
		const nextTheme = currentTheme === "dark" ? "light" : "dark";

		// Try to use next-themes first
		if (setTheme) {
			setTheme(nextTheme);
		} else {
			// Fallback: manually manage theme
			setManualTheme(nextTheme);
			localStorage.setItem("theme", nextTheme);

			// Manually apply theme class to document
			const root = document.documentElement;
			root.classList.remove("light", "dark");

			if (nextTheme === "dark") {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
		}
	};

	// Don't render anything until mounted to prevent hydration mismatch
	if (!mounted) {
		return (
			<Button variant="ghost" size="icon" className="h-9 w-9" disabled>
				<span className="sr-only">Loading theme</span>
			</Button>
		);
	}

	// Determine current theme for UI
	const currentTheme = theme || resolvedTheme || manualTheme;

	// Determine tooltip text
	const getTooltipText = () => {
		if (currentTheme === "dark") {
			return "Switch to light mode";
		}
		return "Switch to dark mode";
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						size="icon"
						onClick={handleToggleTheme}
						className="h-9 w-9"
					>
						<AnimatePresence mode="wait">
							{currentTheme === "dark" ? (
								<motion.div
									key="moon"
									initial={{ rotate: -90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: 90, opacity: 0 }}
									transition={{ duration: 0.2 }}
								>
									<Moon className="h-5 w-5" />
								</motion.div>
							) : (
								<motion.div
									key="sun"
									initial={{ rotate: 90, opacity: 0 }}
									animate={{ rotate: 0, opacity: 1 }}
									exit={{ rotate: -90, opacity: 0 }}
									transition={{ duration: 0.2 }}
								>
									<Sun className="h-5 w-5" />
								</motion.div>
							)}
						</AnimatePresence>
						<span className="sr-only">{getTooltipText()}</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent>{getTooltipText()}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
};
