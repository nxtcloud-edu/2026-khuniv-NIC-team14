// supabase-config.js — Supabase 프로젝트 접속 정보 & 클라이언트 초기화
//
// Project URL과 publishable(anon) key는 브라우저에 그대로 노출되어도 안전하도록
// 설계된 공개 키입니다 (실제 접근 제어는 각 테이블의 Row Level Security 정책이 담당).
// 이 파일보다 먼저 supabase-js UMD 번들(<script src=".../supabase.js">)이 로드되어
// 전역 `supabase.createClient`가 존재해야 합니다.

const SUPABASE_URL = "https://xngmpufioscupyngqcup.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_6TXnSEJkozlTFtAuWiw9tQ_fBWoX0dg";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
