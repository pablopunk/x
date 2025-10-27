"use client";

import { Badge } from "@/components/ui/badge";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export default function OfflineStatus() {
	const [isOnline, setIsOnline] = useState(true);

	useEffect(() => {
		const updateOnlineStatus = () => {
			setIsOnline(navigator.onLine);
		};

		// Set initial status
		updateOnlineStatus();

		// Add event listeners
		window.addEventListener("online", updateOnlineStatus);
		window.addEventListener("offline", updateOnlineStatus);

		return () => {
			window.removeEventListener("online", updateOnlineStatus);
			window.removeEventListener("offline", updateOnlineStatus);
		};
	}, []);

	if (isOnline) {
		return null; // Don't show anything when online
	}

	return (
		<Badge
			variant="secondary"
			className="fixed top-4 right-4 z-50 bg-yellow-100 text-yellow-800 border-yellow-200"
		>
			<WifiOff className="w-3 h-3 mr-1" />
			Offline Mode
		</Badge>
	);
}
