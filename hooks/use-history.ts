"use client";

import { isEqual } from "@/lib/utils";
import { useCallback, useState } from "react";

interface HistoryEntry<T, M> {
	value: T;
	metadata: M;
}

interface HistoryState<T, M> {
	past: HistoryEntry<T, M>[];
	present: HistoryEntry<T, M>;
	future: HistoryEntry<T, M>[];
}

interface SetOptions {
	record?: boolean;
}

export const useHistory = <T, M = null>(
	initialPresent: T,
	initialMetadata: M = null as M,
) => {
	const [history, setHistory] = useState<HistoryState<T, M>>({
		past: [],
		present: { value: initialPresent, metadata: initialMetadata },
		future: [],
	});

	const canUndo = history.past.length > 0;
	const canRedo = history.future.length > 0;

	const set = useCallback(
		(newState: T | ((prevState: T) => T), options: SetOptions = {}) => {
			setHistory((currentHistory) => {
				const newPresent =
					typeof newState === "function"
						? (newState as (prevState: T) => T)(currentHistory.present.value)
						: newState;

				if (isEqual(newPresent, currentHistory.present.value)) {
					return currentHistory;
				}

				if (options.record === false) {
					return {
						...currentHistory,
						present: { ...currentHistory.present, value: newPresent },
					};
				}

				return {
					past: [...currentHistory.past, currentHistory.present],
					present: { ...currentHistory.present, value: newPresent },
					future: [],
				};
			});
		},
		[],
	);

	const commit = useCallback(
		(previousState: T, newState: T, metadata?: M) => {
			setHistory((currentHistory) => {
				const nextMetadata =
					metadata === undefined ? currentHistory.present.metadata : metadata;
				const metadataChanged =
					metadata !== undefined && metadata !== currentHistory.present.metadata;

				if (isEqual(previousState, newState) && !metadataChanged) {
					return currentHistory;
				}

				return {
					past: [
						...currentHistory.past,
						{ ...currentHistory.present, value: previousState },
					],
					present: { value: newState, metadata: nextMetadata },
					future: [],
				};
			});
		},
		[],
	);

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

	const reset = useCallback(
		(newInitialPresent: T, metadata: M = initialMetadata) => {
			setHistory({
				past: [],
				present: { value: newInitialPresent, metadata },
				future: [],
			});
		},
		[initialMetadata],
	);

	return {
		state: history.present.value,
		metadata: history.present.metadata,
		set,
		commit,
		undo,
		redo,
		reset,
		canUndo,
		canRedo,
	};
};
