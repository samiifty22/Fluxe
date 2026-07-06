import Providers from "./providers";

export const metadata = {
  title: "FLUXE — Autonomous E-Commerce OS",
  description: "8 AI agents. One dashboard. From product research to last-mile delivery.",
};
export const viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#06070F" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
