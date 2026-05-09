const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchUsers() {
    const res = await fetch(`${API_URL}/api/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
}

export async function signupUser(form) {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
    });

    const data = await res.json();

    console.log('Status:', res.status);
    console.log('Data:', data);

    if (!res.ok) {
        // Throw errors array from backend validator, or wrap single error
        throw data.errors || [{ path: 'general', msg: data.error || 'Signup failed.' }];
    }

    return data;
}

export async function loginUser(form) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
        throw data.errors || [{ path: 'general', msg: data.error || 'Login failed.' }];
    }
    return data;
}