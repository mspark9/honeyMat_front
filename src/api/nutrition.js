/**
 * nutrition_goals, daily_summaries, deficiency API 클라이언트
 * Task 1: 백엔드 신규 API 연동
 */
import { api } from './auth.js';

/**
 * 오늘/특정일 영양 목표 조회
 * @param {string} [date] - YYYY-MM-DD (미입력 시 오늘)
 * @returns {Promise<{ data: { date, targetCalories, targetCarbohydrate, targetProtein, targetFat, targetSugars } }>}
 */
export async function getNutritionGoals(date) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const qs = params.toString();
  return api.get(`/api/users/me/nutrition-goals${qs ? '?' + qs : ''}`);
}

/**
 * 단일 날짜 일별 집계 조회
 * @param {string} [date] - YYYY-MM-DD (미입력 시 오늘)
 * @returns {Promise<{ data: { date, calories, carbohydrate, protein, fat, sugars, score, goalAchieved } }>}
 */
export async function getDailySummary(date) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const qs = params.toString();
  return api.get(`/api/users/me/daily-summary${qs ? '?' + qs : ''}`);
}

/**
 * 날짜 범위 일별 집계 조회 (주간리포트 7일용)
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<{ data: Array<{ date, calories, carbohydrate, protein, fat, sugars, score, goalAchieved }> }>}
 */
export async function getDailySummaries(startDate, endDate) {
  const params = new URLSearchParams({ startDate, endDate });
  return api.get(`/api/users/me/daily-summaries?${params.toString()}`);
}

/**
 * 영양 결핍 체크
 * @param {string} date - YYYY-MM-DD
 * @param {string} userId - 사용자 ID (AuthContext 등에서 획득)
 * @returns {Promise<{ data: { date, nutrition, alerts } }>}
 */
export async function checkDeficiency(date, userId) {
  const params = new URLSearchParams({ date });
  return api.post(`/api/deficiency/check?${params.toString()}`, { userId });
}

/**
 * 홈 화면용: 오늘의 추천 한 줄 문구 + 추천 식품 2~3개
 * @param {string} [date] - YYYY-MM-DD (미입력 시 오늘)
 * @returns {Promise<{ data: { message: string, foods: Array } }>}
 */
export async function getTodayRecommend(date) {
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  const qs = params.toString();
  const res = await api.get(`/api/users/me/today-recommend${qs ? '?' + qs : ''}`);
  return res;
}
