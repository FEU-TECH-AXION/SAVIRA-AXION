# SAVIRA Full Stack Setup Guide

---

# Step 1 — Create the Project Folder

```bash

mkdir SAVIRA
cd SAVIRA

mkdir backend frontend
```

---

# Step 2 — Set Up the Backend

## Initialize Backend Project

```bash
cd backend

npm init -y

npm install express cors dotenv @supabase/supabase-js
npm install --save-dev nodemon
```

---

## Create Backend Folder Structure

```bash
mkdir src

cd src

mkdir routes controllers middleware models

cd ..
```

---

## Create `.gitignore`

Create `backend/.gitignore`

```gitignore
node_modules/
.env
```

```bash
echo node_modules/>> .gitignore
echo .env>> .gitignore
```

---

## Update `package.json`

Update the `scripts` section inside `backend/package.json`

```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js"
}
```

---

## Create `src/index.js`

Create `backend/src/index.js`

```js
const express = require("express");
const cors = require("cors");

require("dotenv").config();

const app = express();

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:3000",
  })
);

app.use(express.json());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () =>
  console.log(`Backend running on :${PORT}`)
);
```

---

## Create Environment Variables

Create `backend/.env`

```env
PORT=5000

FRONTEND_URL=http://localhost:3000

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

---

## Create Environment Example File

Create `backend/.env.example`

```env
PORT=5000

FRONTEND_URL=http://localhost:3000

SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

---

# Step 3 — Set Up the Frontend

## Create Next.js App

```bash
cd frontend

npx create-next-app@latest .
```

---

## Recommended Setup Answers

| Question | Answer |
|---|---|
| Use TypeScript? | No |
| Use ESLint? | Yes |
| Use Tailwind CSS? | No |
| Use `src/` directory? | Yes |
| Use App Router? | Yes |
| Use Turbopack? | No |
| Customize import alias? | No |

---

## Install Bootstrap

```bash
npm install bootstrap
```

---

## Create Frontend Folder Structure

```bash
cd src

mkdir components lib

cd ..
```

---

## Update `layout.js`

Open `frontend/src/app/layout.js`

```js
import "bootstrap/dist/css/bootstrap.min.css";

export const metadata = {
  title: "Savira",
  description: "Savira Web App",
};

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

## Create API Utility

Create `frontend/src/lib/api.js`

```js
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000";

export async function fetchUsers() {
  const res = await fetch(
    `${API_URL}/api/users`
  );

  if (!res.ok)
    throw new Error("Failed to fetch users");

  return res.json();
}
```

---

## Create Frontend Environment Variables

Create `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Create Frontend Environment Example

Create `frontend/.env.example`

```env
NEXT_PUBLIC_API_URL=
```

---

# Step 4 — Set Up the Root Project

## Initialize Root Project

```bash
cd SAVIRA

npm init -y

npm install --save-dev concurrently
```

---

## Update Root `package.json`

Update the `scripts` section

```json
"scripts": {
  "dev": "concurrently \"npm run dev --prefix backend\" \"npm run dev --prefix frontend\"",
  "install:all": "npm i && npm i --prefix backend && npm i --prefix frontend"
}
```

---

## Create Root `.gitignore`

Create `.gitignore`

```gitignore
node_modules/
.env
```

```bash
echo node_modules/>> .gitignore
echo .env>> .gitignore
```
---

# Step 5 — Run the Project

```bash
cd SAVIRA

npm run dev
```

---

# Project URLs

| Service | URL |
|---|---|
| Backend | http://localhost:5000 |
| Frontend | http://localhost:3000 |

---

# Recommended Project Structure

```txt
SAVIRA/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.js
│   │
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   │       └── api.js
│   │
│   ├── .env.local
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── package.json
```