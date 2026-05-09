// TODO: Replace with server-side session/cookie once auth is fully set up

const getCookie = (name) => {
  if (typeof window === 'undefined') return null; // server side guard

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
};

export async function getUserRole() {
  const userCookie = getCookie('user');
  if (!userCookie) return null;

  const user = JSON.parse(userCookie);
  return user.role_name || null;
}