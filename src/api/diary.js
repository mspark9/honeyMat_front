const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'accessToken';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * AI 식단 분석 결과를 diary_entries에 저장 (ai_scan_id 연동)
 * @param {Object} params
 * @param {string} params.userId - 사용자 ID
 * @param {string} params.mealType - breakfast | lunch | dinner | snack
 * @param {string} [params.mealTime] - ISO string (선택, 기본 현재 시각)
 * @param {string} [params.aiScanId] - ai_scans 테이블의 ID (image_url은 백엔드에서 조회)
 * @param {File} [params.imageFile] - 이미지 파일 (선택)
 * @param {Array<{ name: string, amount: number, calories: number, carbohydrate: number, protein: number, fat: number, sugars: number }>} params.foods - 음식 목록
 */
export async function saveScanToDiary({ userId, mealType, mealTime, aiScanId, imageFile, foods }) {
  const token = getToken();
  const formData = new FormData();
  formData.append('user_id', userId);
  formData.append('meal_type', mealType);
  formData.append('mealTime', mealTime || new Date().toISOString());
  if (aiScanId) formData.append('ai_scan_id', aiScanId);
  if (imageFile) formData.append('image', imageFile);
  formData.append('foods', JSON.stringify(foods));

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
