import 'bootstrap/dist/css/bootstrap.min.css';

export const metadata = {
  title: 'Savira',
  description: 'Savira Web App',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}