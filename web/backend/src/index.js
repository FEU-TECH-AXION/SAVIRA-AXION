const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on :${PORT}`));

// -- Sample Route --
// const itemsRouter = require('./routes/sample.routes')
// app.use('/api/items', itemsRouter)

// --------------------------------------------------------
// ROUTES FOR USER RELATED TABLES
// --------------------------------------------------------

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

// ======================================================================


// --------------------------------------------------------
// ROUTES FOR PAGES
// --------------------------------------------------------

// Route for auth (signup/login)
const authRoutes = require('./routes/auth.routes');
app.use('/api/auth', authRoutes);