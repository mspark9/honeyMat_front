/**
 * 종합 영양 점수 계산기 (HoneyMat Engine)
 * @param {Object} user - { age, gender, height, weight }
 * @param {Object} meal - { calories, carbs, sugar, protein, fat } (단위: kcal, g)
 * @returns {{ totalScore: number, breakdown: Object, target: Object }}
 */
export function calculateNutritionScore(user, meal) {
  // 1. 기초대사량(BMR) 계산 (Mifflin-St Jeor 공식)
  let bmr;
  if (user.gender === 'male') {
    bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
  } else {
    bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
  }

  // 2. 활동 계수 적용 (보통 활동량 기준 1.4) 및 한 끼 권장량(1/3) 설정
  const dailyCalories = bmr * 1.4;
  const target = {
    calories: dailyCalories / 3,
    carbs: (dailyCalories * 0.5) / 4 / 3, // 탄수화물 50%, 1g=4kcal
    protein: (dailyCalories * 0.2) / 4 / 3, // 단백질 20%, 1g=4kcal
    fat: (dailyCalories * 0.3) / 9 / 3, // 지방 30%, 1g=9kcal
    sugar: (dailyCalories * 0.1) / 4 / 3, // 당류 10% 미만 권고
  };

  // 3. 각 요소별 점수 계산 (가우스 함수 형태의 유사 로직)
  // 목표치에 가까울수록 고점, 멀어질수록 감점
  const getComponentScore = (input, goal, type) => {
    const ratio = input / goal;

    if (type === 'sugar') {
      // 당류는 적을수록 좋고, 권장량 초과 시 급격히 감점
      return ratio <= 1 ? 100 : Math.max(0, 100 - (ratio - 1) * 150);
    }

    if (type === 'protein') {
      // 단백질은 부족하면 감점이 크고, 초과 시 감점은 적게 (근성장 유리)
      if (ratio < 1) return ratio * 100;
      return Math.max(70, 100 - (ratio - 1) * 20);
    }

    // 칼로리, 탄수화물, 지방 (범위 점수)
    // 목표치의 80%~120% 사이면 고점
    let score = 100 - Math.abs(1 - ratio) * 80;
    return Math.max(0, score);
  };

  const scores = {
    cal: getComponentScore(meal.calories, target.calories, 'calories'),
    carb: getComponentScore(meal.carbs, target.carbs, 'carbs'),
    pro: getComponentScore(meal.protein, target.protein, 'protein'),
    fat: getComponentScore(meal.fat, target.fat, 'fat'),
    sug: getComponentScore(meal.sugar, target.sugar, 'sugar'),
  };

  // 4. 가중치 설정 (사용자 유형별로 변수화 가능)
  // 여기서는 일반적인 균형 가중치 적용
  const weights = { cal: 0.2, carb: 0.2, pro: 0.25, fat: 0.15, sug: 0.2 };

  const totalScore =
    scores.cal * weights.cal +
    scores.carb * weights.carb +
    scores.pro * weights.pro +
    scores.fat * weights.fat +
    scores.sug * weights.sug;

  return {
    totalScore: Math.round(totalScore),
    breakdown: scores,
    target: target,
  };
}

/** ageGroup 문자열 → 나이 숫자 (BMR 계산용) */
export function ageGroupToAge(ageGroup) {
  const map = { '10대': 15, '20대': 25, '30대': 35, '40대': 45, '50대 이상': 55 };
  return map[ageGroup] ?? 30;
}

/** 사용자 프로필 → calculateNutritionScore용 user 객체 (없으면 기본값) */
export function buildUserForScore(userProfile) {
  const defaults = { age: 30, gender: 'male', height: 170, weight: 70 };
  if (!userProfile) return defaults;
  const age = userProfile.age ?? ageGroupToAge(userProfile.ageGroup) ?? defaults.age;
  const gender = (userProfile.gender || defaults.gender).toLowerCase();
  const height = Number(userProfile.height) || defaults.height;
  const weight = Number(userProfile.weight) || defaults.weight;
  return { age, gender: gender === 'female' ? 'female' : 'male', height, weight };
}

