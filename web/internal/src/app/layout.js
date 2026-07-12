import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import { I18nProvider } from "@/lib/i18n";
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
          <I18nProvider>
            <InternalShell>{children}</InternalShell>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
