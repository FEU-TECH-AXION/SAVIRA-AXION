const supabase = require('../config/supabase')

const getAll = async () => {
  const { data, error } = await supabase.from('items').select('*')
  if (error) throw error
  return data
}

const create = async (payload) => {
  const { data, error } = await supabase
    .from('items')
    .insert([payload])
    .select()
  if (error) throw error
  return data[0]
}

module.exports = { getAll, create }