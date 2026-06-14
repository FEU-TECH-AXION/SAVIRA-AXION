const UserModel = require('../models/users.model')
const supabase = require('../config/supabase')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')

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
    const { password, role_id, committee_id, ...rest } = req.body
    if (parseInt(role_id) === 2 && !committee_id) {
      return res.status(400).json({ error: 'committee_id is required for Staff role.' })
    }

    const hashedPassword = await bcrypt.hash(password || 'Savira@2026', 10)

    const item = await UserModel.create({
      ...rest,
      user_id: uuidv4(),
      password: hashedPassword,
      role_id,
    })

    if (item?.user_id && role_id) {
      await syncUserSubTable(item.user_id, role_id, { committee_id })
    }

    const staff = await getStaffByUserId(item.user_id)
    res.status(201).json({ ...item, staff })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

const updateItem = async (req, res) => {
  try {
    const { id } = req.params
    const { password, role_id, committee_id, ...rest } = req.body
    if (parseInt(role_id) === 2 && !committee_id) {
      return res.status(400).json({ error: 'committee_id is required for Staff role.' })
    }

    const allowed = [
      'first_name',
      'middle_name',
      'last_name',
      'extension_name',
      'user_name',
      'contact_number',
      'profile_img',
      'is_active',
      'deactivated_at',
    ]

    const payload = Object.fromEntries(
      Object.entries(rest).filter(([key]) => allowed.includes(key))
    )

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
      await syncUserSubTable(id, role_id, { committee_id })
    }

    const staff = await getStaffByUserId(id)
    res.status(200).json({
      ...data,
      role_name: data.roles?.role_name || null,
      staff,
    })
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
    const { role_id, committee_id } = req.body
    await syncUserSubTable(userId, role_id, { committee_id })
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
  } else if (numericRoleId === 4) {
    const { data: existing } = await supabase
      .from('legal_personnels')
      .select('legal_personnel_id')
      .eq('user_id', id)
      .maybeSingle()

    if (!existing) {
      const { error } = await supabase
        .from('legal_personnels')
        .insert([{ user_id: id, legal_personnel_type: 'General', is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      if (error) throw error
    }
  }
}

module.exports = { getItems, createItem, updateItem, loginUser, syncRole }
