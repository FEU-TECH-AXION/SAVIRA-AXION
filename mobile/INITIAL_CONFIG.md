# SAVIRA Mobile Setup Guide (FULL + FIXED)

---

# 1. Create Expo Project

IMPORTANT:
Make sure `mobile/` folder is EMPTY before running this.

If not, Expo may refuse to initialize.

## Create Project

```bash
mkdir mobile
cd mobile

npx create-expo-app . --template blank
```

---

# 2. Install Required Dependencies

## Web Support

```bash
npx expo install react-dom react-native-web
```

---

## Expo Router + Navigation

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

---

## NativeWind + TailwindCSS

```bash
npm install nativewind
npm install --save-dev tailwindcss

npx tailwindcss init -p
```

---

# 3. REQUIRED: Enable Expo Router Entry

⚠️ IMPORTANT STEP (often missed)

Edit or create `package.json`:

```json
{
  "main": "expo-router/entry"
}
```

---

# 4. Configure TailwindCSS

`tailwind.config.js`

```js
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

---

# 5. Configure Babel

create `babel.config.js`

```js
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
    plugins: ["nativewind/babel"],
  };
};
```

---

# 6. Install Async Storage

```bash
npx expo install @react-native-async-storage/async-storage
```

---

# 7. Install Supabase

```bash
npm install @supabase/supabase-js
```

---

# 8. Create Project Structure

```bash
mkdir app
mkdir app\(auth)
mkdir app\(complainant)
mkdir components
mkdir lib
mkdir assets
```

---

# 9. Setup Supabase Client

create `lib/supabase.js`


```js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
```

---

# 10. Environment Variables

## `.env`

```env
EXPO_PUBLIC_API_URL=http://localhost:5000

EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## `.env.example`

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

---

# 11. Git Ignore (IMPORTANT)

`.gitignore`

```gitignore
node_modules/
.expo/
dist/
.env
.env.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

---

# 12. Configure Expo App

`app.json`

```json
{
  "expo": {
    "name": "SAVIRA Mobile",
    "slug": "savira-mobile",
    "scheme": "savira",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,

    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },

    "platforms": ["android"],

    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#037F81"
      },
      "edgeToEdgeEnabled": true
    },

    "web": {
      "favicon": "./assets/favicon.png"
    },

    "plugins": ["expo-router"]
  }
}
```

---

# 13. REQUIRED: Create Expo Router Entry File

Create:

```bash
app/_layout.js
```

```js
import { Stack } from "expo-router";

export default function Layout() {
  return <Stack />;
}
```

---

# 14. Start Development Server

```bash
npx expo start
```

---

# Recommended Folder Structure

```txt
mobile/
│
├── app/
│   ├── _layout.js
│   ├── (auth)/
│   └── (complainant)/
│
├── components/
├── lib/
│   └── supabase.js
│
├── assets/
├── .gitignore
├── .env
├── .env.example
├── app.json
├── babel.config.js
├── tailwind.config.js
├── package.json
└── postcss.config.js
```