const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export async function fetchUsers() {
    const res = await fetch(`${API_URL}/api/users`, { cache: 'no-store' });
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

export async function fetchCommittees() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
  const response = await fetch(`${API_URL}/api/committees`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Failed to fetch committees');
  return response.json();
}

export async function fetchProjects() {
  const res = await fetch(`${API_URL}/api/projects`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch projects');
  }
  return res.json();
}

export async function createProject(payload) {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create project');
  }
  return data;
}

export async function uploadProjectImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API_URL}/api/projects/upload-image`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Image upload failed');
  }
  return data.url;
}

export async function updateProject(id, payload) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update project');
  }
  return data;
}

export async function deleteProject(id) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete project');
  }
  return data;
}

export async function deleteProjects(ids) {
  const res = await fetch(`${API_URL}/api/projects/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to delete selected projects');
  }
  return data;
}

export async function fetchProject(id) {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to fetch project');
  return data;
}

export async function fetchProjectTasks(projectId) {
  const res = await fetch(`${API_URL}/api/project-tasks/project/${projectId}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to fetch project tasks');
  return data.data || [];
}

export async function createProjectTask(projectId, payload) {
  const res = await fetch(`${API_URL}/api/project-tasks/project/${projectId}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create task');
  return data.data;
}

export async function updateProjectTask(taskId, payload) {
  const res = await fetch(`${API_URL}/api/project-tasks/${taskId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update task');
  return data.data;
}

export async function cancelProjectTask(taskId) {
  const res = await fetch(`${API_URL}/api/project-tasks/${taskId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to cancel task');
  return data.data;
}

export async function fetchTaskActivity(taskId) {
  const res = await fetch(`${API_URL}/api/project-tasks/${taskId}/activity`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to fetch task activity');
  return data.data || [];
}

export async function fetchStaffAvailability() {
  const res = await fetch(`${API_URL}/api/availability`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ([]));
  if (!res.ok) throw new Error(data.error || 'Failed to fetch staff availability');
  return Array.isArray(data) ? data : data.data || [];
}

export async function updateStaffAvailability(staffId, payload) {
  const res = await fetch(`${API_URL}/api/availability/${staffId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to update availability');
  return data.data;
}

export async function fetchChapters() {
  const res = await fetch(`${API_URL}/api/chapters`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to fetch chapters');
  return data;
}

export async function fetchChapter(id) {
  const res = await fetch(`${API_URL}/api/chapters/${id}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to fetch chapter');
  return data;
}

export async function createChapter(payload) {
  const res = await fetch(`${API_URL}/api/chapters`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to create chapter');
  return data;
}
