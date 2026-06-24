const UserModel = require('../models/users.model')
const supabase = require('../config/supabase')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')

const isProduction = process.env.NODE_ENV === 'production'

const USER_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000,
}

const ALLOWED_GENDER_IDENTITIES = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

function toSafeUser(user) {
  if (!user) return user
  const { password, roles, ...safeUser } = user
  return {
    ...safeUser,
    role_name: roles?.role_name || user.role_name || null,
  }
}

const getItems = async (req, res) => {
  try {
    const data = await UserModel.getAll()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const createItem = async (req, res) => {
  try {
    const { password, role_id, committee_id, legal_personnel_type, ...rest } = req.body
    if (parseInt(role_id) === 2 && !committee_id) {
      return res.status(400).json({ error: 'committee_id is required for Staff role.' })
    }
    if (parseInt(role_id) === 4 && !normalizeLegalPersonnelType(legal_personnel_type)) {
      return res.status(400).json({ error: 'legal_personnel_type must be Lawyer or Paralegal for Legal Personnel role.' })
    }

    const hashedPassword = await bcrypt.hash(password || 'Savira@2026', 10)

    const item = await UserModel.create({
      ...rest,
      user_id: uuidv4(),
      password: hashedPassword,
      role_id,
    })

    if (item?.user_id && role_id) {
      await syncUserSubTable(item.user_id, role_id, { committee_id, legal_personnel_type })
    }

    const staff = await getStaffByUserId(item.user_id)
    const legal_personnel = await getLegalPersonnelByUserId(item.user_id)
    res.status(201).json({ ...item, staff, legal_personnel })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateItem = async (req, res) => {
  try {
    const { id } = req.params
    const actorId = req.user?.id || req.user?.user_id
    const actorRole = String(req.user?.role || req.user?.role_name || '').toLowerCase()
    const actorRoleId = parseInt(req.user?.role_id)
    const isAdmin = actorRole === 'admin' || actorRoleId === 3

    if (String(actorId) !== String(id) && !isAdmin) {
      return res.status(403).json({ error: 'You are not allowed to update this profile.' })
    }

    const { password, role_id, committee_id, legal_personnel_type, ...rest } = req.body
    if (parseInt(role_id) === 2 && !committee_id) {
      return res.status(400).json({ error: 'committee_id is required for Staff role.' })
    }
    if (parseInt(role_id) === 4 && !normalizeLegalPersonnelType(legal_personnel_type)) {
      return res.status(400).json({ error: 'legal_personnel_type must be Lawyer or Paralegal for Legal Personnel role.' })
    }

    const allowed = [
      'first_name',
      'middle_name',
      'last_name',
      'extension_name',
      'user_name',
      'email',
      'contact_number',
      'city',
      'province',
      'profile_img',
      'birthday',
      'gender_identity',
      'is_active',
      'deactivated_at',
    ]

    const payload = Object.fromEntries(
      Object.entries(rest).filter(([key]) => allowed.includes(key))
    )

    if (payload.birthday === '') payload.birthday = null
    if (payload.gender_identity === '') payload.gender_identity = null

    if (payload.gender_identity && !ALLOWED_GENDER_IDENTITIES.includes(payload.gender_identity)) {
      return res.status(400).json({
        error: `gender_identity must be one of: ${ALLOWED_GENDER_IDENTITIES.join(', ')}.`,
      })
    }

    if (payload.birthday) {
      const birthday = new Date(`${payload.birthday}T00:00:00`)
      const today = new Date()
      let age = today.getFullYear() - birthday.getFullYear()
      const monthDifference = today.getMonth() - birthday.getMonth()
      if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthday.getDate())
      ) {
        age -= 1
      }
      if (Number.isNaN(birthday.getTime()) || birthday > today) {
        return res.status(400).json({ error: 'Birthday must be a valid date that is not in the future.' })
      }
      if (age < 13) {
        return res.status(400).json({ error: 'You must be at least 13 years old.' })
      }
      if (age > 120) {
        return res.status(400).json({ error: 'Birthday must be within the last 120 years.' })
      }
    }

    if (role_id !== undefined) payload.role_id = role_id
    if (password) payload.password = await bcrypt.hash(password, 10)

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('user_id', id)
      .select('*, roles(role_name)')
      .single()

    if (error) throw error

    if (role_id !== undefined) {
      await syncUserSubTable(id, role_id, { committee_id, legal_personnel_type })
    }

    const staff = await getStaffByUserId(id)
    const legal_personnel = await getLegalPersonnelByUserId(id)
    const responseUser = {
      ...data,
      role_name: data.roles?.role_name || null,
      staff,
      legal_personnel,
    }
    const safeUser = toSafeUser(responseUser)

    if (String(actorId) === String(id)) {
      res.cookie('user', JSON.stringify(safeUser), USER_COOKIE_OPTIONS)
    }

    res.status(200).json(safeUser)
  } catch (err) {
    const status = err.code === '23505' ? 409 : 500
    res.status(status).json({ error: err.code === '23505' ? 'Email or username is already in use.' : err.message })
  }
}

const uploadAvatar = async (req, res) => {
  try {
    const { id } = req.params
    if (String(req.user.id) !== String(id) && parseInt(req.user.role_id) !== 3) {
      return res.status(403).json({ error: 'You are not allowed to update this profile photo.' })
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'Please select an image to upload.' })
    }

    const extension = (req.file.originalname.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '')
    const path = `profiles/${id}-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const profile_img = publicUrlData.publicUrl

    const { data, error } = await supabase
      .from('users')
      .update({ profile_img })
      .eq('user_id', id)
      .select('*, roles(role_name)')
      .single()
    if (error) throw error

    const safeUser = toSafeUser(data)
    if (String(req.user.id) === String(id)) {
      res.cookie('user', JSON.stringify(safeUser), USER_COOKIE_OPTIONS)
    }
    res.status(200).json({ profile_img, user: safeUser })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await UserModel.login(email, password)
    const { password: _, ...safeUser } = user
    res.json({ user: safeUser })
  } catch (err) {
    res.status(401).json({ error: err.message })
  }
}

const syncRole = async (req, res) => {
  try {
    const { userId } = req.params
    const { role_id, committee_id, legal_personnel_type } = req.body
    if (parseInt(role_id) === 4 && !normalizeLegalPersonnelType(legal_personnel_type)) {
      return res.status(400).json({ error: 'legal_personnel_type must be Lawyer or Paralegal for Legal Personnel role.' })
    }
    await syncUserSubTable(userId, role_id, { committee_id, legal_personnel_type })
    return res.json({ message: 'Role synced successfully.' })
  } catch (err) {
    console.error('[syncRole]', err.message)
    return res.status(500).json({ error: err.message || 'Failed to sync role.' })
  }
}

async function getStaffByUserId(userId) {
  const { data, error } = await supabase
    .from('staff')
    .select(`
      staff_id,
      user_id,
      committee_id,
      committees (
        committee_id,
        committee_name
      )
    `)
    .eq('user_id', String(userId))
    .maybeSingle()

  if (error) throw error
  return data || null
}

function normalizeLegalPersonnelType(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'lawyer' || normalized === 'legal officer') return 'Lawyer'
  if (normalized === 'paralegal') return 'Paralegal'
  return null
}

async function getLegalPersonnelByUserId(userId) {
  const { data, error } = await supabase
    .from('legal_personnels')
    .select('legal_personnel_id, user_id, legal_personnel_type, is_available')
    .eq('user_id', String(userId))
    .maybeSingle()

  if (error) throw error
  return data || null
}

async function syncLegalPersonnelRow(userId, legalPersonnelType) {
  const id = String(userId)
  const normalizedType = normalizeLegalPersonnelType(legalPersonnelType)
  if (!normalizedType) {
    throw new Error('legal_personnel_type must be Lawyer or Paralegal for Legal Personnel role.')
  }

  const existing = await getLegalPersonnelByUserId(id)
  const payload = {
    user_id: id,
    legal_personnel_type: normalizedType,
    is_available: true,
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await supabase
      .from('legal_personnels')
      .update(payload)
      .eq('legal_personnel_id', existing.legal_personnel_id)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('legal_personnels')
    .insert([{ ...payload, created_at: new Date().toISOString() }])
  if (error) throw error
}

async function disableLegalPersonnelRow(userId) {
  const { error } = await supabase
    .from('legal_personnels')
    .update({ is_available: false, updated_at: new Date().toISOString() })
    .eq('user_id', String(userId))
  if (error) throw error
}

async function syncStaffRow(userId, committeeId) {
  const id = String(userId)
  if (!committeeId) throw new Error('committee_id is required for Staff role.')

  const existing = await getStaffByUserId(id)
  const payload = {
    user_id: id,
    committee_id: parseInt(committeeId),
    updated_at: new Date().toISOString(),
  }

  if (existing) {
    const { error } = await supabase
      .from('staff')
      .update(payload)
      .eq('user_id', id)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('staff')
    .insert([{ ...payload, created_at: new Date().toISOString() }])
  if (error) throw error
}

async function deleteStaffRow(userId) {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('user_id', String(userId))
  if (error) throw error
}

async function syncUserSubTable(userId, roleId, options = {}) {
  const id = String(userId)
  const numericRoleId = parseInt(roleId)

  if (numericRoleId === 2) {
    await syncStaffRow(id, options.committee_id)
  } else {
    await deleteStaffRow(id)
  }

  if (numericRoleId === 5) {
    const { data: existing } = await supabase
      .from('case_officers')
      .select('case_officer_id')
      .eq('user_id', id)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase
        .from('case_officers')
        .insert([{ user_id: id, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      if (error) throw error
    }
  }

  if (numericRoleId === 4) {
    await syncLegalPersonnelRow(id, options.legal_personnel_type)
  } else {
    await disableLegalPersonnelRow(id)
  }
}

module.exports = { getItems, createItem, updateItem, uploadAvatar, loginUser, syncRole }
