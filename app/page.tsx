import AnnotationCanvas from "@/components/annotation-canvas";
import OfflineStatus from "@/components/offline-status";

export default function HomePage() {
	return (
		<main className="h-screen w-screen bg-muted/40">
			<OfflineStatus />
			<AnnotationCanvas />
		</main>
	);
}
