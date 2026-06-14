const supabase = require('../config/supabase')

const OFFICER_ROLES = [
  'Chairperson',
  'Vice Chairperson',
  'Secretary-General',
  'Education and Research Committee Chair',
  'Publication Committee Chair',
  'Membership Committee Chair',
]

const toDateStr = (value) => (value ? String(value).split('T')[0] : '')

const memberType = (ageValue) => {
  const age = Number(ageValue)
  if (!ageValue || Number.isNaN(age)) return 'Unclassified'
  if (age <= 12) return 'Probationary'
  if (age >= 13 && age <= 35) return 'Regular'
  return 'Honorary'
}

const computeStatus = (chapter, members = [], officers = []) => {
  const memberCount = members.length
  const oathCount = members.filter((m) => m.oath_taken || m.oathTaken).length
  const cocCount = members.filter((m) => m.is_organizing_committee || m.organizingCommittee).length
  const ogCount = members.filter((m) => m.is_organizing_group || m.organizingGroup).length
  const officerCount = officers.filter((o) => o.chapter_member_id || o.chapterMemberId).length

  if (memberCount > 40) return 'Needs Division'
  if (
    memberCount >= 15 &&
    oathCount >= 15 &&
    officerCount >= OFFICER_ROLES.length &&
    chapter.orientation_completed &&
    chapter.oath_taking_completed &&
    chapter.pledge_support_confirmed &&
    chapter.national_program_alignment
  ) {
    return chapter.recognized_at ? 'Recognized' : 'Ready for Recognition'
  }
  if (cocCount >= 7 && ogCount >= 2) return 'COC Organizing'
  return 'Formation in Progress'
}

const toMemberFrontend = (row) => {
  const user = row.users || row.user || null
  const fullName = user
    ? [user.first_name, user.middle_name, user.last_name, user.extension_name].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    : ''

  return {
    chapterMemberId: row.chapter_member_id,
    userId: row.user_id,
    fullName: fullName || user?.user_name || user?.email || '',
    nickname: row.nickname || '',
    birthday: toDateStr(row.date_of_birth),
    age: row.age != null ? String(row.age) : '',
    affiliation: row.affiliation || '',
    reason: row.reason_for_joining || '',
    membershipType: row.membership_type || memberType(row.age),
    oathTaken: !!row.oath_taken,
    organizingGroup: !!row.is_organizing_group,
    organizingCommittee: !!row.is_organizing_committee,
  }
}

const toFrontend = (row) => {
  if (!row) return null
  const members = (row.chapter_members || []).map(toMemberFrontend)
  const officers = Object.fromEntries(OFFICER_ROLES.map((role) => [role, '']))

  for (const officer of row.chapter_officers || []) {
    const userId = officer.chapter_members?.user_id ||
      members.find((member) => Number(member.chapterMemberId) === Number(officer.chapter_member_id))?.userId ||
      ''
    officers[officer.role] = userId
  }

  const normalized = {
    id: row.chapter_id,
    chapterId: row.chapter_id,
    chapterName: row.chapter_name,
    formationLevel: row.formation_level,
    location: row.location || '',
    contactPerson: row.contact_person || '',
    higherStructureRepresentative: row.higher_structure_representative || '',
    targetLaunchDate: toDateStr(row.target_launch_date),
    orientationCompleted: !!row.orientation_completed,
    oathTakingCompleted: !!row.oath_taking_completed,
    pledgeSupportConfirmed: !!row.pledge_support_confirmed,
    nationalProgramAlignment: !!row.national_program_alignment,
    affiliateOrganization: !!row.affiliate_organization,
    affiliateActiveMembers: row.affiliate_active_members != null ? String(row.affiliate_active_members) : '',
    status: row.status || 'Formation in Progress',
    recognizedAt: row.recognized_at,
    notes: row.notes || '',
    createdByUserId: row.created_by_user_id || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    members,
    officers,
  }

  return {
    ...normalized,
    memberCount: members.length,
    cocCount: members.filter((member) => member.organizingCommittee).length,
    ogCount: members.filter((member) => member.organizingGroup).length,
    oathCount: members.filter((member) => member.oathTaken).length,
    officersFilled: Object.values(officers).filter(Boolean).length,
    overCapacity: members.length > 40,
  }
}

