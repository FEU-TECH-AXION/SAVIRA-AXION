const supabase = require('../config/supabase')

function buildActor(user) {
  if (!user) return null

  const actorName = [
    user.first_name,
    user.middle_name,
    user.last_name,
    user.extension_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim()

  return {
    actorId: user.user_id,
    actorName: actorName || user.email || null,
    actorRole: user.roles?.role_name || null,
    firstName: user.first_name || null,
    middleName: user.middle_name || null,
    lastName: user.last_name || null,
    extensionName: user.extension_name || null,
    email: user.email || null,
  }
}

async function resolveActors(userIds = []) {
  const ids = [...new Set((userIds || []).filter(Boolean))]
  if (ids.length === 0) return {}

  const { data, error } = await supabase
    .from('users')
    .select('user_id, email, first_name, middle_name, last_name, extension_name, roles(role_name)')
    .in('user_id', ids)

  if (error) throw error

  return (data || []).reduce((map, user) => {
    map[user.user_id] = buildActor(user)
    return map
  }, {})
}

async function resolveActor(userId) {
  if (!userId) return null
  const actors = await resolveActors([userId])
  return actors[userId] || null
}

function actorToUser(actor) {
  if (!actor) return null
  return {
    user_id: actor.actorId,
    first_name: actor.firstName,
    middle_name: actor.middleName,
    last_name: actor.lastName,
    extension_name: actor.extensionName,
    email: actor.email,
    role_name: actor.actorRole,
    roles: actor.actorRole ? { role_name: actor.actorRole } : null,
    actorId: actor.actorId,
    actorName: actor.actorName,
    actorRole: actor.actorRole,
  }
}

function withActor(row, actor, options = {}) {
  const {
    nameField,
    roleField,
    idField,
    fallbackName = null,
  } = options

  const actorId = actor?.actorId || (idField ? row?.[idField] : null) || null
  const actorName = actor?.actorName || fallbackName || null
  const actorRole = actor?.actorRole || null

  return {
    ...row,
    actorId,
    actorName,
    actorRole,
    ...(nameField ? { [nameField]: actorName } : {}),
    ...(roleField ? { [roleField]: actorRole } : {}),
  }
}

module.exports = {
  resolveActor,
  resolveActors,
  actorToUser,
  withActor,
}
