import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import InternalShell from "@/components/navigation/InternalShell";

export const metadata = {
  title: "SAVIRA Internal",
  description: "Internal SAVIRA operations portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <InternalShell>{children}</InternalShell>
        </AuthProvider>
      </body>
    </html>
  );
}
