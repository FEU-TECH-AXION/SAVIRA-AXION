# SAVIRA

**SAVIRA: A Sexual Violence Case Management Information System (MIS) with Integrated Heatmap Visualization and Volunteer Evaluation Using Natural Language Processing (NLP) and Mapbox**

SAVIRA is an automated, centralized case management system designed to facilitate secure case registration, structured gathering of evidence and testimonies, real-time case monitoring, and tracking of case status — maintaining confidentiality while adhering to SASHA's "always believe the victim" philosophy.

## Modules

- **Case Management** - Secure case registration, evidence gathering, and real-time status tracking
- **Volunteer Application Management** - Volunteer coordination and evaluation
- **Project Management** - Organizational project tracking
- **Legal Review** - Structured legal case review and documentation
- **Heatmap Visualization** - Geographic distribution of cases via Mapbox
- **Reports Module** - Evidence-based reporting and insights

## Technology Stack

### Frontend
- **Next.js** - React framework
- **React** - UI library
- **Bootstrap** - Styling

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing

### Database & Auth
- **Supabase PostgreSQL** - Database
- **Supabase Auth** - Authentication

### Integrations
- **Mapbox API** - Heatmap visualization
- **Firebase Cloud Messaging (FCM)** - Push notifications
- **GROQ API (Llama 3.8B)** - NLP for narrative analysis

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- A Supabase project (get your URL and keys at supabase.com)
- A Mapbox account (get your token at mapbox.com)
- A GROQ API key (get yours at groq.com)

### 1. Clone the repository
```bash
git clone <repo-url>
cd SAVIRA
```

### 2. Install all dependencies
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 3. Set up environment variables

**Backend** — create a `.env` file inside `backend/`:

PORT=5000
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key

**Frontend** — create a `.env.local` file inside `frontend/`:

NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token

### 4. Run both servers

```bash
npm run dev
```
- Frontend → http://localhost:3000
- Backend → http://localhost:5000

## License

FEU Institute of Technology