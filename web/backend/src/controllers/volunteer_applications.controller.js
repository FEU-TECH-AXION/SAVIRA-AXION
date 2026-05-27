const VolunteerApplicationsModel = require("../models/volunteer_applications.model");
const VolunteerApplicantModel = require("../models/volunteer_applicants.model");
const ScreeningAnswerModel      = require('../models/screening_answers.model')
const ScreeningQuestionSetModel = require('../models/screening_question_set.model')
const OrganizationsModel         = require('../models/organizations.model')
const supabase                   = require('../config/supabase')

// Maps your form keys to question_key values in the database
const ANSWER_MAP = {
    survivorDignity:       'survivor_dignity',
    confidentialityPolicy: 'confidentiality_policy',
    noHarassment:          'no_harassment',
    respectfulComms:       'respectful_comms',
    saferEnvironments:     'safer_environments',
    advocacySupport:       'advocacy_support',
    enthusiasm:            'enthusiasm',
    professionalism:       'professionalism',
    genderAwareness:       'gender_awareness',
    stayInformed:          'stay_informed',
    openToLearn:           'open_to_learn',
    diverseTeams:          'diverse_teams',
    orientationWilling:    'orientation_willing',
    timeCommitment:        'time_commitment',
    feedbackWilling:       'feedback_willing',
}

const getItems = async (req, res) => {
    try {
        const data = await VolunteerApplicationsModel.getAll()
        res.json(data)
    } catch (err) {
        // 500 here because the failure is on our side (DB/Supabase), not the client's
        res.status(500).json({ error: err.message })
    }
}

const createItem = async (req, res) => {
    try {
        const { applicant, screeningQuestions, essay } = req.body
        const userId = req.user?.id
        if (!userId) return res.status(401).json({ error: 'Authentication required.' })

        // ── 1. Get volunteer_applicant_id from logged in user ──
        const { data: existingApplicant } = await supabase
    .from('volunteer_applicants')
    .select('volunteer_applicant_id')
    .eq('user_id', userId)
    .maybeSingle()

    let volunteerApplicantId

    if (existingApplicant) {
        // Already applied before, reuse existing row
        volunteerApplicantId = existingApplicant.volunteer_applicant_id
    } else {
        // First time applying, create the row
        const { data: newApplicant, error: insertError } = await supabase
            .from('volunteer_applicants')
            .insert([{
                user_id:                userId,
                converted_to_volunteer: false,
            }])
            .select('volunteer_applicant_id')
            .single()

        if (insertError) throw insertError
        volunteerApplicantId = newApplicant.volunteer_applicant_id
    }

        // ── 2. Find or create organization ──
        const org = await OrganizationsModel.findOrCreateOrganization(applicant)

        // ── 3. Fetch active question set + all 15 questions ──
        const questionSet = await ScreeningQuestionSetModel.getActive()
        // console.log('questionSet:', JSON.stringify(questionSet, null, 2))
        const questions   = questionSet.screening_questions
        // console.log('questions count:', questions?.length)

        // ── 4. Evaluate answers ──
        let nonNegotiablePassed = true
        let negotiableScore     = 0
        const answerRows        = []

        for (const question of questions) {
            const formKey     = Object.keys(ANSWER_MAP).find(k => ANSWER_MAP[k] === question.question_key)
            const answerValue = screeningQuestions[formKey] ?? ''
            const isCorrect   = answerValue === question.preferred_answer

            if (question.type === 'non_negotiable' && !isCorrect) {
                nonNegotiablePassed = false
            }

            if (question.type === 'negotiable' && isCorrect) {
                negotiableScore += 1
            }

            answerRows.push({
                screening_question_id: question.screening_question_id,
                answer_value:          answerValue,
            })
        }

        // ── 5. Check for existing active application ──
        const { data: existingApplication } = await supabase
            .from('volunteer_applications')
            .select('volunteer_application_id, application_status')
            .eq('volunteer_applicant_id', volunteerApplicantId)
            .in('application_status', ['pending', 'under_review'])
            .maybeSingle()

        if (existingApplication) {
            return res.status(409).json({
                error: 'You already have an active application. Please wait for it to be resolved before applying again.',
                status: existingApplication.application_status
            })
        }

        // ── 6. Create the application ──
        const application = await VolunteerApplicationsModel.create({
            volunteer_applicant_id:    volunteerApplicantId,
            organization_id:           org.organization_id,
            screening_question_set_id: questionSet.id,
            essay_response:            essay.description,
            contact_number:            applicant.contactNumber    || null,
            name:                      applicant.name             || null,
            age:                       parseInt(applicant.age)    || null,
            gender_identity:           applicant.gender           || null,
            email:                     applicant.email            || null,
            city:                      applicant.userCity         || null,
            province:                  'Metro Manila',
            organization_id:           org.organization_id,
            scouting_membership:       applicant.scoutingMembership || null,
            tenure_years:              applicant.tenureInScouting ? parseInt(applicant.tenureInScouting) : null,
            rank:                      applicant.rank             || null,
            non_negotiable_passed:     nonNegotiablePassed,
            negotiable_score:          negotiableScore,
            application_status:        nonNegotiablePassed ? 'pending' : 'rejected',
            interview_required:        nonNegotiablePassed ? true : false,
            birthday:                   applicant.birthday ? new Date(applicant.birthday) : null,
            fields_with_background: screeningQuestions.withBackground   || [],
            fields_of_interest:     screeningQuestions.interestedFields || [],
            hours_per_week:         screeningQuestions.hoursPerWeek     || null,
        })      

        // ── 6. Save all 15 screening answers ──
        const answersWithAppId = answerRows.map(row => ({
            ...row,
            volunteer_application_id: application.volunteer_application_id,
        }))

        await ScreeningAnswerModel.createMany(answersWithAppId)

        res.status(201).json({
            message:            'Application submitted successfully.',
            application,
            nonNegotiablePassed,
            negotiableScore,
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const updateItem = async (req, res) => {
    try {
        const { id } = req.params
        const { application_status, notes } = req.body

        const updated = await VolunteerApplicationsModel.update(id, {
            application_status,
            updated_at: new Date(),
        })

        res.status(200).json(updated)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const getMyApplications = async (req, res) => {
    try {
        const userId = req.user?.id
        if (!userId) return res.status(401).json({ error: 'Authentication required.' })

        // Get volunteer_applicant_id from user
        const { data: volunteerApplicant } = await supabase
            .from('volunteer_applicants')
            .select('volunteer_applicant_id')
            .eq('user_id', userId)
            .maybeSingle()

        if (!volunteerApplicant) return res.status(200).json([])

        const { data, error } = await supabase
            .from('volunteer_applications')
            .select('*')
            .eq('volunteer_applicant_id', volunteerApplicant.volunteer_applicant_id)
            .order('created_at', { ascending: false })

        if (error) throw error

        res.status(200).json(data)

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

module.exports = { getItems, createItem, updateItem, getMyApplications }


