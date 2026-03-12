"use client";

import { isEqual } from "@/lib/utils";
import { useCallback, useState } from "react";

interface HistoryState<T> {
	past: T[];
	present: T;
	future: T[];
}

interface SetOptions {
	record?: boolean;
}

export const useHistory = <T>(initialPresent: T) => {
	const [history, setHistory] = useState<HistoryState<T>>({
		past: [],
		present: initialPresent,
		future: [],
	});

	const canUndo = history.past.length > 0;
	const canRedo = history.future.length > 0;

	const set = useCallback(
		(newState: T | ((prevState: T) => T), options: SetOptions = {}) => {
			setHistory((currentHistory) => {
				const newPresent =
					typeof newState === "function"
						? (newState as (prevState: T) => T)(currentHistory.present)
						: newState;

				if (isEqual(newPresent, currentHistory.present)) {
					return currentHistory;
				}

				if (options.record === false) {
					return {
						...currentHistory,
						present: newPresent,
					};
				}

				return {
					past: [...currentHistory.past, currentHistory.present],
					present: newPresent,
					future: [],
				};
			});
		},
		[],
	);

	const commit = useCallback((previousState: T, newState: T) => {
		setHistory((currentHistory) => {
			if (isEqual(previousState, newState)) {
				return currentHistory;
			}

			return {
				past: [...currentHistory.past, previousState],
				present: newState,
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
		commit,
		undo,
		redo,
		reset,
		canUndo,
		canRedo,
	};
};
