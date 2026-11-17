// SafeShare configuration.
// 1. Create a project at https://supabase.com, then go to Project Settings -> API.
// 2. Copy the "Project URL" and the "anon public" key below.
// 3. Run supabase/migrations/0001_init.sql in the Supabase SQL editor.
// 4. Commit and push - GitHub Pages will deploy this folder automatically.
window.SAFESHARE_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT-REF.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-PUBLIC-ANON-KEY',
  // Base URL used inside QR codes. Leave '' to auto-detect from where the page
  // is served (recommended for GitHub Pages, e.g. https://phillipplanes.github.io/safeshare/).
  SITE_URL: ''
};
