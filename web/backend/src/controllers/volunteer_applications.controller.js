const VolunteerApplicationsModel = require("../models/volunteer_applications.model");
const VolunteerApplicantModel = require("../models/volunteer_applicants.model");
const ScreeningAnswerModel      = require('../models/screening_answers.model')
const ScreeningQuestionSetModel = require('../models/screening_question_set.model')
const ScreeningQuestionsModel   = require('../models/screening_questions.model')
const OrganizationsModel         = require('../models/organizations.model')
const supabase                     = require('../config/supabase')
const { runVolunteerEssayAnalysis } = require('../services/volunteerNlp.service')


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

const MEMBERSHIP_COMMITTEE_ID = 2

function average(values) {
    const nums = values.map(Number).filter((n) => Number.isFinite(n))
    if (nums.length === 0) return 0
    return nums.reduce((sum, n) => sum + n, 0) / nums.length
}

function weightedEssayScore(row = {}) {
    return (
        ((Number(row.alignment) || 0) / 10) * 30 +
        ((Number(row.maturity) || 0) / 10) * 20 +
        ((Number(row.commitment) || 0) / 10) * 20 +
        ((Number(row.clarity) || 0) / 10) * 15 +
        ((Number(row.experience) || 0) / 10) * 15
    )
}

function calculateScreeningScore(app = {}) {
    const nonNegotiable = app.non_negotiable_passed ? 20 : 0
    const negotiable = Math.min(Number(app.negotiable_score) || 0, 9) / 9 * 10
    return nonNegotiable + negotiable
}

function priorityBonus(app = {}) {
    const gender = String(app.gender_identity || '').toLowerCase()
    const pronouns = String(app.pronouns || '').toLowerCase()
    const female = gender.includes('female') || gender.includes('woman') || pronouns.includes('she')
    const lgbtq = gender.includes('lgbt') || gender.includes('queer') || gender.includes('non-binary') || gender.includes('trans')
    return (female ? 3 : 0) + (lgbtq ? 3 : 0)
}

const getItems = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.user_id
        const role   = (req.user?.role || req.user?.role_name)?.toLowerCase()

        const data = await VolunteerApplicationsModel.getAll({ userId, role })
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
}

