import './globals.css';

export const metadata = {
  title: 'ALKI — Peptide Intelligence Platform',
  description: 'AI-powered peptide intelligence. Personalized research-grade compound protocols and Eidolon body projection based on your biometric profile. For research and educational purposes only.',
  icons: {
    icon: '/favicon.ico',
  },
};

// Stage C — explicit mobile viewport so the app sizes to the device like a native
// app (width=device-width, initial-scale=1). userScalable is intentionally left
// enabled (pinch-to-zoom stays available for accessibility); we never lock
// maximumScale. viewport-fit is left at the default (auto) so the fixed bottom CTA
// bar and nav chrome stay inside the safe area instead of under the home indicator.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
