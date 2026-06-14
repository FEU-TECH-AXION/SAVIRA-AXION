const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error(`CORS origin not allowed: ${origin}`))
  },
  credentials: true, // required for cookies
}));
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on :${PORT}`));;

// -- Sample Route --
// const itemsRouter = require('./routes/sample.routes')
// app.use('/api/items', itemsRouter)

// ── AUTH ROUTES ────────────────────────────────────────────────

const authRouter = require('./routes/auth.routes')
app.use('/api/auth', authRouter)

// ── ROUTES FOR USER RELATED TABLES ────────────────────────────────────────────────

// Route for users tbl
const usersRouter = require('./routes/users.routes')
app.use('/api/users', usersRouter)

// Route for staff tbl
const staffRouter = require('./routes/staff.routes')
app.use('/api/staff', staffRouter)

// Route for case_officers tbl
const caseOfficersRouter = require('./routes/case_officers.routes')
app.use('/api/case_officers', caseOfficersRouter)

// Route for volunteer_applicants tbl
const volunteerApplicantsRouter = require('./routes/volunteer_applicants.routes')
app.use('/api/volunteer_applicants', volunteerApplicantsRouter)

// Route for complainants tbl
const complainantsRouter = require('./routes/complainants.routes')
app.use('/api/complainants', complainantsRouter)

// Route for legal personnels tbl
const legalPersonnelsRouter = require('./routes/legal_personnels.routes')
app.use('/api/legal_personnels', legalPersonnelsRouter)

// Route for committees tbl
const committeesRouter = require('./routes/committees.routes')
app.use('/api/committees', committeesRouter)

// Route for roles tbl
const rolesRouter = require('./routes/roles.routes')
app.use('/api/roles', rolesRouter)

// Route for user_case_logs tbl
const userCaseLogsRouter = require('./routes/user_case_logs.routes')
app.use('/api/user_case_logs', userCaseLogsRouter)

// Route for organization_details tbl
const organizationsRouter = require('./routes/organizations.routes')
app.use('/api/organizations', organizationsRouter)
// Route for projects tbl
const projectsRouter = require('./routes/projects.routes')
app.use('/api/projects', projectsRouter)
// ── ROUTES FOR CASE REPORTING RELATED TABLES ────────────────────────────────────────────────

// Route for case_reports tbl
const caseReportsRouter = require('./routes/case_reports.routes')
app.use('/api/case_reports', caseReportsRouter)

// Route for case_assessments tbl
const caseAssessmentsRouter = require('./routes/case_assessments.routes')
app.use('/api/case_assessments', caseAssessmentsRouter)

// Route for evidences tbl
const evidencesRouter = require('./routes/evidences.routes')
app.use('/api/evidences', evidencesRouter)

// Route for case_types tbl
const caseTypesRouter = require('./routes/case_types.routes')
app.use('/api/case_types', caseTypesRouter)

// Route for case_status tbl
const caseStatusRouter = require('./routes/case_status.routes')
app.use('/api/case_status', caseStatusRouter)

// Route for case_report_logs tbl
const caseReportLogsRouter = require('./routes/case_report_logs.routes')
app.use('/api/case_report_logs', caseReportLogsRouter)

// Route for case_report_analysis tbl
const caseReportAnalysisRouter = require('./routes/case_report_analysis.routes')
app.use('/api/case_report_analysis', caseReportAnalysisRouter)

// Route for case_assignments tbl
const caseAssignmentsRouter = require('./routes/case_assignments.routes')
app.use('/api/case_assignments', caseAssignmentsRouter)

// Route for case_status_history tbl
const caseStatusHistoryRouter = require('./routes/case_status_history.routes')
app.use('/api/case_status_history', caseStatusHistoryRouter)

// Route for legal case assignments tbl
const legalCaseAssignmentsRouter = require('./routes/legal_case_assignments.routes')
app.use('/api/legal_case_assignments', legalCaseAssignmentsRouter)

// ── ROUTES FOR VOLUNTEER APPLICATION RELATED TABLES ───────────────────────────────

// Route for volunteer_applications tbl
const volunteerApplicationsRouter = require('./routes/volunteer_applications.routes')
app.use('/api/volunteer_applications', volunteerApplicationsRouter)

// Route for screening_questions tbl
const screeningQuestionsRouter = require('./routes/screening_questions.routes')
app.use('/api/screening_questions', screeningQuestionsRouter)

// Route for screening_questions_set tbl
const screeningQuestionSetRouter = require('./routes/screening_question_set.routes')
app.use('/api/screening_question_set', screeningQuestionSetRouter)

// Route for screening_answers tbl
const screeningAnswersRouter = require('./routes/screening_answers.routes')
app.use('/api/screening_answers', screeningAnswersRouter)

// Route for volunteer_application_analysis tbl
const volunteerApplicationAnalysisRouter = require('./routes/volunteer_application_analysis.routes')
app.use('/api/volunteer_application_analysis', volunteerApplicationAnalysisRouter)

// Route for volunteer_application_evaluation tbl
const volunteerApplicationEvaluationsRouter = require('./routes/volunteer_application_evaluations.routes')
app.use('/api/volunteer_application_evaluations', volunteerApplicationEvaluationsRouter)

// ── ROUTES FOR INTERVIEWS RELATED TABLES ───────────────────────────────

// Route for interviews tbl
const interviewsRouter = require('./routes/interviews.routes')
app.use('/api/interviews', interviewsRouter)

// Route for interview_slots tbl
const interviewSlotsRouter = require('./routes/interview_slots.routes')
app.use('/api/interview_slots', interviewSlotsRouter)

// ── ROUTES FOR REPORTS RELATED TABLES ───────────────────────────────

const reportsRouter = require('./routes/reports.routes')
app.use('/api/reports', reportsRouter)