const getScores = async (req, res) => {
    try {
        const { id } = req.params

        const { data: app, error: appError } = await supabase
            .from('volunteer_applications')
            .select('volunteer_application_id, non_negotiable_passed, negotiable_score')
            .eq('volunteer_application_id', id)
            .single()
        if (appError) throw appError

        const { data: evaluations, error: evalError } = await supabase
            .from('volunteer_application_evaluations')
            .select('*')
            .eq('volunteer_application_id', id)
        if (evalError) throw evalError

        const essayScores = evaluations.map(weightedEssayScore).filter((score) => score > 0)
        const interviewScores = evaluations.map((row) => Number(row.interview_score) || 0).filter((score) => score > 0)

        const screening = calculateScreeningScore(app)
        const essay = average(essayScores)
        const interview = average(interviewScores)

        res.status(200).json({
            data: {
                screening_score: screening,
                essay_score: essay,
                interview_score: interview,
                total_score: screening + (essay / 100 * 50) + (interview / 10 * 20),
                evaluator_count: evaluations.length,
            }
        })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const getItem = async (req, res) => {
    try {
        const { id } = req.params

        const { data, error } = await supabase
        .from('volunteer_applications')
        .select(`
            *,
            organizations (
                organization,
                organization_name,
                organization_type,
                organization_type_other,
                council,
                region,
                organization_city,
                user_city
            ),
            volunteer_applicants (
                user_id
            ),
            volunteer_application_assignments (
                assignment_id,
                assessor_id,
                is_active,
                users!volunteer_application_assignments_assessor_id_fkey (
                    user_id,
                    first_name,
                    last_name,
                    email
                )
            ),
            screening_answers (
                answer_value,
                screening_questions (
                    question_key
                )
            )
        `)
        .eq('volunteer_application_id', id)
        .single()

        if (error || !data) return res.status(404).json({ error: 'Application not found.' })

        res.status(200).json({
            ...data,
            applicant_user_id: data.volunteer_applicants?.user_id || null,
        })

    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const assignAssessors = async (req, res) => {
    try {
        const applicationIds = (req.body.application_ids || req.body.applicationIds || [])
            .map((id) => Number(id))
            .filter(Boolean)
        const assessorIds = (req.body.assessor_ids || req.body.assessorIds || [])
            .map(String)
            .filter(Boolean)

        if (applicationIds.length === 0 || assessorIds.length === 0) {
            return res.status(400).json({ error: 'application_ids and assessor_ids are required.' })
        }

        const { data: membershipStaff, error: staffError } = await supabase
            .from('staff')
            .select('user_id, committee_id')
            .in('user_id', assessorIds)
            .eq('committee_id', MEMBERSHIP_COMMITTEE_ID)
        if (staffError) throw staffError

        const validAssessorIds = new Set((membershipStaff || []).map((row) => row.user_id))
        const invalid = assessorIds.filter((id) => !validAssessorIds.has(id))
        if (invalid.length > 0) {
            return res.status(400).json({ error: 'Only Membership Committee staff can be assigned.', invalid_assessor_ids: invalid })
        }

        const { error: deleteError } = await supabase
            .from('application_assessments')
            .delete()
            .in('application_id', applicationIds)
            .eq('assessment_stage', 'application_evaluation')
        if (deleteError) throw deleteError

        const rows = applicationIds.flatMap((application_id) =>
            assessorIds.map((assessor_id) => ({
                application_id,
                assessor_id,
                assessment_type: 'volunteer_application',
                assessment_stage: 'application_evaluation',
                assessment_status: 'assigned',
            }))
        )

        const { data, error } = await supabase
            .from('application_assessments')
            .insert(rows)
            .select(`
                *,
                users (
                    user_id,
                    first_name,
                    last_name,
                    email
                )
            `)
        if (error) throw error

        await supabase
            .from('volunteer_applications')
            .update({ application_status: 'reviewing', updated_at: new Date() })
            .in('volunteer_application_id', applicationIds)

        res.status(200).json({ data })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const getRankings = async (req, res) => {
    try {
        const { data: applications, error: appError } = await supabase
            .from('volunteer_applications')
            .select(`
                volunteer_application_id,
                name,
                email,
                gender_identity,
                pronouns,
                application_status,
                non_negotiable_passed,
                negotiable_score,
                created_at,
                volunteer_application_analysis (
                    essay_weighted_total,
                    essay_score_out_of_50,
                    recommendation,
                    threshold_passed
                ),
                volunteer_application_evaluations (
                    alignment,
                    maturity,
                    commitment,
                    clarity,
                    experience,
                    interview_score,
                    evaluated_by
                ),
                interviews (
                    status
                )
            `)
        if (appError) throw appError

        const ranked = (applications || []).map((app) => {
            const evaluations = app.volunteer_application_evaluations || []
            const analysis = Array.isArray(app.volunteer_application_analysis)
                ? app.volunteer_application_analysis[0]
                : app.volunteer_application_analysis
            const humanEssay = average(evaluations.map(weightedEssayScore).filter((score) => score > 0))
            const nlpEssay = Number(analysis?.essay_weighted_total) || 0
            const hybridEssay = humanEssay > 0 && nlpEssay > 0
                ? (humanEssay * 0.70) + (nlpEssay * 0.30)
                : humanEssay || nlpEssay
            const interviewScore = average(evaluations.map((row) => Number(row.interview_score) || 0).filter((score) => score > 0))
            const screeningScore = calculateScreeningScore(app)
            const bonus = priorityBonus(app)
            const totalScore = screeningScore + (hybridEssay / 100 * 50) + (interviewScore / 10 * 20) + bonus

            return {
                application_id: app.volunteer_application_id,
                name: app.name,
                email: app.email,
                gender_identity: app.gender_identity,
                pronouns: app.pronouns,
                application_status: app.application_status,
                screening_score: Number(screeningScore.toFixed(2)),
                human_essay_score: Number(humanEssay.toFixed(2)),
                nlp_essay_score: Number(nlpEssay.toFixed(2)),
                hybrid_essay_score: Number(hybridEssay.toFixed(2)),
                interview_score: Number(interviewScore.toFixed(2)),
                priority_bonus: bonus,
                total_score: Number(totalScore.toFixed(2)),
                evaluator_count: evaluations.length,
                interview_statuses: (app.interviews || []).map((iv) => iv.status),
            }
        }).sort((a, b) => b.total_score - a.total_score)
            .map((row, index) => ({ ...row, rank: index + 1 }))

        res.status(200).json({ data: ranked })
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
}

const createItem = async (req, res) => {
    try {
        const {
            applicant,
            screeningQuestions = {},
            screeningAnswers = {},
            screening_question_set_id,
            essay,
        } = req.body
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
        const questionSet = screening_question_set_id
            ? await ScreeningQuestionSetModel.getById(screening_question_set_id)
            : await ScreeningQuestionSetModel.getActive()

        if (!questionSet) {
            return res.status(400).json({
                error: 'The screening-question version used by this application is no longer available.',
            })
        }
        
        const questions = (await ScreeningQuestionsModel.getBySet(
            questionSet.screening_question_set_id
        )).filter((question) => question.is_active)

        const unansweredQuestion = questions.find((question) => {
            const legacyFormKey = Object.keys(ANSWER_MAP).find(
                (key) => ANSWER_MAP[key] === question.question_key
            )
            return !(
                screeningAnswers[question.question_key] ??
                screeningQuestions[legacyFormKey]
            )
        })

        if (unansweredQuestion) {
            return res.status(400).json({
                error: `Please answer all screening questions before submitting. Missing: ${unansweredQuestion.question_text}`,
            })
        }
        

        // ── 4. Evaluate answers ──
        let nonNegotiablePassed = true
        let negotiableScore     = 0
        const answerRows        = []

        for (const question of questions) {
            const legacyFormKey = Object.keys(ANSWER_MAP).find(
                (key) => ANSWER_MAP[key] === question.question_key
            )
            const answerValue =
                screeningAnswers[question.question_key] ??
                screeningQuestions[legacyFormKey] ??
                ''
            const isCorrect   = answerValue === question.preferred_answer

            if ((question.auto_fail || question.type === 'non_negotiable') && !isCorrect) {
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
            screening_question_set_id: questionSet.screening_question_set_id,
            essay_response:            essay.description,
            contact_number:            applicant.contactNumber    || null,
            name:                      applicant.name             || null,
            age:                       parseInt(applicant.age)    || null,
            gender_identity:           applicant.gender           || null,
            pronouns:                  applicant.pronouns         || null,
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

        // ── Trigger NLP essay analysis (fire-and-forget, non-blocking) ──
        if (essay.description && essay.description.trim().length >= 20) {
            runVolunteerEssayAnalysis({
                volunteer_application_id: application.volunteer_application_id,
                essay_response:           essay.description,
            });
            // intentionally no await — same fire-and-forget pattern as case reports
        }

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
        const changedBy = req.user?.id || null

        const updatePayload = {
            application_status,
            updated_at: new Date(),
        }

        if (application_status === 'rejected' || application_status === 'approved') {
            updatePayload.resolved_at = new Date()
        }

        // Update application
        const updated = await VolunteerApplicationsModel.update(id, updatePayload)

        // Write history inline — no separate model needed
        await supabase
            .from('volunteer_application_status_history')
            .insert({
                volunteer_application_id: parseInt(id),
                status:     application_status,
                notes:      notes || null,
                changed_by: changedBy,
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

const withdrawApplication = async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data, error } = await supabase
            .from('volunteer_applications')
            .update({ application_status: 'withdrawn', updated_at: new Date() })
            .eq('volunteer_application_id', id)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ message: 'Application withdrawn successfully', data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const undoWithdrawApplication = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if assessors exist
        const { data: assignments, error: assignError } = await supabase
            .from('volunteer_application_assignments')
            .select('assignment_id')
            .eq('volunteer_application_id', id)
            .eq('is_active', true);
            
        if (assignError) throw assignError;
        
        const newStatus = assignments && assignments.length > 0 ? 'reviewing' : 'pending';
        
        const { data, error } = await supabase
            .from('volunteer_applications')
            .update({ application_status: newStatus, updated_at: new Date() })
            .eq('volunteer_application_id', id)
            .select()
            .single();
            
        if (error) throw error;
        res.json({ message: 'Withdrawal undone successfully', data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { getItems, getItem, createItem, updateItem, getMyApplications, getScores, assignAssessors, getRankings, withdrawApplication, undoWithdrawApplication }
