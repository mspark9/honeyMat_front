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

const normalizeTagLabel = (tag) =>
  String(tag ?? '')
    .replace(/^#/, '')
    .trim();

const normalizeMealSearchData = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({
    id: String(row.food_code || row.id || row.food_name || 'food'),
    name: row.food_name || row.name || '이름 없음',
    description: row.manufacturer || row.category || '',
    tags: [],
    kcal: Number(row.calories) || 0,
    carbs: Number(row.carbohydrate) || 0,
    protein: Number(row.protein) || 0,
    fat: Number(row.fat) || 0,
    sugar: Number(row.sugars) || 0,
  }));
};

const searchMeals = async (query, limit = 20) => {
  const keyword = String(query ?? '').trim();
  if (!keyword) return [];
  const encodedQuery = encodeURIComponent(keyword);
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/api/meals/search?query=${encodedQuery}&limit=${limit}`,
  );
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || '음식 검색에 실패했습니다.');
  }
  return normalizeMealSearchData(data.data || []);
};

const fetchFoodsByKeywords = async (keywords) => {
  const uniqueKeywords = [
    ...new Set(
      (keywords || []).map((k) => String(k || '').trim()).filter(Boolean),
    ),
  ];
  if (uniqueKeywords.length === 0) return [];

  const searched = await Promise.all(
    uniqueKeywords.map(async (keyword) => {
      const results = await searchMeals(keyword, 10);
      if (!results.length) return null;
      const exact = results.find(
        (item) =>
          normalizeTagLabel(item.name).toLowerCase() ===
          normalizeTagLabel(keyword).toLowerCase(),
      );
      return exact || results[0];
    }),
  );

  return searched.filter(Boolean);
};

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

  // PDF 저장 중 마스크 표시 시 스크롤바 숨김
  useEffect(() => {
    if (isPdfMaskVisible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isPdfMaskVisible]);

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

  // AI 식단 리뷰 패널 펼쳤을 때 리포트 화면 스크롤 방지
  const isAiReviewOverlayOpen =
    isAtMost1800 && isAiReviewExpandedAt1800 && !isPdfMode;
  useEffect(() => {
    if (isAiReviewOverlayOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isAiReviewOverlayOpen]);

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
            const cachedFoods = Array.isArray(cached.recommendedFoods)
              ? cached.recommendedFoods
              : [];
            const names = cachedFoods.map((f) => f?.name).filter(Boolean);
            if (names.length > 0) {
              try {
                const dbFoods = await fetchFoodsByKeywords(names);
                setFoodList(dbFoods);
              } catch {
                setFoodList(cachedFoods);
              }
            } else {
              setFoodList([]);
            }
            setIsAiLoading(false);
            setIsFoodListLoading(false);
            return;
          }
          localStorage.removeItem(aiCacheStorageKey);
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
        const aiFoods = Array.isArray(data?.recommendedFoods)
          ? data.recommendedFoods
          : [];
        const names = aiFoods.map((f) => f?.name).filter(Boolean);
        const dbFoods =
          names.length > 0 ? await fetchFoodsByKeywords(names) : [];

        setAiReview(nextReview);
        setFoodList(dbFoods);
        localStorage.setItem(
          aiCacheStorageKey,
          JSON.stringify({
            ...nextReview,
            recommendedFoods: dbFoods,
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
      // 1. 현재 표시 중인 음식명을 제외 대상으로 설정
      const displayedNames = new Set(
        foodList.map((f) => String(f?.name || '').trim()).filter(Boolean),
      );

      // 2. AI로 새 추천 음식명을 받습니다
      const data = await api.post('/api/ai/recommend-foods', {
        currentReview: aiReview.review,
        weeklyAverageIntake,
        nutritionGoals: goals,
      });
      const aiFoods = Array.isArray(data?.recommendedFoods)
        ? data.recommendedFoods
        : [];
      const aiNames = aiFoods.map((f) => f?.name).filter(Boolean);

      // 3. 제외 후 남은 음식명으로 DB를 검색합니다
      const namesToSearch = aiNames.filter(
        (name) => !displayedNames.has(String(name || '').trim()),
      );
      const dbFoods =
        namesToSearch.length > 0
          ? await fetchFoodsByKeywords(namesToSearch)
          : [];

      // 4. 검색 결과로 목록을 갱신합니다
      setFoodList(dbFoods);
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

  // PDF 저장 핸들러 (1750px 기준 폰트/패딩/갭 최적화)
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
    const originalClassName = reportRef.current.className;
    const gridContainer = reportRef.current.querySelector(
      '#report-grid-container',
    );
    const leftSection = reportRef.current.querySelector('#report-left-section');
    const sidebarSection = reportRef.current.querySelector(
      '#report-sidebar-section',
    );
    const balDefGrid = reportRef.current.querySelector('#report-bal-def-grid');

    const pdfWidth = 1700;
    const pdfHeight = 1200;

    const pdfStyleEl = document.createElement('style');
    pdfStyleEl.id = 'pdf-export-1750-overrides';
    pdfStyleEl.textContent = `
      .pdf-export-1750 { padding: 24px 36px 36px 36px !important; box-sizing: border-box !important; }
      .pdf-export-1750 * { box-sizing: border-box !important; }
      .pdf-export-1750 #report-grid-container { gap: 24px !important; grid-template-rows: 1fr !important; align-items: stretch !important; }
      .pdf-export-1750 #report-left-section { gap: 20px !important; min-height: 0 !important; }
      .pdf-export-1750 #report-sidebar-section { gap: 22px !important; min-height: 0 !important; }
      .pdf-export-1750 #report-bal-def-grid { gap: 20px !important; }
      .pdf-export-1750 h2 { font-size: 17px !important; }
      .pdf-export-1750 h3 { font-size: 15px !important; }
      .pdf-export-1750 h4 { font-size: 14px !important; }
      .pdf-export-1750 p { font-size: 13px !important; }
      .pdf-export-1750 .rounded-xl.bg-white { padding: 24px !important; }
      .pdf-export-1750 .rounded-2xl.bg-white { padding: 24px !important; }
      .pdf-export-1750 .border-b { padding-bottom: 8px !important; margin-bottom: 12px !important; }
      .pdf-export-1750 .mb-4 { margin-bottom: 16px !important; }
      .pdf-export-1750 .mb-6 { margin-bottom: 20px !important; }
      .pdf-export-1750 .border-l-8 { padding: 20px 24px !important; }
      .pdf-export-1750 #report-sidebar-section > div { flex: 1 !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; }
      .pdf-export-1750 #report-sidebar-section .space-y-4 { display: flex !important; flex-direction: column !important; flex: 1 !important; min-height: 0 !important; gap: 16px !important; }
      .pdf-export-1750 #report-recommend-meal-section { flex: 1 !important; min-height: 0 !important; display: flex !important; flex-direction: column !important; }
      .pdf-export-1750 #report-recommend-meal-content { flex: 1 !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; display: flex !important; flex-direction: column !important; }
      .pdf-export-1750 #report-recommend-meal-content .flex.flex-col.gap-2 { flex: 1 !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; gap: 16px !important; }
      .pdf-export-1750 #report-recommend-meal-content .rounded-2xl.bg-white { padding: 10px 14px !important; }
      .pdf-export-1750 #report-bal-def-grid .rounded-xl.bg-white.border { padding: 8px 12px !important; margin-bottom: 10px !important; }
      .pdf-export-1750 * { scrollbar-width: none !important; }
      .pdf-export-1750 *::-webkit-scrollbar { display: none !important; }
    `;
    document.head.appendChild(pdfStyleEl);

    try {
      reportRef.current.classList.add('pdf-export-1750');
      reportRef.current.style.cssText = `
        width: ${pdfWidth}px !important; height: ${pdfHeight}px !important;
        position: absolute !important; top: 0 !important; left: 0 !important;
        z-index: -9999 !important; visibility: visible !important;
        padding: 24px 36px 36px 36px !important; background-color: #F2F9F5 !important;
      `;
      gridContainer.className = 'grid grid-cols-3 gap-8 h-full';
      gridContainer.style.gap = '24px';
      leftSection.className = 'col-span-2 flex flex-col gap-6';
      leftSection.style.gap = '20px';
      sidebarSection.className = 'col-span-1 flex flex-col gap-7 block';
      sidebarSection.style.gap = '22px';
      if (balDefGrid) {
        balDefGrid.className = 'grid grid-cols-2 gap-5 !grid-cols-2';
        balDefGrid.style.gap = '20px';
      }

      await new Promise((resolve) => setTimeout(resolve, 3500));

      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
        backgroundColor: '#F2F9F5',
        pixelRatio: 2,
        width: pdfWidth,
        height: pdfHeight,
      });

      reportRef.current.classList.remove('pdf-export-1750');
      reportRef.current.style.cssText = originalStyle;
      reportRef.current.className = originalClassName;
      gridContainer.style.gap = '';
      leftSection.style.gap = '';
      sidebarSection.style.gap = '';
      if (balDefGrid) balDefGrid.style.gap = '';
      pdfStyleEl.remove();
      setIsPdfMode(false);

      const img = new Image();
      await new Promise((res) => {
        img.onload = res;
        img.src = dataUrl;
      });

      const a4LandscapeW = 1123;
      const a4LandscapeH = 794;
      const scale = Math.min(a4LandscapeW / pdfWidth, a4LandscapeH / pdfHeight);
      const imgWidth = Math.round(pdfWidth * scale);
      const imgHeight = Math.round(pdfHeight * scale);
      const offsetX = (a4LandscapeW - imgWidth) / 2;
      const offsetY = (a4LandscapeH - imgHeight) / 2;

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [a4LandscapeW, a4LandscapeH],
      });
      pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, imgWidth, imgHeight);
      const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
      pdf.save(`HoneyMat_Report_${nicknameText}_${timestamp}.pdf`);
    } catch (err) {
      reportRef.current.classList.remove('pdf-export-1750');
      reportRef.current.style.cssText = originalStyle;
      reportRef.current.className = originalClassName;
      if (gridContainer) gridContainer.style.gap = '';
      if (leftSection) leftSection.style.gap = '';
      if (sidebarSection) sidebarSection.style.gap = '';
      if (balDefGrid) balDefGrid.style.gap = '';
      pdfStyleEl.remove();
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
        .report-scrollbar {
          scrollbar-color: #ff8243 #ffe7da;
          scrollbar-width: thin;
        }
        .report-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .report-scrollbar::-webkit-scrollbar-track {
          background: #ffe7da;
          border-radius: 9999px;
        }
        .report-scrollbar::-webkit-scrollbar-thumb {
          background: #ff8243;
          border-radius: 9999px;
        }
        .recharts-wrapper *:focus,
        .recharts-wrapper *:focus-visible,
        .recharts-legend-wrapper *:focus,
        .recharts-legend-wrapper *:focus-visible,
        .recharts-wrapper svg:focus,
        .recharts-wrapper g:focus,
        .recharts-wrapper path:focus {
          outline: none !important;
          box-shadow: none !important;
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
                className={`text-gray-700 ${
                  isAtMost380
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
                      className={`flex items-center gap-0.5 font-bold ${diffScoreTextSizeClass} ${
                        diffLastWeek > 0
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
                    className={`flex items-center gap-0.5 font-bold ${diffScoreTextSizeClass} ${
                      diffLastWeek > 0
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
            <div
              id="report-weekly-trend-section"
              className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
            >
              <h3 className="font-bold mb-6 text-gray-800 border-b pb-2">
                7일간 변화 추이
              </h3>
              <div
                className={
                  isAtMost800 && !isPdfMode
                    ? 'overflow-x-auto report-scrollbar'
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
                    compactTooltipFor800={isPdfMode ? false : isAtMost800}
                    chartHeight={isPdfMode ? 420 : undefined}
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
              isPdfExport={isPdfMode}
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
          <div className="relative w-[min(480px,92vw)] h-full bg-white shadow-2xl overflow-y-auto report-scrollbar animate-in slide-in-from-right duration-300">
            <div className="p-4">
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
                renderHeaderAction={() => (
                  <button
                    onClick={() => setIsAiReviewExpandedAt1800(false)}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm text-sm font-semibold hover:bg-gray-50 text-gray-700 shrink-0"
                  >
                    닫기
                  </button>
                )}
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
