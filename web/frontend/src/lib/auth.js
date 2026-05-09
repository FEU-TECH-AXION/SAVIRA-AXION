// TODO: Replace with server-side session/cookie once auth is fully set up

export async function getUserRole() {
  if (typeof window === 'undefined') return null; // server side guard

  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) return null;

  return user.roles?.role_name || null;
}