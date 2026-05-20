const UserModel = require('../models/users.model')
const supabase = require('../config/supabase')
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

// ── Controllers ───────────────────────────────────────────────────
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
    const { password, role_id, ...rest } = req.body;

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(password || 'Savira@2026', 10);

    const payload = {
      ...rest,
      user_id:  uuidv4(),
      password: hashedPassword,
      role_id: role_id,
    };

    const item = await UserModel.create(payload);

    // Sync to sub-table based on role
    if (item?.user_id && role_id) {
      try {
        await syncUserSubTable(item.user_id, role_id);
      } catch (syncErr) {
        console.error('[createItem] Role sync failed:', syncErr.message);
        // Return the user but include sync error info
        return res.status(201).json({ 
          ...item, 
          _syncError: syncErr.message 
        });
      }
    }

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await UserModel.login(email, password);
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

const syncRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id } = req.body;
    await syncUserSubTable(userId, role_id);
    return res.json({ message: 'Role synced successfully.' });
  } catch (err) {
    console.error('[syncRole]', err.message);
    return res.status(500).json({ error: 'Failed to sync role.' });
  }
};

// ── Sub-table sync helper ─────────────────────────────────────────
async function syncUserSubTable(userId, roleId) {
  const id = String(userId);
  console.log(`[syncUserSubTable] Syncing user ${id} with role ${roleId}`);

  if (parseInt(roleId) === 5) {
    // Case Officer
    console.log(`[syncUserSubTable] Creating case officer record for user ${id}`);
    const { data: existing } = await supabase
      .from('case_officers')
      .select('case_officer_id')
      .eq('user_id', id)
      .maybeSingle();

    if (!existing) {
      const { data, error } = await supabase
        .from('case_officers')
        .insert([{ user_id: id, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        .select();
      
      if (error) {
        console.error(`[syncUserSubTable] Error creating case officer:`, error);
        throw error;
      }
      console.log(`[syncUserSubTable] Case officer created:`, data);
    } else {
      console.log(`[syncUserSubTable] Case officer already exists`);
    }

  } else if (parseInt(roleId) === 4) {
    // Legal Personnel
    console.log(`[syncUserSubTable] Creating legal personnel record for user ${id}`);
    const { data: existing } = await supabase
      .from('legal_personnels')
      .select('legal_personnel_id')
      .eq('user_id', id)
      .maybeSingle();

    if (!existing) {
      const { data, error } = await supabase
        .from('legal_personnels')
        .insert([{ user_id: id, legal_personnel_type: 'General', is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
        .select();
      
      if (error) {
        console.error(`[syncUserSubTable] Error creating legal personnel:`, error);
        throw error;
      }
      console.log(`[syncUserSubTable] Legal personnel created:`, data);
    } else {
      console.log(`[syncUserSubTable] Legal personnel already exists`);
    }
  } else {
    console.log(`[syncUserSubTable] No sub-table sync needed for role ${roleId}`);
  }
}

module.exports = { getItems, createItem, loginUser, syncRole };