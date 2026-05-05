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

### Web — Frontend
- **Next.js** - React framework
- **React** - UI library
- **Bootstrap** - Styling

### Web — Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing

### Mobile
- **React Native** - Mobile framework
- **Expo** - Development platform
- **NativeWind** - Styling (Tailwind for React Native)
- **Expo Router** - Navigation

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
- Expo Go app (for mobile testing on Android)
- A Supabase project (get your URL and keys at supabase.com)
- A Mapbox account (get your token at mapbox.com)
- A GROQ API key (get yours at groq.com)

### 1. Clone the repository
```bash
git clone
cd SAVIRA
```

### 2. Install all dependencies
```bash
npm run install:all
```

### 3. Set up environment variables

**Backend** — create a `.env` file inside `web/backend/`:

**Frontend** — create a `.env.local` file inside `web/frontend/`:

**Mobile** — create a `.env` file inside `mobile/`:

### 4. Run the project

Run everything (web + mobile):
```bash
npm run dev
```

Run web only:
```bash
npm run dev:web
```

Run mobile only:
```bash
npm run dev:mobile
```

### 5. Accessing the app

- Web Frontend → http://localhost:3000
- Web Backend → http://localhost:5000
- Mobile → Scan the QR code with **Expo Go** app on your Android device

## Test Accounts

| Email | Role | Password |
|-------|------|----------|
| admin@test.com | Admin | test1234 |
| staff@test.com | Staff | test1234 |
| user@test.com | User | test1234 |
| legal@test.com | Legal Personnel | test1234 |
| caseofficer@test.com | Case Officer | test1234 |

> ⚠️ For development and testing purposes only. Do not use in production.

## License

FEU Institute of Technology - AXION