const chapterSelect = `
  *,
  chapter_members (
    *,
    users (
      user_id,
      first_name,
      middle_name,
      last_name,
      extension_name,
      user_name,
      email
    )
  ),
  chapter_officers (
    *,
    chapter_members (
      chapter_member_id,
      user_id
    )
  )
`

const toChapterDbPayload = (payload = {}) => ({
  chapter_name: payload.chapterName,
  formation_level: payload.formationLevel,
  location: payload.location || null,
  contact_person: payload.contactPerson || null,
  higher_structure_representative: payload.higherStructureRepresentative || null,
  target_launch_date: payload.targetLaunchDate || null,
  orientation_completed: !!payload.orientationCompleted,
  oath_taking_completed: !!payload.oathTakingCompleted,
  pledge_support_confirmed: !!payload.pledgeSupportConfirmed,
  national_program_alignment: !!payload.nationalProgramAlignment,
  affiliate_organization: !!payload.affiliateOrganization,
  affiliate_active_members: Number(payload.affiliateActiveMembers) || 0,
  notes: payload.notes || null,
  created_by_user_id: payload.createdByUserId || null,
})

const getAll = async () => {
  const { data, error } = await supabase
    .from('chapters')
    .select(chapterSelect)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(toFrontend)
}

const getById = async (chapterId) => {
  const { data, error } = await supabase
    .from('chapters')
    .select(chapterSelect)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  if (error) throw error
  return toFrontend(data)
}

const create = async (payload = {}) => {
  const chapterPayload = toChapterDbPayload(payload)
  const members = Array.isArray(payload.members) ? payload.members.filter((m) => m.userId) : []
  const provisionalOfficers = Object.entries(payload.officers || {})
    .filter(([role, userId]) => OFFICER_ROLES.includes(role) && userId)
    .map(([role, userId]) => ({ role, userId }))

  chapterPayload.status = computeStatus(chapterPayload, members, provisionalOfficers.map((o) => ({ chapterMemberId: o.userId })))

  const { data: chapter, error: chapterError } = await supabase
    .from('chapters')
    .insert([chapterPayload])
    .select()
    .single()

  if (chapterError) throw chapterError

  let insertedMembers = []
  if (members.length > 0) {
    const memberPayloads = members.map((member) => ({
      chapter_id: chapter.chapter_id,
      user_id: member.userId,
      nickname: member.nickname || null,
      date_of_birth: member.birthday || null,
      age: member.age ? Number(member.age) : null,
      affiliation: member.affiliation || null,
      reason_for_joining: member.reason || null,
      membership_type: member.membershipType || memberType(member.age),
      oath_taken: !!member.oathTaken,
      is_organizing_group: !!member.organizingGroup,
      is_organizing_committee: !!member.organizingCommittee,
    }))

    const { data, error } = await supabase
      .from('chapter_members')
      .insert(memberPayloads)
      .select()

    if (error) {
      await supabase.from('chapters').delete().eq('chapter_id', chapter.chapter_id)
      throw error
    }
    insertedMembers = data || []
  }

  const memberByUserId = new Map(insertedMembers.map((member) => [String(member.user_id), member]))
  const officerPayloads = provisionalOfficers
    .map((officer) => ({
      chapter_id: chapter.chapter_id,
      chapter_member_id: memberByUserId.get(String(officer.userId))?.chapter_member_id || null,
      role: officer.role,
    }))
    .filter((officer) => officer.chapter_member_id)

  if (officerPayloads.length > 0) {
    const { error } = await supabase.from('chapter_officers').insert(officerPayloads)
    if (error) {
      await supabase.from('chapters').delete().eq('chapter_id', chapter.chapter_id)
      throw error
    }
  }

  const finalStatus = computeStatus(chapterPayload, insertedMembers, officerPayloads)
  await supabase
    .from('chapters')
    .update({ status: finalStatus, updated_at: new Date().toISOString() })
    .eq('chapter_id', chapter.chapter_id)

  return getById(chapter.chapter_id)
}

module.exports = {
  getAll,
  getById,
  create,
}
