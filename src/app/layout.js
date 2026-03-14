import "./globals.css";

export const metadata = {
  title: "Jackalope — Architectural Project Management",
  description: "Multi-project task management platform for architectural teams",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
