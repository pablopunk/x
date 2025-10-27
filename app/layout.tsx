import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster"; // Ensure this path is correct for your project
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	metadataBase: new URL("https://x.pablopunk.com"),
	title: "X — Free Image Annotation Tool",
	description:
		"Annotate images privately in your browser with this open-source tool.",
	generator: "v0.dev",
	keywords: [
		"image annotation",
		"screenshot editor",
		"open source",
		"free tool",
	],
	alternates: {
		canonical: "https://x.pablopunk.com",
	},
	openGraph: {
		type: "website",
		url: "https://x.pablopunk.com",
		title: "X — Free Image Annotation Tool",
		description:
			"Annotate images privately in your browser with this open-source tool.",
		siteName: "X",
		images: [
			{
				url: "/screenshot.webp",
				width: 1200,
				height: 630,
				alt: "X screenshot",
			},
		],
		locale: "en_US",
	},
	twitter: {
		card: "summary_large_image",
		site: "@pablopunk",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link
					rel="icon"
					type="image/png"
					href="/favicon/favicon-96x96.png"
					sizes="96x96"
				/>
				<link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
				<link rel="shortcut icon" href="/favicon/favicon.ico" />
				<link
					rel="apple-touch-icon"
					sizes="180x180"
					href="/favicon/apple-touch-icon.png"
				/>
				<link rel="manifest" href="/favicon/site.webmanifest" />
				<link rel="canonical" href="https://x.pablopunk.com" />
				{process.env.NODE_ENV === "production" && (
					<Script
						data-goatcounter="/goat"
						async
						src="/count.js"
						strategy="afterInteractive"
					/>
				)}
				<Script
					id="service-worker"
					strategy="afterInteractive"
					dangerouslySetInnerHTML={{
						__html: `
							if ('serviceWorker' in navigator) {
								window.addEventListener('load', function() {
									navigator.serviceWorker.register('/sw.js')
										.then(function(registration) {
											console.log('SW registered: ', registration);
										})
										.catch(function(registrationError) {
											console.log('SW registration failed: ', registrationError);
										});
								});
							}
						`,
					}}
				/>
			</head>
			<body className={inter.className}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem={true}
					disableTransitionOnChange={false}
					storageKey="theme"
				>
					{children}
					<Toaster />
				</ThemeProvider>
			</body>
		</html>
	);
}
