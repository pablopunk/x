"use client";

import { useState, useCallback } from "react";

interface HistoryState<T> {
	past: T[];
	present: T;
	future: T[];
}

export const useHistory = <T>(initialPresent: T) => {
	const [history, setHistory] = useState<HistoryState<T>>({
		past: [],
		present: initialPresent,
		future: [],
	});

	const canUndo = history.past.length > 0;
	const canRedo = history.future.length > 0;

	const set = useCallback((newState: T | ((prevState: T) => T)) => {
		setHistory((currentHistory) => {
			const newPresent =
				typeof newState === "function"
					? (newState as (prevState: T) => T)(currentHistory.present)
					: newState;

			if (
				JSON.stringify(newPresent) === JSON.stringify(currentHistory.present)
			) {
				return currentHistory;
			}

			return {
				past: [...currentHistory.past, currentHistory.present],
				present: newPresent,
				future: [],
			};
		});
	}, []);

	const undo = useCallback(() => {
		if (!canUndo) {
			return;
		}
		setHistory((currentHistory) => {
			const previous = currentHistory.past[currentHistory.past.length - 1];
			const newPast = currentHistory.past.slice(
				0,
				currentHistory.past.length - 1,
			);
			return {
				past: newPast,
				present: previous,
				future: [currentHistory.present, ...currentHistory.future],
			};
		});
	}, [canUndo]);

	const redo = useCallback(() => {
		if (!canRedo) {
			return;
		}
		setHistory((currentHistory) => {
			const next = currentHistory.future[0];
			const newFuture = currentHistory.future.slice(1);
			return {
				past: [...currentHistory.past, currentHistory.present],
				present: next,
				future: newFuture,
			};
		});
	}, [canRedo]);

	const reset = useCallback((newInitialPresent: T) => {
		setHistory({
			past: [],
			present: newInitialPresent,
			future: [],
		});
	}, []);

	return {
		state: history.present,
		set,
		undo,
		redo,
		reset,
		canUndo,
		canRedo,
	};
};
