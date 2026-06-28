import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Footer from '@/components/footer/footer';
import { AuthProvider } from "@/lib/AuthContext";
import NotificationsInit from '@/components/notification/notificationsInit';
import NavbarClient from '@/components/navbar/NavbarClient';
import ClientShell from '@/components/ClientShell';

export const metadata = {
  title: 'SASHA',
  description: 'SASHA Web App',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          <NotificationsInit />
          <ClientShell>
            <NavbarClient />
            <main className="appMain">{children}</main>
            <Footer />
          </ClientShell>
        </AuthProvider>
      </body>
    </html>
  );
}
