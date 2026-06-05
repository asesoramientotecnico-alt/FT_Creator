import type { ReactNode } from "react";

export const metadata = {
  title: "FAMIQ — Fichas técnicas",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html, body { margin: 0; padding: 0; background: #e9ebee; }
          body { font-family: 'DM Sans', Arial, sans-serif; color: #2b2b2b; padding: 12mm 0; }
          @page { size: A4; margin: 0; }
          @media print {
            body { background: white; padding: 0; }
            .ficha { box-shadow: none !important; margin: 0 auto !important; }
          }
          .print-mode body { background: white; padding: 0; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