/**
 * 사용자 프로필 기반 일일 권장 섭취량 계산
 * @param {Object} userProfile - { age, ageGroup, gender, height, weight }
 * @returns {{ calories: number, carbs: number, protein: number, fat: number, sugar: number }}
 */
export function calculateDailyTargets(userProfile) {
  const user = buildUserForScore(userProfile);

  // BMR 계산 (Mifflin-St Jeor 공식)
  let bmr;
  if (user.gender === 'male') {
    bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age + 5;
  } else {
    bmr = 10 * user.weight + 6.25 * user.height - 5 * user.age - 161;
  }

  // 일일 칼로리 (활동계수 1.4 적용)
  const dailyCalories = bmr * 1.4;

  return {
    calories: Math.round(dailyCalories),
    carbs: Math.round((dailyCalories * 0.5) / 4),      // 탄수화물 50%, 1g=4kcal
    protein: Math.round((dailyCalories * 0.2) / 4),    // 단백질 20%, 1g=4kcal
    fat: Math.round((dailyCalories * 0.3) / 9),        // 지방 30%, 1g=9kcal
    sugar: Math.round((dailyCalories * 0.1) / 4),      // 당류 10% 미만 권고
  };
}

// 목표에 따른 식사별 배분 비율
const MEAL_RATIOS = {
  default:   { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 },
  weight:    { breakfast: 0.30, lunch: 0.35, dinner: 0.25, snack: 0.10 }, // 체중관리: 저녁 줄임
  muscle:    { breakfast: 0.25, lunch: 0.30, dinner: 0.35, snack: 0.10 }, // 근육증가: 저녁 증가
  nutrition: { breakfast: 0.30, lunch: 0.30, dinner: 0.30, snack: 0.10 }, // 영양균형: 균등
  condition: { breakfast: 0.35, lunch: 0.35, dinner: 0.20, snack: 0.10 }, // 컨디션: 아침 강화
};

/**
 * 사용자 목표에 따른 식사별 배분 비율 반환
 * @param {string[]} goals - 사용자 목표 배열 ['weight', 'muscle', ...]
 * @returns {{ breakfast: number, lunch: number, dinner: number, snack: number }}
 */
export function getMealRatios(goals) {
  if (!goals || goals.length === 0) {
    return MEAL_RATIOS.default;
  }
  // 첫 번째 목표를 기준으로 배분 (우선순위: weight > muscle > condition > nutrition)
  const priority = ['weight', 'muscle', 'condition', 'nutrition'];
  for (const goal of priority) {
    if (goals.includes(goal)) {
      return MEAL_RATIOS[goal];
    }
  }
  return MEAL_RATIOS.default;
}

/**
 * 사용자 프로필 기반 식사별 권장 섭취량 계산
 * @param {Object} userProfile - { age, ageGroup, gender, height, weight, goals }
 * @returns {{ breakfast: Object, lunch: Object, dinner: Object, snack: Object }}
 */
export function calculateMealTargets(userProfile) {
  const dailyTargets = calculateDailyTargets(userProfile);
  const goals = userProfile?.goals || [];
  const ratios = getMealRatios(goals);

  const applyRatio = (ratio) => ({
    calories: Math.round(dailyTargets.calories * ratio),
    carbs: Math.round(dailyTargets.carbs * ratio),
    protein: Math.round(dailyTargets.protein * ratio),
    fat: Math.round(dailyTargets.fat * ratio),
    sugar: Math.round(dailyTargets.sugar * ratio),
  });

  return {
    breakfast: applyRatio(ratios.breakfast),
    lunch: applyRatio(ratios.lunch),
    dinner: applyRatio(ratios.dinner),
    snack: applyRatio(ratios.snack),
  };
}
