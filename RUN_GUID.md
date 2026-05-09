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

---

### Run Both at Once (from root)
```bash
cd SAVIRA
npm run dev:web
```

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

## Run Everything at Once
```bash
cd SAVIRA
npm run dev
```
Runs backend + frontend + mobile all together!

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