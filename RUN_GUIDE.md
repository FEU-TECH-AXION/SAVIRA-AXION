# SAVIRA Run Guide

## First Time Setup
```bash
cd SAVIRA
npm run install:all
```

---

## Web

### Manual Terminal Process
Use this when you want to run each service in its own terminal.

**Terminal 1 - Backend**
```bash
cd web/backend
npm run dev
```

**Terminal 2 - Public Frontend / Complainant**
```bash
cd web/frontend
npm run dev
```

**Terminal 3 - Internal/Admin**
```bash
cd web/internal
npm run dev
```

**Terminal 4 - NLP Service**
```bash
cd web/nlp
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Open:
- Public/complainant app -> `http://localhost:3000`
- Admin/internal app -> `http://localhost:3001`
- Backend API -> `http://localhost:5000`
- NLP service -> `http://localhost:8000`

---

### Backend
```bash
cd web/backend
npm install
npm run dev
```

Backend runs on -> `http://localhost:5000`

---

### Public Frontend
```bash
cd web/frontend
npm install
npm run dev
```

Public frontend runs on -> `http://localhost:3000`

Visit the heatmap at -> `http://localhost:3000/heatmap` after login.

**Note:** Mapbox token for heatmap is already configured in `.env`.

---

### Internal/Admin Web App
Use this for Admin, Staff, Case Officer, Legal Personnel, and other internal dashboards.

```bash
cd web/internal
npm install
npm run dev
```

Internal/Admin app runs on -> `http://localhost:3001`

Login with an internal account, for example:

| Email | Role | Password |
|-------|------|----------|
| admin@test.com | Admin | test1234 |

If `3001` is already busy, stop the other process using that port or run:

```bash
npm run dev -- -p 3002
```

---

### Run Web Apps at Once from Root
```bash
cd SAVIRA
npm run dev:web
```

This starts:
- Backend -> `http://localhost:5000`
- Public frontend -> `http://localhost:3000`
- Internal/Admin app -> `http://localhost:3001`

Open the Admin app at -> `http://localhost:3001`

---

## Mobile

### Step 1 - Install Dependencies
```bash
cd mobile
npm install
```

### Step 2 - Open Android Studio
- Open **Device Manager** -> `View -> Tool Windows -> Device Manager`
- Press play on your emulator.
- Wait for it to fully boot until the Android home screen shows.

### Step 3 - Start Expo
```bash
npx expo start
```

### Step 4 - Open on Emulator
Press `a` in the terminal once the emulator is fully booted.

### Step 5 - Controls
| Key | Action |
|-----|--------|
| `a` | Open on Android emulator |
| `w` | Open in browser |
| `r` | Reload app |
| `Ctrl+C` | Stop server |

---

## Other Services

### NLP Service Install
```bash
cd web/nlp
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
python -c "import nltk; nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('punkt'); nltk.download('punkt_tab')"
```

> **Note:** Mac/Linux users activate with `source venv/bin/activate` instead.

Copy `.env.example` to `.env` and add your `GROQ_API_KEY`.

NLP Service runs on -> `http://localhost:8000`

---

### Running the Full Stack
```bash
# Terminal 1 - Web + Mobile
npm run dev

# Terminal 2 - NLP Service
cd web/nlp
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

---

### APK Build Command
```bash
cd mobile
eas build -p android --profile preview
```

---

## Test Accounts
| Email | Role | Password |
|-------|------|----------|
| admin@test.com | Admin | test1234 |
| staff@test.com | Staff | test1234 |
| user@test.com | User | test1234 |
| legal@test.com | Legal Personnel | test1234 |
| caseofficer@test.com | Case Officer | test1234 |

> For development and testing only.
