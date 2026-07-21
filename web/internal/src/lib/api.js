import { internalApiFetch } from "@/lib/internalApiFetch";

async function readJson(response, fallback) {
  return response.json().catch(() => fallback);
}

function apiError(response, data, fallback) {
  const error = new Error(data?.error || fallback);
  error.status = response.status;
  error.code = data?.code;
  return error;
}

export async function fetchUsers() {
  const res = await internalApiFetch("/api/users", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function fetchCommittees() {
  const response = await internalApiFetch("/api/committees", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch committees");
  return response.json();
}

export async function fetchRoles() {
  const response = await internalApiFetch("/api/roles", { cache: "no-store" });
  const data = await readJson(response, []);
  if (!response.ok) throw new Error(data.error || "Failed to fetch roles");
  return data;
}

export async function deactivateUser(userId) {
  const response = await internalApiFetch(`/api/users/${userId}/deactivate`, {
    method: "PATCH",
  });
  const data = await readJson(response, {});
  if (!response.ok) throw new Error(data.error || "Failed to deactivate user");
  return data;
}

export async function reactivateUser(userId) {
  const response = await internalApiFetch(`/api/users/${userId}/reactivate`, {
    method: "PATCH",
  });
  const data = await readJson(response, {});
  if (!response.ok) throw new Error(data.error || "Failed to reactivate user");
  return data;
}

export async function deleteUser(userId) {
  const response = await internalApiFetch(`/api/users/${userId}`, {
    method: "DELETE",
  });
  const data = await readJson(response, {});
  if (!response.ok) throw new Error(data.error || "Failed to delete user");
  return data;
}

export async function fetchProjects() {
  const res = await internalApiFetch("/api/projects", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function createProject(payload) {
  const res = await internalApiFetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to create project");
  return data;
}

export async function uploadProjectImage(file) {
  const form = new FormData();
  form.append("image", file);
  const res = await internalApiFetch("/api/projects/upload-image", {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Image upload failed");
  return data.url;
}

export async function updateProject(id, payload) {
  const res = await internalApiFetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw apiError(res, data, "Failed to update project");
  return data;
}

export async function deleteProject(id) {
  const res = await internalApiFetch(`/api/projects/${id}`, {
    method: "DELETE",
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete project");
  return data;
}

export async function deleteProjects(ids) {
  const res = await internalApiFetch("/api/projects/bulk-delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to delete selected projects");
  return data;
}

export async function fetchProject(id) {
  const res = await internalApiFetch(`/api/projects/${id}`, { cache: "no-store" });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to fetch project");
  return data;
}

export async function fetchProjectTasks(projectId) {
  const res = await internalApiFetch(`/api/project-tasks/project/${projectId}`, {
    cache: "no-store",
  });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to fetch project tasks");
  return data.data || [];
}

export async function fetchAllProjectTasks() {
  const res = await internalApiFetch("/api/project-tasks", { cache: "no-store" });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to fetch project tasks");
  return data.data || [];
}

export async function createProjectTask(projectId, payload) {
  const res = await internalApiFetch(`/api/project-tasks/project/${projectId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res, {});
  if (!res.ok) throw apiError(res, data, "Failed to create task");
  return data.data;
}

export async function updateProjectTask(taskId, payload) {
  const res = await internalApiFetch(`/api/project-tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res, {});
  if (!res.ok) throw apiError(res, data, "Failed to update task");
  return data.data;
}

export async function cancelProjectTask(taskId) {
  const res = await internalApiFetch(`/api/project-tasks/${taskId}`, {
    method: "DELETE",
  });
  const data = await readJson(res, {});
  if (!res.ok) throw apiError(res, data, "Failed to cancel task");
  return data.data;
}

export async function fetchTaskActivity(taskId) {
  const res = await internalApiFetch(`/api/project-tasks/${taskId}/activity`, {
    cache: "no-store",
  });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to fetch task activity");
  return data.data || [];
}

export async function fetchStaffAvailability() {
  const res = await internalApiFetch("/api/availability", { cache: "no-store" });
  const data = await readJson(res, []);
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff availability");
  return Array.isArray(data) ? data : data.data || [];
}

export async function fetchAvailabilityFor(userId) {
  const res = await internalApiFetch(`/api/availability/${userId}`, { cache: "no-store" });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to fetch availability");
  return data.data;
}

export async function fetchStaff() {
  const res = await internalApiFetch("/api/staff", { cache: "no-store" });
  const data = await readJson(res, []);
  if (!res.ok) throw new Error(data.error || "Failed to fetch staff");
  return Array.isArray(data) ? data : data.data || [];
}

export async function updateStaffAvailability(staffId, payload) {
  const res = await internalApiFetch(`/api/availability/${staffId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to update availability");
  return data.data;
}

export async function fetchChapters() {
  const res = await internalApiFetch("/api/chapters", { cache: "no-store" });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to fetch chapters");
  return data;
}

export async function fetchChapter(id) {
  const res = await internalApiFetch(`/api/chapters/${id}`, { cache: "no-store" });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to fetch chapter");
  return data;
}

export async function createChapter(payload) {
  const res = await internalApiFetch("/api/chapters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to create chapter");
  return data;
}

export async function updateChapter(id, payload) {
  const res = await internalApiFetch(`/api/chapters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to update chapter");
  return data;
}

export async function deleteChapter(id) {
  const res = await internalApiFetch(`/api/chapters/${id}`, {
    method: "DELETE",
  });
  const data = await readJson(res, {});
  if (!res.ok) throw new Error(data.error || "Failed to delete chapter");
  return data.deleted;
}
