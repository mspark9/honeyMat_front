import React, { useRef, useMemo, useState, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { FaPlus, FaMinus, FaPlusMinus } from 'react-icons/fa6';
import { PiChefHat } from 'react-icons/pi';
import { Loader2 } from 'lucide-react';
import { NutrientRadarChart, WeeklyLineChart } from './ReportCharts';
import ReportCards from './ReportCards';
import AIReviewSection from './AIReviewSection';
import { useProfile } from '../../contexts/ProfileContext';
import { getDailySummaries, getNutritionGoals } from '../../api/nutrition.js';
import { api } from '../../api/auth.js';
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
    return { calories: 0, carbohydrate: 0, protein: 0, fat: 0, sugars: 0 };
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
  const pdfMaskTimeoutRef = useRef(null);
  const { profile } = useProfile();

  // 상태 관리
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1920,
  );
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [isPdfMaskVisible, setIsPdfMaskVisible] = useState(false);
  const [dailyData, setDailyData] = useState([]);
  const [lastWeekData, setLastWeekData] = useState([]);
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
  const [isAiReviewExpandedAt1800, setIsAiReviewExpandedAt1800] =
    useState(false);

  // 날짜 설정
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
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(
    () => () => {
      if (pdfMaskTimeoutRef.current) {
        clearTimeout(pdfMaskTimeoutRef.current);
      }
    },
    [],
  );

  // 데이터 페칭
  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const [summaryRes, lastWeekRes, goalRes] = await Promise.all([
          getDailySummaries(startDateStr, endDateStr),
          getDailySummaries(lastWeekStart, lastWeekEnd),
          getNutritionGoals(),
        ]);
        const allDays = eachDayOfInterval({
          start: new Date(startDateStr),
          end: new Date(endDateStr),
        }).map((d) => format(d, 'yyyy-MM-dd'));

        const formattedData = allDays.map((dateStr) => {
          const targetDate = new Date(dateStr);
          const found = summaryRes.data.find((item) =>
            isSameDay(new Date(item.date), targetDate),
          );
          if (!found)
            return {
              date: dateStr,
              kcal: 0,
              carbohydrate: 0,
              protein: 0,
              fat: 0,
              sugars: 0,
              score: 0,
            };
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
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [
    startDateStr,
    endDateStr,
    lastWeekStart,
    lastWeekEnd,
    aiReviewRefreshToken,
  ]);

  // 반응형 변수 정의
  const isAtMost1800 = viewportWidth <= 1800;
  const isAtMost1400 = viewportWidth <= 1400;
  const isAtMost1180 = viewportWidth <= 1180;
  const isAtMost1100 = viewportWidth <= 1100;
  const isAtMost870 = viewportWidth <= 870;
  const isAtMost800 = viewportWidth <= 800;
  const isAtMost700 = viewportWidth <= 700;
  const isAtMost1200 = viewportWidth <= 1200;
  const isAtMost600 = viewportWidth <= 600;
  const isAtMost500 = viewportWidth <= 500;
  const isAtMost450 = viewportWidth < 450;
  const isAtMost400 = viewportWidth <= 400;
  const isAtMost380 = viewportWidth <= 384;
  const isBetween384And450 = viewportWidth > 384 && viewportWidth < 450;
  const isAtMost350 = viewportWidth <= 350;
  const isBetween1200And1400 = viewportWidth > 1200 && viewportWidth <= 1400;
  const isBetween1024And1199 = viewportWidth < 1200 && viewportWidth > 1023;
  const isBetween870And1023 = viewportWidth >= 870 && viewportWidth <= 1023;
  const isBetween1023And1050 = viewportWidth > 1023 && viewportWidth < 1050;

  const shouldShowAiSidebar = !isAtMost1800 || isPdfMode;
  const reviewButtonTextSizeClass = isAtMost800
    ? 'text-[10px]'
    : isAtMost1200
      ? 'text-[12px]'
      : 'text-[14px]';
  const diffLabelTextSizeClass =
    isAtMost380 || isBetween384And450 ? 'text-[11px]' : 'text-[13px]';
  const diffScoreTextSizeClass = isAtMost380
    ? 'text-[11px]'
    : isBetween384And450
      ? 'text-[15px]'
      : 'text-[17px]';
  const diffScoreIconSize = isAtMost380 ? 11 : 13;
  const nicknameText = profile?.nickname || '??';
  const shouldMarqueeNickname = isAtMost350
    ? nicknameText.length >= 4
    : isAtMost450
      ? nicknameText.length >= 5
      : isAtMost500
        ? nicknameText.length >= 5
        : nicknameText.length >= 7;

  // 가공 데이터 useMemo
  const averageScore = useMemo(
    () =>
      dailyData.length
        ? Math.round(
          dailyData.reduce((acc, cur) => acc + (cur.score || 0), 0) / 7,
        )
        : 0,
    [dailyData],
  );
  const diffLastWeek = useMemo(() => {
    if (!lastWeekData.length) return 0;
    const lastWeekAvg = Math.round(
      lastWeekData.reduce((acc, cur) => acc + (cur.score || 0), 0) / 7,
    );
    return averageScore - lastWeekAvg;
  }, [averageScore, lastWeekData]);

  const radarData = useMemo(() => {
    const todayData = dailyData.find(
      (d) => d.date === format(new Date(), 'yyyy-MM-dd'),
    ) || { kcal: 0, carbohydrate: 0, protein: 0, fat: 0, sugars: 0 };
    const getRate = (val, goal) =>
      goal > 0 ? Math.round((Number(val) / Number(goal)) * 100) : 0;
    return [
      {
        subject: '칼로리',
        value: getRate(todayData.kcal, goals?.targetCalories),
      },
      {
        subject: '탄수화물',
        value: getRate(todayData.carbohydrate, goals?.targetCarbohydrate),
      },
      {
        subject: '단백질',
        value: getRate(todayData.protein, goals?.targetProtein),
      },
      { subject: '지방', value: getRate(todayData.fat, goals?.targetFat) },
      { subject: '당', value: getRate(todayData.sugars, goals?.targetSugars) },
    ];
  }, [dailyData, goals]);

  const weeklyNutritionData = useMemo(() => {
    const avg = calculateWeeklyAverageIntake(dailyData);
    return [
      {
        id: 1,
        name: '탄수화물',
        inputAmount: avg.carbohydrate,
        adviseAmount: goals?.targetCarbohydrate || 0,
      },
      {
        id: 2,
        name: '단백질',
        inputAmount: avg.protein,
        adviseAmount: goals?.targetProtein || 0,
      },
      {
        id: 3,
        name: '지방',
        inputAmount: avg.fat,
        adviseAmount: goals?.targetFat || 0,
      },
      {
        id: 4,
        name: '당류',
        inputAmount: avg.sugars,
        adviseAmount: goals?.targetSugars || 0,
      },
    ];
  }, [dailyData, goals]);

  const weeklyAverageIntake = useMemo(
    () => calculateWeeklyAverageIntake(dailyData),
    [dailyData],
  );

  const aiReviewInputSignature = useMemo(
    () =>
      JSON.stringify({
        weekStart: startDateStr,
        weekEnd: endDateStr,
        profileNickname: nicknameText,
        weeklyAverageScore: averageScore,
        scoreDiffFromLastWeek: diffLastWeek,
        weeklyAverageIntake,
        nutritionGoals: goals,
      }),
    [
      averageScore,
      diffLastWeek,
      endDateStr,
      goals,
      nicknameText,
      startDateStr,
      weeklyAverageIntake,
    ],
  );

  const lineData = dailyData.map((item) => ({
    day: item.date.slice(5, 10).replace('-', '/'),
    kcal: item.kcal,
    carbohydrate: item.carbohydrate,
    protein: item.protein,
    fat: item.fat,
    sugars: item.sugars,
  }));

  useEffect(() => {
    if (!dailyData.length || !goals) return;

    const fallbackReview = {
      review:
        '이번 주 리포트 데이터를 바탕으로 AI 영양사 리뷰를 준비 중입니다.',
      improvementPoints: [],
    };

    const loadAiReview = async () => {
      setIsAiLoading(true);
      setIsFoodListLoading(true);
      try {

        const data = await api.post('/api/ai/report-review', aiPayload);

        if (!data?.success) {
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

        const cachedRaw = localStorage.getItem(aiCacheStorageKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const isSameNutritionState =
            cached?.inputSignature === aiReviewInputSignature;
          const hasMeaningfulCache =
            cached?.review &&
            (cached.review !== fallbackReview.review ||
              (Array.isArray(cached.improvementPoints) &&
                cached.improvementPoints.length > 0) ||
              (Array.isArray(cached.recommendedFoods) &&
                cached.recommendedFoods.length > 0));

          if (hasMeaningfulCache && isSameNutritionState) {
            setAiReview({
              review: cached.review,
              improvementPoints: Array.isArray(cached.improvementPoints)
                ? cached.improvementPoints
                : [],
            });
            setFoodList(
              Array.isArray(cached.recommendedFoods)
                ? cached.recommendedFoods
                : [],

            );
            return;
          }
          localStorage.removeItem(aiCacheStorageKey);
        }


        const safePoints = Array.isArray(data.improvementPoints)
          ? data.improvementPoints.filter(Boolean).slice(0, 3)
          : [];
        const safeFoods = normalizeRecommendedFoods(data.recommendedFoods);

        setAiReview({
          review:
            data.review ||
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
                data.review ||
                '주간 리포트 분석 결과를 기반으로 한 AI 리뷰가 준비되었습니다.',
              improvementPoints: safePoints,
              foodList: safeFoods,
            }),
          );
        } catch (error) {
          console.error('AI review cache write error:', error);
        }

        const payload = {
          profileNickname: nicknameText,
          weeklyAverageScore: averageScore,
          scoreDiffFromLastWeek: diffLastWeek,
          weeklyAverageIntake,
          nutritionGoals: goals,
        };

        const data = await api.post('/api/ai/report-review', payload);
        const nextReview = {
          review: data?.review || fallbackReview.review,
          improvementPoints: Array.isArray(data?.improvementPoints)
            ? data.improvementPoints
            : [],
        };
        const nextFoods = Array.isArray(data?.recommendedFoods)
          ? data.recommendedFoods
          : [];

        setAiReview(nextReview);
        setFoodList(nextFoods);
        localStorage.setItem(
          aiCacheStorageKey,
          JSON.stringify({
            ...nextReview,
            recommendedFoods: nextFoods,
            weekStart: startDateStr,
            weekEnd: endDateStr,
            inputSignature: aiReviewInputSignature,
            updatedAt: Date.now(),
          }),
        );

      } catch (error) {
        console.error(error);
        setAiReview(fallbackReview);
        setFoodList([]);
      } finally {
        setIsAiLoading(false);
        setIsFoodListLoading(false);
      }
    };

    loadAiReview();
  }, [
    aiCacheStorageKey,
    aiReviewInputSignature,
    aiReviewRefreshToken,
    averageScore,
    dailyData,
    diffLastWeek,
    endDateStr,
    goals,
    nicknameText,
    startDateStr,
    weeklyAverageIntake,
  ]);

  const handleResetRecommendations = async () => {
    setIsFoodListLoading(true);
    try {
      const data = await api.post('/api/ai/recommend-foods', {
        currentReview: aiReview.review,

        weeklyAverageIntake: aiPayload.weeklyAverageIntake,
        nutritionGoals: aiPayload.nutritionGoals,
      });
      const refreshedFoods = normalizeRecommendedFoods(data?.recommendedFoods);

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

        weeklyAverageIntake,
        nutritionGoals: goals,
      });
      setFoodList(data?.recommendedFoods || []);
    } catch (e) {
      console.error(e);

    } finally {
      setIsFoodListLoading(false);
    }
  };

  const handleRefreshAiReport = () => {
    localStorage.removeItem(aiCacheStorageKey);
    setAiReviewRefreshToken((prev) => prev + 1);
  };

  // PDF 저장 핸들러
  const handleDownloadPdf = async () => {
    if (reportRef.current === null) return;
    setIsPdfMaskVisible(true);
    if (pdfMaskTimeoutRef.current) {
      clearTimeout(pdfMaskTimeoutRef.current);
    }
    pdfMaskTimeoutRef.current = setTimeout(() => {
      setIsPdfMaskVisible(false);
      pdfMaskTimeoutRef.current = null;
    }, 8000);

    setIsPdfMode(true);
    const originalStyle = reportRef.current.style.cssText;
    const gridContainer = reportRef.current.querySelector(
      '#report-grid-container',
    );
    const leftSection = reportRef.current.querySelector('#report-left-section');
    const sidebarSection = reportRef.current.querySelector(
      '#report-sidebar-section',
    );
    const balDefGrid = reportRef.current.querySelector('#report-bal-def-grid');

    try {
      reportRef.current.style.cssText = `
        width: 1805px !important; height: 1080px !important;
        position: absolute !important; top: 0 !important; left: 0 !important;
        z-index: -9999 !important; visibility: visible !important;
        padding: 40px !important; background-color: #F2F9F5 !important;
      `;
      gridContainer.className = 'grid grid-cols-3 gap-8 h-full';
      leftSection.className = 'col-span-2 flex flex-col gap-6';
      sidebarSection.className = 'col-span-1 flex flex-col gap-7 block';
      if (balDefGrid)
        balDefGrid.className = 'grid grid-cols-2 gap-5 !grid-cols-2';

      await new Promise((resolve) => setTimeout(resolve, 3500));

      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#F2F9F5',
        pixelRatio: 2,
        width: 1805,
        height: 1080,
      });

      reportRef.current.style.cssText = originalStyle;
      setIsPdfMode(false);

      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = dataUrl;
      });
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [1805, 1080],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 1805, 1080);
      pdf.save(`HoneyMat_Report_${nicknameText}.pdf`);
    } catch (err) {
      reportRef.current.style.cssText = originalStyle;
      setIsPdfMode(false);
      alert('PDF 생성 오류');
    }
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-[#FF8243]" />
      </div>
    );

  return (
    <div
      className={`${isAtMost600 ? 'py-1.5 px-2' : 'p-2'} min-h-screen relative`}
    >
      <style>{`
        @keyframes reportNicknameMarquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .weekly-trend-scroll {
          scrollbar-color: #ff8243 #ffe7da;
          scrollbar-width: thin;
        }
        .weekly-trend-scroll::-webkit-scrollbar {
          height: 8px;
        }
        .weekly-trend-scroll::-webkit-scrollbar-track {
          background: #ffe7da;
          border-radius: 9999px;
        }
        .weekly-trend-scroll::-webkit-scrollbar-thumb {
          background: #ff8243;
          border-radius: 9999px;
        }
      `}</style>

      <div
        ref={reportRef}
        className={`bg-[#F2F9F5] text-[#1E2923] w-full mx-auto rounded-2xl border border-gray-100 ${isAtMost600 ? 'px-5 py-4' : 'p-5'}`}
      >
        <div
          id="report-grid-container"
          className={
            shouldShowAiSidebar || isPdfMode
              ? 'grid grid-cols-3 gap-5'
              : `grid grid-cols-1 ${isAtMost600 ? 'gap-3' : 'gap-5'}`
          }
        >
          <div
            id="report-left-section"
            className={
              shouldShowAiSidebar || isPdfMode
                ? 'col-span-2 flex flex-col gap-5'
                : `col-span-1 flex flex-col ${isAtMost600 ? 'gap-3' : 'gap-5'}`
            }
          >
            {/* 상단 요약 섹션 */}
            <div
              className={`bg-white ${isAtMost450 ? 'px-2 py-2' : isAtMost600 ? 'px-5 py-4' : 'p-5'} rounded-xl shadow-sm border-l-8 border-[#FF8243] flex justify-between items-center`}
            >
              <h2
                className={`text-gray-700 ${isAtMost380
                  ? 'text-[11px]'
                  : isAtMost450
                    ? 'text-[14px]'
                    : isAtMost800
                      ? 'text-[15px]'
                      : isAtMost1100
                        ? 'text-[17px]'
                        : 'text-[19px]'
                  }`}
              >
                <span className="font-semibold pr-1 inline-block align-bottom">
                  {shouldMarqueeNickname ? (
                    <span className="inline-block w-[7ch] overflow-hidden whitespace-nowrap align-bottom">
                      <span
                        className="inline-flex items-center"
                        style={{
                          animation: 'reportNicknameMarquee 7s linear infinite',
                        }}
                      >
                        <span>{nicknameText}</span>
                        <span className="mx-5">{nicknameText}</span>
                      </span>
                    </span>
                  ) : (
                    nicknameText
                  )}
                </span>
                님의 주간 영양 점수는{' '}
                <span className="text-[#FF8243] font-bold">
                  {averageScore}점
                </span>{' '}
                입니다.
              </h2>
              {(!isAtMost700 || isPdfMode) && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center whitespace-nowrap gap-2">
                    {!isBetween1023And1050 && (
                      <span
                        className={`text-gray-600 mt-0.5 ${diffLabelTextSizeClass}`}
                      >
                        지난 주 대비
                      </span>
                    )}
                    <div
                      className={`flex items-center gap-0.5 font-bold ${diffScoreTextSizeClass} ${diffLastWeek > 0
                        ? 'text-emerald-600'
                        : diffLastWeek < 0
                          ? 'text-sky-600'
                          : 'text-gray-600'
                        }`}
                    >
                      {diffLastWeek > 0 ? (
                        <FaPlus size={diffScoreIconSize} />
                      ) : diffLastWeek < 0 ? (
                        <FaMinus size={diffScoreIconSize} />
                      ) : (
                        <FaPlusMinus size={diffScoreIconSize} />
                      )}
                      {Math.abs(diffLastWeek)}점
                    </div>
                  </div>
                  {isAtMost1800 && !isPdfMode && (
                    <button
                      onClick={() => setIsAiReviewExpandedAt1800(true)}
                      className={`rounded-xl border border-[#FF8243]/40 bg-[#FFF4ED] px-2 py-1 text-[#E46D2E] flex items-center gap-1.5 shadow-sm ${reviewButtonTextSizeClass}`}
                    >
                      <PiChefHat size={18} /> 리뷰
                    </button>
                  )}
                </div>
              )}
            </div>
            {isAtMost700 && !isPdfMode && (
              <div className="bg-white rounded-xl shadow-sm border border-[#FFE1CF] px-3 py-2 flex items-center justify-between">
                <div className="flex items-center whitespace-nowrap gap-2">
                  {!isBetween1023And1050 && (
                    <span
                      className={`text-gray-600 mt-0.5 ${diffLabelTextSizeClass}`}
                    >
                      지난 주 대비
                    </span>
                  )}
                  <div
                    className={`flex items-center gap-0.5 font-bold ${diffScoreTextSizeClass} ${diffLastWeek > 0
                      ? 'text-emerald-600'
                      : diffLastWeek < 0
                        ? 'text-sky-600'
                        : 'text-gray-600'
                      }`}
                  >
                    {diffLastWeek > 0 ? (
                      <FaPlus size={diffScoreIconSize} />
                    ) : diffLastWeek < 0 ? (
                      <FaMinus size={diffScoreIconSize} />
                    ) : (
                      <FaPlusMinus size={diffScoreIconSize} />
                    )}
                    {Math.abs(diffLastWeek)}점
                  </div>
                </div>
                {isAtMost1800 && (
                  <button
                    onClick={() => setIsAiReviewExpandedAt1800(true)}
                    className={`rounded-xl border border-[#FF8243]/40 bg-[#FFF4ED] px-2 py-1 text-[#E46D2E] flex items-center gap-1.5 shadow-sm ${reviewButtonTextSizeClass}`}
                  >
                    <PiChefHat size={18} /> 리뷰
                  </button>
                )}
              </div>
            )}

            {/* 영양 밸런스 & 과잉/결핍 섹션 */}
            <div
              id="report-bal-def-grid"
              className={
                isPdfMode ||
                  (!isBetween1024And1199 && !isAtMost870 && !isAtMost1400)
                  ? 'grid grid-cols-2 gap-5'
                  : 'grid grid-cols-1 gap-5'
              }
            >
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold mb-4 text-gray-800 border-b pb-2">
                  영양 밸런스
                </h3>
                <NutrientRadarChart
                  data={radarData}
                  angleTickFontSize={
                    isPdfMode
                      ? 14
                      : isAtMost450
                        ? 9
                        : isAtMost600
                          ? 11
                          : isAtMost1400
                            ? 13
                            : 14
                  }
                  outerRadius={isPdfMode ? '90%' : isAtMost500 ? '78%' : '90%'}
                  chartHeight={isPdfMode ? 357 : isAtMost500 ? 280 : 357}
                />
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                <h3 className="font-bold mb-1 text-gray-800 border-b pb-2">
                  과잉/결핍 영양소
                </h3>
                <div className="flex-1">
                  <ReportCards
                    nutritionData={weeklyNutritionData}
                    isAtMost1400={isPdfMode ? false : isAtMost1400}
                    isAtMost1180={isPdfMode ? false : isAtMost1180}
                    enableSingleSelect={
                      isPdfMode
                        ? false
                        : ((isAtMost1400 && !isAtMost870) || isAtMost500) &&
                        !isBetween1024And1199 &&
                        !isBetween1200And1400 &&
                        !isBetween870And1023
                    }
                    compactYFor600={isAtMost600}
                    compactFor500={isAtMost500}
                    isPdfExport={isPdfMode}
                  />
                </div>
              </div>
            </div>

            {/* 변화 추이 섹션 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold mb-6 text-gray-800 border-b pb-2">
                7일간 변화 추이
              </h3>
              <div
                className={
                  isAtMost800 && !isPdfMode
                    ? 'overflow-x-auto weekly-trend-scroll'
                    : ''
                }
              >
                <div
                  className={isAtMost800 && !isPdfMode ? 'min-w-[760px]' : ''}
                >
                  <WeeklyLineChart
                    data={lineData}
                    maximizeForSmallScreen={isPdfMode ? false : isAtMost600}
                    legendFontSize={isPdfMode ? 14 : isAtMost600 ? 11 : 14}
                    compactTextForNarrow={isPdfMode ? false : isAtMost600}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 데스크톱 전용 사이드바 */}
          <div
            id="report-sidebar-section"
            className={
              shouldShowAiSidebar || isPdfMode
                ? 'col-span-1 flex flex-col gap-7'
                : 'hidden'
            }
          >
            <AIReviewSection
              aiReview={aiReview}
              isAiLoading={isAiLoading}
              isFoodListLoading={isFoodListLoading}
              foodList={foodList}
              onResetRecommendations={handleResetRecommendations}
              onRefreshAiReport={handleRefreshAiReport}
              isAtMost1800={isAtMost1800}
              isAtMost450={isAtMost450}
            />
          </div>
        </div>
      </div>

      {/* 모바일 리뷰 모달 (이미지와 동일한 스타일 적용) */}
      {isAtMost1800 && isAiReviewExpandedAt1800 && !isPdfMode && (
        <div className="fixed inset-0 z-100 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsAiReviewExpandedAt1800(false)}
          />
          <div className="relative w-[min(480px,92vw)] h-full bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={() => setIsAiReviewExpandedAt1800(false)}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-semibold hover:bg-gray-50 text-gray-700"
              >
                닫기
              </button>
            </div>
            <div className="p-4 pt-16 ">
              <AIReviewSection
                aiReview={aiReview}
                isAiLoading={isAiLoading}
                isFoodListLoading={isFoodListLoading}
                foodList={foodList}
                onResetRecommendations={handleResetRecommendations}
                onRefreshAiReport={handleRefreshAiReport}
                isAtMost1800={isAtMost1800}
                isAtMost600={isAtMost600}
                isAtMost450={isAtMost450}
              />
            </div>
          </div>
        </div>
      )}

      {isPdfMaskVisible && (
        <div className="fixed inset-0 z-250 bg-[#F2F9F5] flex items-center justify-center">
          <p className="text-[#FF8243] text-2xl font-extrabold tracking-wide">
            PDF 저장 중 ...
          </p>
        </div>
      )}

      {/* PDF 저장 버튼 */}
      <div className="flex justify-center mt-6 mb-10">
        <button
          onClick={handleDownloadPdf}
          disabled={isPdfMaskVisible}
          className="bg-[#FF8243] text-white px-8 py-3 rounded-lg font-bold shadow-lg active:scale-95 transition-all"
        >
          PDF로 저장
        </button>
      </div>
    </div>
  );
};

export default ReportPage;
