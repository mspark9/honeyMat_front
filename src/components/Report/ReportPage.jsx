import React, { useRef, useMemo, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { FaPlus, FaMinus, FaPlusMinus } from 'react-icons/fa6';
import { Loader2, Stethoscope } from 'lucide-react';
import { NutrientRadarChart, WeeklyLineChart } from './ReportCharts';
import ReportCards from './ReportCards';
import AIReviewSection from './AIReviewSection';
import { useProfile } from '../../contexts/ProfileContext'; // 닉네임 사용을 위해 추가
import {
  getDailySummaries,
  getNutritionGoals,
  checkDeficiency,
} from '../../api/nutrition.js';
import {
  startOfWeek,
  endOfWeek,
  format,
  eachDayOfInterval,
  subWeeks,
  isSameDay,
} from 'date-fns';

const calculateWeeklyAverageIntake = (records) => {
  if (!records.length) {
    return {
      calories: 0,
      carbohydrate: 0,
      protein: 0,
      fat: 0,
      sugars: 0,
    };
  }

  const totals = records.reduce(
    (acc, cur) => {
      acc.calories += Number(cur.kcal) || 0;
      acc.carbohydrate += Number(cur.carbohydrate) || 0;
      acc.protein += Number(cur.protein) || 0;
      acc.fat += Number(cur.fat) || 0;
      acc.sugars += Number(cur.sugars) || 0;
      return acc;
    },
    { calories: 0, carbohydrate: 0, protein: 0, fat: 0, sugars: 0 },
  );

  return {
    calories: Math.round(totals.calories / 7),
    carbohydrate: Math.round(totals.carbohydrate / 7),
    protein: Math.round(totals.protein / 7),
    fat: Math.round(totals.fat / 7),
    sugars: Math.round(totals.sugars / 7),
  };
};

const ReportPage = () => {
  const reportRef = useRef(null);
  const { profile } = useProfile(); // 프로필 정보(닉네임) 가져오기
  const [dailyData, setDailyData] = useState([]);
  const [lastWeekData, setLastWeekData] = useState([]); // 변화량 계산용
  const [goals, setGoals] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [foodList, setFoodList] = useState([]);
  const [aiReview, setAiReview] = useState({
    review: '이번 주 리포트 데이터를 바탕으로 AI 영양사 리뷰를 준비 중입니다.',
    improvementPoints: [],
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isFoodListLoading, setIsFoodListLoading] = useState(false);
  const [aiReviewRefreshToken, setAiReviewRefreshToken] = useState(0);

  // 현재 주 및 지난 주 날짜 계산
  const today = new Date();
  const startDateStr = format(
    startOfWeek(today, { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  );
  const endDateStr = format(
    endOfWeek(today, { weekStartsOn: 1 }),
    'yyyy-MM-dd',
  );

  const lastWeekStart = format(
    subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 1),
    'yyyy-MM-dd',
  );
  const lastWeekEnd = format(
    subWeeks(endOfWeek(today, { weekStartsOn: 1 }), 1),
    'yyyy-MM-dd',
  );
  const aiCacheStorageKey = useMemo(() => {
    const userKey = profile?.id || profile?.nickname || 'anonymous';
    return `report-ai-review:${userKey}`;
  }, [profile?.id, profile?.nickname]);

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        // 이번 주 데이터, 지난 주 데이터, 영양 목표를 한 번에 호출
        const [summaryRes, lastWeekRes, goalRes] = await Promise.all([
          getDailySummaries(startDateStr, endDateStr),
          getDailySummaries(lastWeekStart, lastWeekEnd),
          getNutritionGoals(),
        ]);

        // 이번 주 7일 데이터 포맷팅
        const allDays = eachDayOfInterval({
          start: new Date(startDateStr),
          end: new Date(endDateStr),
        }).map((d) => format(d, 'yyyy-MM-dd'));

        const formattedData = allDays.map((dateStr) => {
          const targetDate = new Date(dateStr);
          const found = summaryRes.data.find((item) => {
            const itemDate = new Date(item.date);
            return isSameDay(itemDate, targetDate);
          });

          if (!found) {
            return {
              date: dateStr,
              kcal: 0,
              carbohydrate: 0,
              protein: 0,
              fat: 0,
              sugars: 0,
              score: 0,
            };
          }

          // API calories 필드를 리포트 내부 키(kcal)로 정규화
          return {
            ...found,
            kcal: Number(found.kcal ?? found.calories) || 0,
            carbohydrate: Number(found.carbohydrate) || 0,
            protein: Number(found.protein) || 0,
            fat: Number(found.fat) || 0,
            sugars: Number(found.sugars) || 0,
            score: Number(found.score) || 0,
          };
        });

        setDailyData(formattedData);
        setLastWeekData(lastWeekRes.data || []);
        setGoals(goalRes.data);
      } catch (error) {
        console.error('Data fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [startDateStr, endDateStr, lastWeekStart, lastWeekEnd]);

  // 이번 주 평균 점수
  const averageScore = useMemo(() => {
    if (dailyData.length === 0) return 0;
    return Math.round(
      dailyData.reduce((acc, cur) => acc + (cur.score || 0), 0) / 7,
    );
  }, [dailyData]);

  // 지난 주 대비 변화량 계산 (diffLastWeek)
  const diffLastWeek = useMemo(() => {
    if (lastWeekData.length === 0) return 0;
    const lastWeekAvg = Math.round(
      lastWeekData.reduce((acc, cur) => acc + (cur.score || 0), 0) / 7,
    );
    return averageScore - lastWeekAvg;
  }, [averageScore, lastWeekData]);

  // 최신 기록 데이터 (오늘 또는 기록된 마지막 날)
  const latestData = useMemo(() => {
    return (
      dailyData.filter((d) => d.kcal > 0).pop() || {
        kcal: 0,
        carbohydrate: 0,
        protein: 0,
        fat: 0,
        sugars: 0,
      }
    );
  }, [dailyData]);

  // 영양 밸런스는 오늘 날짜 데이터 기준으로 표시
  const todayDateStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayData = useMemo(() => {
    return (
      dailyData.find((d) => d.date === todayDateStr) || {
        kcal: 0,
        carbohydrate: 0,
        protein: 0,
        fat: 0,
        sugars: 0,
      }
    );
  }, [dailyData, todayDateStr]);

  const getAchievementRate = (intake, goal) => {
    const intakeValue = Number(intake) || 0;
    const goalValue = Number(goal) || 0;
    if (goalValue <= 0) return 0;
    return Math.round((intakeValue / goalValue) * 100);
  };

  // 차트 및 영양소 데이터 가공
  const radarData = useMemo(
    () => [
      {
        subject: '칼로리',
        value: getAchievementRate(
          todayData.kcal ?? todayData.calories,
          goals?.targetCalories,
        ),
      },
      {
        subject: '탄수화물',
        value: getAchievementRate(
          todayData.carbohydrate,
          goals?.targetCarbohydrate,
        ),
      },
      {
        subject: '단백질',
        value: getAchievementRate(todayData.protein, goals?.targetProtein),
      },
      {
        subject: '지방',
        value: getAchievementRate(todayData.fat, goals?.targetFat),
      },
      {
        subject: '당',
        value: getAchievementRate(todayData.sugars, goals?.targetSugars),
      },
    ],
    [todayData, goals],
  );

  const nutritionData = useMemo(
    () => [
      {
        id: 1,
        name: '탄수화물',
        inputAmount: latestData.carbohydrate,
        adviseAmount: goals?.targetCarbohydrate || 0,
      },
      {
        id: 2,
        name: '단백질',
        inputAmount: latestData.protein,
        adviseAmount: goals?.targetProtein || 0,
      },
      {
        id: 3,
        name: '지방',
        inputAmount: latestData.fat,
        adviseAmount: goals?.targetFat || 0,
      },
      {
        id: 4,
        name: '당류',
        inputAmount: latestData.sugars,
        adviseAmount: goals?.targetSugars || 0,
      },
    ],
    [latestData, goals],
  );

  const lineData = dailyData.map((item) => ({
    day: item.date.slice(5, 10).replace('-', '/'),
    kcal: item.kcal,
    carbohydrate: item.carbohydrate,
    protein: item.protein,
    fat: item.fat,
    sugars: item.sugars,
  }));

  // 과잉/결핍 카드는 최근 7일 평균 섭취량 기준으로 계산
  const weeklyNutritionData = useMemo(() => {
    const weeklyAverageIntake = calculateWeeklyAverageIntake(dailyData);

    return [
      {
        id: 1,
        name: '탄수화물',
        inputAmount: weeklyAverageIntake.carbohydrate,
        adviseAmount: goals?.targetCarbohydrate || 0,
      },
      {
        id: 2,
        name: '단백질',
        inputAmount: weeklyAverageIntake.protein,
        adviseAmount: goals?.targetProtein || 0,
      },
      {
        id: 3,
        name: '지방',
        inputAmount: weeklyAverageIntake.fat,
        adviseAmount: goals?.targetFat || 0,
      },
      {
        id: 4,
        name: '당류',
        inputAmount: weeklyAverageIntake.sugars,
        adviseAmount: goals?.targetSugars || 0,
      },
    ];
  }, [dailyData, goals]);

  const nutritionDiffSummary = useMemo(() => {
    return nutritionData.map((item) => {
      const goal = Number(item.adviseAmount) || 0;
      const intake = Number(item.inputAmount) || 0;
      const diff = intake - goal;
      const percentage = goal > 0 ? Math.round((diff / goal) * 100) : 0;
      return {
        nutrient: item.name,
        intake,
        goal,
        diff,
        percentage,
      };
    });
  }, [nutritionData]);

  const aiNutritionSignature = useMemo(() => {
    const normalizedDaily = dailyData.map((item) => ({
      date: item.date,
      kcal: Number(item.kcal) || 0,
      carbohydrate: Number(item.carbohydrate) || 0,
      protein: Number(item.protein) || 0,
      fat: Number(item.fat) || 0,
      sugars: Number(item.sugars) || 0,
      score: Number(item.score) || 0,
    }));

    const normalizedGoals = {
      calories: Number(goals?.targetCalories) || 0,
      carbohydrate: Number(goals?.targetCarbohydrate) || 0,
      protein: Number(goals?.targetProtein) || 0,
      fat: Number(goals?.targetFat) || 0,
      sugars: Number(goals?.targetSugars) || 0,
    };

    return JSON.stringify({
      goals: normalizedGoals,
      dailyData: normalizedDaily,
    });
  }, [goals, dailyData]);

  const aiPayload = useMemo(
    () => ({
      profileNickname: profile?.nickname || '사용자',
      weeklyAverageScore: averageScore,
      scoreDiffFromLastWeek: diffLastWeek,
      weeklyAverageIntake: calculateWeeklyAverageIntake(dailyData),
      latestIntake: {
        kcal: latestData.kcal || 0,
        carbohydrate: latestData.carbohydrate || 0,
        protein: latestData.protein || 0,
        fat: latestData.fat || 0,
        sugars: latestData.sugars || 0,
      },
      nutritionGoals: {
        calories: Number(goals?.targetCalories) || 0,
        carbohydrate: Number(goals?.targetCarbohydrate) || 0,
        protein: Number(goals?.targetProtein) || 0,
        fat: Number(goals?.targetFat) || 0,
        sugars: Number(goals?.targetSugars) || 0,
      },
      nutrientGapSummary: nutritionDiffSummary,
    }),
    [
      profile?.nickname,
      averageScore,
      diffLastWeek,
      dailyData,
      latestData,
      goals,
      nutritionDiffSummary,
    ],
  );

  const normalizeRecommendedFoods = (recommendedFoods) => {
    if (!Array.isArray(recommendedFoods)) return [];
    const toTagArray = (rawTags) => {
      if (Array.isArray(rawTags)) return rawTags.filter(Boolean);
      if (typeof rawTags !== 'string') return [];

      const trimmed = rawTags.trim();
      if (!trimmed) return [];

      // JSON 문자열 배열 형태면 우선 파싱 시도
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
        } catch {
          // 파싱 실패 시 콤마 분리로 fallback
        }
      }

      return trimmed
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
    };

    return recommendedFoods.slice(0, 3).map((food, index) => ({
      id:
        food?.id ||
        `report-ai-food-${index}-${food?.name || 'unknown'}`.replace(
          /\s+/g,
          '-',
        ),
      name: food?.name || '추천 음식',
      description: food?.description || '',
      kcal: Number(food?.kcal) || 0,
      carbs: Number(food?.carbs) || 0,
      protein: Number(food?.protein) || 0,
      fat: Number(food?.fat) || 0,
      sugar: Number(food?.sugar) || 0,
      tags: toTagArray(food?.tags),
    }));
  };

  const buildFallbackReview = () => {
    const excess = nutritionDiffSummary
      .filter((item) => item.percentage > 0)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 2);
    const deficiency = nutritionDiffSummary
      .filter((item) => item.percentage < 0)
      .sort((a, b) => a.percentage - b.percentage)
      .slice(0, 2);

    const primaryDeficiency = deficiency[0];
    const reviewText = primaryDeficiency
      ? `${primaryDeficiency.nutrient} 섭취가 권장량 대비 ${Math.abs(primaryDeficiency.percentage)}% 부족합니다. 다음 주에는 부족한 영양소를 우선 보완해 균형을 맞춰보세요.`
      : '전반적인 영양 밸런스가 안정적으로 유지되고 있습니다. 현재 식단 패턴을 유지하면서 수분 섭취와 식사 규칙성을 함께 관리해보세요.';

    const fallbackPoints = [
      excess[0]
        ? `${excess[0].nutrient} 섭취를 약간 줄여 일일 권장량에 맞춰보세요.`
        : '가공식품과 나트륨이 높은 반찬 섭취 빈도를 주 1~2회 줄여보세요.',
      deficiency[0]
        ? `${deficiency[0].nutrient} 보완 식품을 하루 한 끼 이상 추가해보세요.`
        : '채소, 단백질, 통곡물을 포함한 균형 식사를 유지하세요.',
      '하루 물 1.5~2L 섭취와 규칙적인 식사 시간을 유지해보세요.',
    ];

    return {
      review: reviewText,
      improvementPoints: fallbackPoints,
      recommendedFoods: [],
    };
  };

  const parseAiJson = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    try {
      return JSON.parse(raw);
    } catch {
      const cleaned = raw
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        return null;
      }
    }
  };

  useEffect(() => {
    if (!goals || !dailyData.length || isLoading) return;

    try {
      const cached = localStorage.getItem(aiCacheStorageKey);
      if (cached) {
        const parsedCached = JSON.parse(cached);
        if (
          parsedCached?.signature === aiNutritionSignature &&
          parsedCached?.review &&
          Array.isArray(parsedCached?.improvementPoints)
        ) {
          setAiReview({
            review: parsedCached.review,
            improvementPoints: parsedCached.improvementPoints,
          });
          setFoodList(
            Array.isArray(parsedCached.foodList) ? parsedCached.foodList : [],
          );
          return;
        }
      }
    } catch (error) {
      console.error('AI review cache read error:', error);
    }

    const apiKey =
      import.meta.env?.VITE_OPENAI_API_KEY ||
      process?.env?.REACT_APP_OPENAI_API_KEY;

    if (!apiKey) {
      const fallback = buildFallbackReview();
      setAiReview({
        review: fallback.review,
        improvementPoints: fallback.improvementPoints,
      });
      setFoodList([]);
      try {
        localStorage.setItem(
          aiCacheStorageKey,
          JSON.stringify({
            signature: aiNutritionSignature,
            review: fallback.review,
            improvementPoints: fallback.improvementPoints,
            foodList: [],
          }),
        );
      } catch (error) {
        console.error('AI review cache write error:', error);
      }
      return;
    }

    const controller = new AbortController();

    const fetchAiReview = async () => {
      setIsAiLoading(true);
      try {
        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              temperature: 0.4,
              messages: [
                {
                  role: 'system',
                  content:
                    '당신은 사용자에게 친절하게 식단 피드백을 주는 영양사다. 응답은 반드시 JSON 객체 하나로만 반환한다.',
                },
                {
                  role: 'user',
                  content: `아래 리포트 데이터를 기반으로 주간 리뷰를 작성해줘.\n\n데이터: ${JSON.stringify(aiPayload)}\n\n반환 형식(JSON만):\n{\n  "review": "2문장 이내 한글 리뷰",\n  "improvementPoints": ["개선 포인트 1", "개선 포인트 2", "개선 포인트 3"],\n  "recommendedFoods": [\n    {\n      "name": "음식명",\n      "description": "추천 이유 1문장",\n      "kcal": 0,\n      "carbs": 0,\n      "protein": 0,\n      "fat": 0,\n      "sugar": 0,\n      "tags": ["#고단백"]\n    }\n  ]\n}\n\n규칙:\n- review는 과도한 과장 없이 데이터 기반으로 작성\n- improvementPoints는 정확히 3개\n- recommendedFoods는 2~3개\n- tags는 #으로 시작`,
                },
              ],
            }),
          },
        );

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        const parsed = parseAiJson(content);

        if (!parsed) {
          const fallback = buildFallbackReview();
          setAiReview({
            review: fallback.review,
            improvementPoints: fallback.improvementPoints,
          });
          setFoodList([]);
          try {
            localStorage.setItem(
              aiCacheStorageKey,
              JSON.stringify({
                signature: aiNutritionSignature,
                review: fallback.review,
                improvementPoints: fallback.improvementPoints,
                foodList: [],
              }),
            );
          } catch (error) {
            console.error('AI review cache write error:', error);
          }
          return;
        }

        const safePoints = Array.isArray(parsed.improvementPoints)
          ? parsed.improvementPoints.filter(Boolean).slice(0, 3)
          : [];
        const safeFoods = normalizeRecommendedFoods(parsed.recommendedFoods);

        setAiReview({
          review:
            parsed.review ||
            '주간 리포트 분석 결과를 기반으로 한 AI 리뷰가 준비되었습니다.',
          improvementPoints: safePoints,
        });
        setFoodList(safeFoods);
        try {
          localStorage.setItem(
            aiCacheStorageKey,
            JSON.stringify({
              signature: aiNutritionSignature,
              review:
                parsed.review ||
                '주간 리포트 분석 결과를 기반으로 한 AI 리뷰가 준비되었습니다.',
              improvementPoints: safePoints,
              foodList: safeFoods,
            }),
          );
        } catch (error) {
          console.error('AI review cache write error:', error);
        }
      } catch (error) {
        if (error?.name !== 'AbortError') {
          const fallback = buildFallbackReview();
          setAiReview({
            review: fallback.review,
            improvementPoints: fallback.improvementPoints,
          });
          setFoodList([]);
          try {
            localStorage.setItem(
              aiCacheStorageKey,
              JSON.stringify({
                signature: aiNutritionSignature,
                review: fallback.review,
                improvementPoints: fallback.improvementPoints,
                foodList: [],
              }),
            );
          } catch (cacheError) {
            console.error('AI review cache write error:', cacheError);
          }
          console.error('AI review fetch error:', error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAiLoading(false);
        }
      }
    };

    fetchAiReview();

    return () => controller.abort();
  }, [
    goals,
    dailyData,
    isLoading,
    profile?.nickname,
    aiPayload,
    aiCacheStorageKey,
    aiNutritionSignature,
    aiReviewRefreshToken,
  ]);

  const handleResetRecommendations = async () => {
    const apiKey =
      import.meta.env?.VITE_OPENAI_API_KEY ||
      process?.env?.REACT_APP_OPENAI_API_KEY;
    if (!apiKey) return;

    setIsFoodListLoading(true);
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.8,
            messages: [
              {
                role: 'system',
                content:
                  '당신은 식단 추천 영양사다. 응답은 JSON 객체 하나로만 반환한다.',
              },
              {
                role: 'user',
                content: `아래 리포트 데이터를 바탕으로 추천 식단만 새로 2~3개 생성해줘.\n리뷰/개선포인트는 이미 확정되어 있으니 바꾸지 말고 추천 식단만 다양하게 바꿔줘.\n\n현재 리뷰: ${aiReview.review}\n현재 개선포인트: ${JSON.stringify(aiReview.improvementPoints)}\n데이터: ${JSON.stringify(aiPayload)}\n\n반환 형식(JSON만):\n{\n  "recommendedFoods": [\n    {\n      "name": "음식명",\n      "description": "추천 이유 1문장",\n      "kcal": 0,\n      "carbs": 0,\n      "protein": 0,\n      "fat": 0,\n      "sugar": 0,\n      "tags": ["#고단백"]\n    }\n  ]\n}`,
              },
            ],
          }),
        },
      );

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      const parsed = parseAiJson(content);
      const recommendedFoods = Array.isArray(parsed)
        ? parsed
        : parsed?.recommendedFoods;
      const refreshedFoods = normalizeRecommendedFoods(recommendedFoods);

      if (refreshedFoods.length) {
        setFoodList(refreshedFoods);
        try {
          const cached = localStorage.getItem(aiCacheStorageKey);
          const parsedCached = cached ? JSON.parse(cached) : {};
          localStorage.setItem(
            aiCacheStorageKey,
            JSON.stringify({
              signature: aiNutritionSignature,
              review: parsedCached?.review || aiReview.review,
              improvementPoints:
                parsedCached?.improvementPoints || aiReview.improvementPoints,
              foodList: refreshedFoods,
            }),
          );
        } catch (error) {
          console.error('AI review cache write error:', error);
        }
      }
    } catch (error) {
      console.error('AI recommendation refresh error:', error);
    } finally {
      setIsFoodListLoading(false);
    }
  };

  const handleRefreshAiReport = () => {
    try {
      localStorage.removeItem(aiCacheStorageKey);
    } catch (error) {
      console.error('AI review cache remove error:', error);
    }
    setIsAiLoading(true);
    setAiReviewRefreshToken((prev) => prev + 1);
  };

  const handleDownloadPdf = async () => {
    if (reportRef.current === null) return;
    try {
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#F2F9F5',
        pixelRatio: 3,
      });
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      const marginTop = (pageHeight - imgHeight) / 2;
      pdf.addImage(dataUrl, 'PNG', 0, marginTop, imgWidth, imgHeight);
      pdf.save(`HoneyMat_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF 생성 오류:', err);
      alert('PDF 생성 중 오류가 발생했습니다.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-[#FF8243]">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-2 min-h-screen">
      <div
        ref={reportRef}
        className="bg-[#F2F9F5] text-[#1E2923] w-full mx-auto rounded-2xl border border-gray-100 p-5"
      >
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 flex flex-col gap-5">
            {/* 상단 요약 카드 */}
            <div className="bg-white flex justify-between items-center p-5 rounded-xl shadow-sm border-l-8 border-[#FF8243]">
              <h2 className="text-gray-700 text-[19px] mr-4">
                <span className="text-gray-700 font-semibold text-[22px] pr-1">
                  {profile?.nickname || '??'}
                </span>
                님의 주간 영양 점수는{' '}
                <span className="text-[#FF8243] font-bold text-[23px] pr-1">
                  {averageScore}점
                </span>
                입니다.
              </h2>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center whitespace-nowrap gap-2">
                  <span className="text-gray-600 text-[15px] mt-0.5">
                    지난 주 대비
                  </span>
                  <div
                    className={`flex items-center gap-0.5 font-bold text-[19px] ${
                      diffLastWeek > 0
                        ? 'text-emerald-600'
                        : diffLastWeek < 0
                          ? 'text-sky-600'
                          : 'text-gray-600'
                    }`}
                  >
                    {diffLastWeek > 0 ? (
                      <FaPlus size={13} className="mt-0.5" />
                    ) : diffLastWeek < 0 ? (
                      <FaMinus size={13} className="mt-0.5" />
                    ) : (
                      <FaPlusMinus size={13} className="mt-0.5" />
                    )}
                    {Math.abs(diffLastWeek)}
                  </div>
                  <span className="text-gray-500 text-[17px] -mt-0.5 -ml-1">
                    점
                  </span>
                </div>
              </div>
            </div>

            {/* 영양 밸런스, 과잉/결핍 섹션 */}
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold mb-6 text-gray-800 border-b pb-2">
                  영양 밸런스
                </h3>
                <NutrientRadarChart data={radarData} />
              </div>

              <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="font-bold mb-4 text-gray-800 border-b pb-3">
                  과잉/결핍 영양소
                </h3>
                <div className="flex-1 ">
                  <ReportCards nutritionData={weeklyNutritionData} />
                </div>
              </div>
            </div>

            {/* 7일간 변화 추이 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold mb-6 text-gray-800 border-b pb-2">
                7일간 변화 추이
              </h3>
              <WeeklyLineChart data={lineData} />
            </div>
          </div>

          {/* AI 리뷰 사이드바 + 영양 결핍 체크 */}
          <div className="col-span-1 flex flex-col gap-7">
            <AIReviewSection
              aiReview={aiReview}
              isAiLoading={isAiLoading}
              isFoodListLoading={isFoodListLoading}
              foodList={foodList}
              onResetRecommendations={handleResetRecommendations}
              onRefreshAiReport={handleRefreshAiReport}
            />
          </div>
        </div>
      </div>

      {/* PDF 저장 버튼 */}
      <div className="items-center justify-center mx-auto flex mb-4 mt-4">
        <button
          onClick={handleDownloadPdf}
          className="bg-[#FF8243] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#ff8243c9] transition-all shadow-lg active:scale-95"
        >
          PDF로 저장
        </button>
      </div>
    </div>
  );
};

// ─── 영양 결핍 체크 카드 ────────────────────────────────────────────────────
function DeficiencyCheckCard({ userId }) {
  const [dateStr, setDateStr] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [checkError, setCheckError] = useState(null);

  const handleCheck = async () => {
    if (!userId) {
      setCheckError('로그인이 필요합니다.');
      return;
    }
    setChecking(true);
    setCheckError(null);
    setResult(null);
    try {
      const res = await checkDeficiency(dateStr, userId);
      setResult(res?.data ?? null);
    } catch (err) {
      setCheckError(
        err?.response?.data?.message ??
          err?.message ??
          '결핍 체크에 실패했습니다.',
      );
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-lg mb-4 flex items-center text-gray-800">
        <span className="mr-2">
          <Stethoscope size={20} color="#FF8243" />
        </span>
        영양 결핍 체크
      </h3>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <input
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-800"
        />
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking || !userId}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-sm font-medium disabled:opacity-50 bg-[#FF8243] hover:bg-[#e57339]"
        >
          {checking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Stethoscope size={16} />
          )}
          {checking ? '검사 중...' : '결핍 체크'}
        </button>
      </div>
      {checkError && <p className="text-sm text-red-500 mb-2">{checkError}</p>}
      {result && (
        <div className="space-y-2">
          {result.alerts?.length ? (
            <ul className="space-y-1.5">
              {result.alerts.map((a, i) => (
                <li
                  key={i}
                  className="text-sm px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-gray-800"
                >
                  <span className="font-semibold">
                    {a.type === 'CALORIES'
                      ? '칼로리'
                      : a.type === 'CARBOHYDRATE'
                        ? '탄수화물'
                        : a.type === 'PROTEIN'
                          ? '단백질'
                          : a.type === 'FAT'
                            ? '지방'
                            : a.type}
                  </span>
                  : 목표 {a.target} 중 {a.current} 섭취 (부족)
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600">
              선택한 날짜에 영양 결핍이 없습니다.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportPage;
