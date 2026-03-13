/**
 * 영양 분석 점수를 기반으로 맞춤형 피드백 문구 생성
 * @param {Object} scoreResult - calculateNutritionScore 리턴값 + meal 속성 (calories, carbs, sugar, protein, fat)
 * @returns {{ title: string, details: string[], tip: string }}
 */
export function generateFeedback(scoreResult) {
  const { totalScore, breakdown, target, meal } = scoreResult;
  let feedbackLines = [];
  const safeMeal = meal || { protein: 0, sugar: 0, carbs: 0, fat: 0 };

  // 1. 종합 평가 문구
  let overallMsg = '';
  if (totalScore >= 90)
    overallMsg = '대단해요! 완벽에 가까운 영양 균형입니다. 🍯';
  else if (totalScore >= 70)
    overallMsg = '균형 잡힌 식사네요! 건강한 습관을 유지하고 있어요. 👍';
  else if (totalScore >= 50)
    overallMsg = '괜찮은 식사지만, 몇 가지 영양소를 조절하면 더 좋겠어요. 😊';
  else
    overallMsg =
      '이번 식사는 영양 불균형이 조금 심해요. 다음 식사에서 보완해볼까요? 🧐';

  // 2. 개별 영양소 분석 (부족/과다 체크)
  const nutrients = [
    {
      name: '단백질',
      score: breakdown?.pro ?? 0,
      val: safeMeal.protein,
      goal: target?.protein ?? 1,
    },
    {
      name: '당류',
      score: breakdown?.sug ?? 0,
      val: safeMeal.sugar,
      goal: target?.sugar ?? 1,
    },
    {
      name: '탄수화물',
      score: breakdown?.carb ?? 0,
      val: safeMeal.carbs,
      goal: target?.carbs ?? 1,
    },
    {
      name: '지방',
      score: breakdown?.fat ?? 0,
      val: safeMeal.fat,
      goal: target?.fat ?? 1,
    },
  ];

  nutrients.forEach((n) => {
    const ratio = n.val / n.goal;

    if (n.name === '단백질' && ratio < 0.8) {
      feedbackLines.push(
        `💪 근육 건강을 위해 **${n.name}**을 조금 더 챙겨 드시면 좋겠어요.`,
      );
    } else if (n.name === '당류' && ratio > 1.2) {
      feedbackLines.push(
        `⚠️ **${n.name}** 함량이 높아요! 다음 식사엔 당류를 조금 줄여보세요.`,
      );
    } else if (ratio > 1.5) {
      feedbackLines.push(
        `❗ **${n.name}** 섭취량이 권장량보다 훨씬 많아요. 주의가 필요합니다.`,
      );
    }
  });

  return {
    title: overallMsg,
    details: feedbackLines,
  };
}
