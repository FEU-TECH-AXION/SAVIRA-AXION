# SAVIRA — Run Guide

## First Time Setup
```bash
cd SAVIRA
npm run install:all
```

---

## Web

### Backend
```bash
cd web/backend
npm install
npm run dev
```
Backend runs on → `http://localhost:5000`

---

### Frontend
```bash
cd web/frontend
npm install
npm run dev
```
Frontend runs on → `http://localhost:3000`

**Note**: Mapbox token for heatmap is already configured in `.env`

---

### Run Both at Once (from root)
```bash
cd SAVIRA
npm run dev:web
```

Visit the heatmap at → `http://localhost:3000/heatmap` (after login)

---

## Mobile

### Step 1 — Install dependencies
```bash
cd mobile
npm install
```

### Step 2 — Open Android Studio
- Open **Device Manager** → `View → Tool Windows → Device Manager`
- Press ▶️ on your emulator
- Wait for it to **fully boot** (Android home screen shows)

### Step 3 — Start Expo
```bash
npx expo start
```

### Step 4 — Open on emulator
Press `a` in the terminal once the emulator is fully booted

### Step 5 — Controls
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
pip install -r requirements.txt ## run this inside venv file
python -m spacy download en_core_web_lg
python -c "import nltk; nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('punkt'); nltk.download('punkt_tab')"
```
> **Note:** Mac/Linux users activate with `source venv/bin/activate` instead

Copy `.env.example` to `.env` and add your `GROQ_API_KEY`

NLP Service runs on → `http://localhost:8000`

---

### Running the full stack
```bash
# Terminal 1 — Web + Mobile
npm run dev

# Terminal 2 — NLP Service
cd web/nlp
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

---

### Heatmap Feature
```bash
cd web/frontend
npm install
npm run dev

---

## Test Accounts
| Email | Role | Password |
|-------|------|----------|
| admin@test.com | Admin | test1234 |
| staff@test.com | Staff | test1234 |
| user@test.com | User | test1234 |
| legal@test.com | Legal Personnel | test1234 |
| caseofficer@test.com | Case Officer | test1234 |

> ⚠️ For development and testing only.