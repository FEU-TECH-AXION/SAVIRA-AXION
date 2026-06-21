const supabase = require('../config/supabase')

const getAll = async () => {
    const { data, error } = await supabase
        .from('screening_question_set')
        .select('*, screening_questions(*)')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('screening_question_set')
        .insert([payload])
        .select()
        .single()

    if (error) throw error
    return data
}

const getActive = async () => {
    const { data, error } = await supabase
        .from('screening_question_set')
        .select('*')
        .eq('is_active', true)
        .order('effective_from', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) throw error
    return data
}

const getById = async (id, { includeQuestions = false } = {}) => {
    const selection = includeQuestions ? '*, screening_questions(*)' : '*'
    const { data, error } = await supabase
        .from('screening_question_set')
        .select(selection)
        .eq('screening_question_set_id', id)
        .maybeSingle()

    if (error) throw error
    return data
}

const deactivateAll = async () => {
    const { error } = await supabase
        .from('screening_question_set')
        .update({ is_active: false })
        .eq('is_active', true)

    if (error) throw error
}

const setActive = async (id, isActive = true) => {
    const { data, error } = await supabase
        .from('screening_question_set')
        .update({ is_active: isActive })
        .eq('screening_question_set_id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

const rename = async (id, version) => {
    const { data, error } = await supabase
        .from('screening_question_set')
        .update({ version })
        .eq('screening_question_set_id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

const remove = async (id) => {
    const { error } = await supabase
        .from('screening_question_set')
        .delete()
        .eq('screening_question_set_id', id)

    if (error) throw error
}

module.exports = {
    getAll,
    create,
    getActive,
    getById,
    deactivateAll,
    setActive,
    rename,
    remove,
}
