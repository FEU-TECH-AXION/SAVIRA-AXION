const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchUsers() {
    const res = await fetch(`${API_URL}/api/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}