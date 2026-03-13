const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'accessToken';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * 식사 사진 업로드 → AI 영양 분석
 * @param {File} file - 이미지 파일 (JPEG, PNG, WebP)
 * @returns {Promise<{ success: boolean, foods: Array, totalCalories: number }>}
 */
export async function analyzeFoodImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${BASE_URL}/api/scan/food`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? `요청 실패 (${res.status})`);
  return data;
}

/**
 * AI 분석 결과를 ai_scans 테이블에 저장
 * 이미지는 uploads 폴더에 저장되고 DB에는 경로만 저장됨
 * @param {Object} params
 * @param {string} params.userId - 사용자 ID
 * @param {File} params.imageFile - 이미지 파일
 * @param {Object} params.scanResult - 분석 결과 { foods, totalCalories, ... }
 * @returns {Promise<{ success: boolean, data: { ai_scan_id: string } }>}
 */
export async function saveAiScan({ userId, imageFile, scanResult }) {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('user_id', userId);
  formData.append('scan_result', JSON.stringify(scanResult));

  const res = await fetch(`${BASE_URL}/api/scan/save-diary`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? `저장 실패 (${res.status})`);
  return data;
}

/**
 * 수정된 음식량으로 AI 재분석 (비율 곱 대신 AI가 새 영양정보 산출)
 * @param {Array<{ name: string, amount: number }>} foods - 사용자가 수정한 음식 목록
 * @returns {Promise<{ success: boolean, foods: Array, totalCalories: number }>}
 */
export async function reanalyzeFood(foods) {
  const res = await fetch(`${BASE_URL}/api/scan/food/reanalyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foods }),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? `요청 실패 (${res.status})`);
  return data;
}
