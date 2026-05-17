import './globals.css';

export const metadata = {
  title: 'ALKI — Peptide Intelligence Platform',
  description: 'AI-powered peptide intelligence. Personalized research-grade compound protocols and Eidolon body projection based on your biometric profile. For research and educational purposes only.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,500;0,9..40,700;0,9..40,800;1,9..40,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
