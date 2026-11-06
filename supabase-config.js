// 배포별 공개 설정은 Git 미추적 supabase-config.local.js에서 제공합니다.
// publishable key는 브라우저에 공개됩니다. 실제 데이터 보호는 Auth와 RLS로 적용하세요.
const newsLessonConfig = window.NEWSLESSON_PUBLIC_CONFIG || {};
const SUPABASE_URL = newsLessonConfig.supabaseUrl || '';
const SUPABASE_PUBLISHABLE_KEY = newsLessonConfig.supabasePublishableKey || '';

const supabaseClient = SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;

if (!supabaseClient) {
  console.warn('Supabase public configuration is missing; see README.md');
}
