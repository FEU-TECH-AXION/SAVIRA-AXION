import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Script from 'next/script';
import Footer from '@/components/footer/footer';
import { AuthProvider } from "@/lib/AuthContext";
import NotificationsInit from '@/components/notification/notificationsInit';
import NavbarClient from '@/components/navbar/NavbarClient';
import ClientShell from '@/components/ClientShell';
import DisplayPreferencesClient from '@/components/settings/DisplayPreferencesClient';

export const metadata = {
  title: 'SASHA',
  description: 'SASHA Web App',
};

const themeInitScript = `(function(){try{var k='savira_display_prefs';var p=JSON.parse(localStorage.getItem(k)||'{}');if(p.theme==='system'&&p.themeDefaultMigrated!==true){p.theme='light';p.themeDefaultMigrated=true;localStorage.setItem(k,JSON.stringify(p));}var r=document.documentElement;var t=localStorage.getItem('token');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=(p.theme==='dark'||(p.theme==='system'&&m))&&!!t;r.dataset.theme=d?'dark':'light';if(p.fontSize)r.dataset.fontSize=p.fontSize;if(p.reducedMotion)r.dataset.reducedMotion='true';if(p.highContrast)r.dataset.highContrast='true';if(p.screenReaderHints===false)r.dataset.screenReaderHints='false';if(p.language)r.lang=p.language;}catch(e){}})();`;


export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <Script id="theme-init-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      <body>
        <AuthProvider>
          <DisplayPreferencesClient />
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
