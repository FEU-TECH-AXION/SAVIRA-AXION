const supabase = require('../config/supabase')

const getBySet = async (screeningQuestionSetId, { includeDeprecated = false } = {}) => {
    let query = supabase
        .from('screening_questions')
        .select('*')
        .eq('screening_question_set_id', screeningQuestionSetId)
        .order('order', { ascending: true })

    if (!includeDeprecated) {
        query = query.is('deprecated_at', null)
    }

    const { data, error } = await query
    if (error) throw error
    return data
}

const create = async (payload) => {
    const { data, error } = await supabase
        .from('screening_questions')
        .insert([payload])
        .select()
        .single()

    if (error) throw error
    return data
}

const createMany = async (payloads) => {
    const { data, error } = await supabase
        .from('screening_questions')
        .insert(payloads)
        .select()

    if (error) throw error
    return data
}

const update = async (id, payload) => {
    const { data, error } = await supabase
        .from('screening_questions')
        .update(payload)
        .eq('screening_question_id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

const updateOrder = async (items) => {
    const updated = []

    // Supabase does not provide a portable bulk update for rows with different
    // values, so update each row and fail the request if any update fails.
    for (const item of items) {
        const row = await update(item.screening_question_id, { order: item.order })
        updated.push(row)
    }

    return updated
}

const archive = async (id) => {
    const archived = await update(id, {
        is_active: false,
        deprecated_at: new Date().toISOString(),
    })

    const remaining = await getBySet(archived.screening_question_set_id)
    await updateOrder(
        remaining.map((question, index) => ({
            screening_question_id: question.screening_question_id,
            order: index + 1,
        }))
    )

    return archived
}

const removeBySet = async (screeningQuestionSetId) => {
    const { error } = await supabase
        .from('screening_questions')
        .delete()
        .eq('screening_question_set_id', screeningQuestionSetId)

    if (error) throw error
}

module.exports = {
    getBySet,
    create,
    createMany,
    update,
    updateOrder,
    archive,
    removeBySet,
}
