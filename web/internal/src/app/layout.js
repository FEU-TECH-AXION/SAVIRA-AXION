import "./globals.css";

export const metadata = {
  title: "SAVIRA Internal",
  description: "Internal SAVIRA operations portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
