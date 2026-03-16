# Soccer Lift Planner - Shared Setup (No Login)

## 1) Create Supabase project
1. Create a project in Supabase.
2. In **Project Settings -> API**, copy:
- Project URL
- `anon` public key

## 2) Create database table + public policies
1. Open **SQL Editor** in Supabase.
2. Run the SQL in `supabase/schema.sql`.

## 3) Configure this app
1. Open `config.js`.
2. Set:

```js
window.SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
window.SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

## 4) Enable realtime for the table (recommended)
1. In Supabase, go to **Database -> Replication**.
2. Enable realtime for `public.ride_requests`.

## 5) Deploy so other parents can use it
Use Netlify, Vercel, or GitHub Pages:
- Publish the folder with `index.html`, `styles.css`, `app.js`, `config.js`.
- Share the deployed URL with parents.

## Notes
- This version has no login. Anyone with the link can add/edit/remove ride requests.
- Parents identify themselves by typing their name in the app before volunteering.
