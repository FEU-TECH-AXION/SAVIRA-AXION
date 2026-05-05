// frontend/src/app/layout.js
//
// This is the root layout — wraps every page.
// Navbar and Footer live here so you only maintain them in one place.
//
// HOW AUTH WORKS:
//   Replace `getCurrentUser()` with your actual Supabase session call.
//   Once you have a real auth system, swap the mock below.

import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import Navbar from '@/components/navbar/navbar';
import Footer from '@/components/footer/footer';

export const metadata = {
  title: 'Savira',
  description: 'Savira Web App',
};

// ── Mock: replace this with your real Supabase session fetch ────────────────
// Example with Supabase (server component):
//
//   import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
//   import { cookies } from 'next/headers'
//
//   async function getCurrentUser() {
//     const supabase = createServerComponentClient({ cookies })
//     const { data: { session } } = await supabase.auth.getSession()
//     if (!session) return null
//     // fetch role from your users table
//     const { data } = await supabase
//       .from('users')
//       .select('role, first_name, last_name')
//       .eq('id', session.user.id)
//       .single()
//     return data
//   }
//
// For now, returning null = logged out (public visitor):
async function getCurrentUser() {
  return null;

  // To test a logged-in reporter, uncomment:
  return { role: "complainant", firstName: "Maria", lastName: "Santos" };

  // To test a case officer:
  // return { role: "case_officer", firstName: "Juan", lastName: "Cruz" };

  // To test an admin:
  // return { role: "admin", firstName: "Ana", lastName: "Reyes" };
}
// ────────────────────────────────────────────────────────────────────────────

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <Navbar user={user} />
        <main>{children}</main>
        <Footer user={user} />
      </body>
    </html>
  );
  
  // For testing, you can hardcode a user object here instead of calling getCurrentUser():
  // const adminUser = {
  //   role: "admin",
  //   firstName: "Admin",
  //   lastName: "User"
  // };
  // return (
  //   <html lang="en">
  //     <body>
  //       <Navbar user={adminUser} />
  //     <main>{children}</main>
  //     <Footer user={adminUser} />
  //     </body>
  //   </html>
  // );
  // const complainantUser = {
  //   role: "complainant",
  //   firstName: "Maria",
  //   lastName: "Santos"
  // };
  // return (
  //   <html lang="en">
  //     <body>
  //       <Navbar user={complainantUser} />
  //     <main>{children}</main>
  //     <Footer user={complainantUser} />
  //     </body>
  //   </html>
  // );
}