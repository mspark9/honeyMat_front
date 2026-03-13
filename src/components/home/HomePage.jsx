import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  LinearProgress,
  Chip,
  CircularProgress,
  Button,
} from '@mui/material';
import { ChevronRight } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Link } from 'react-router-dom';
import {
  getNutritionGoals,
  getDailySummary,
  getDailySummaries,
  getTodayRecommend,
} from '../../api/nutrition.js';

// 최근 7일 fallback (데이터 없을 때)
const ACTIVITY_DATA_FALLBACK = [0, 0, 0, 0, 0, 0, 0];

// 영양소별 색상
const INTAKE_CONFIG = {
  calories: { label: 'Calories', unit: 'kcal', color: '#FF8243' },
  carbs: { label: 'Carbs', unit: 'g', color: '#FFA726' },
  sugars: { label: 'Sugars', unit: 'g', color: '#AB47BC' },
  protein: { label: 'Protein', unit: 'g', color: '#66BB6A' },
  fat: { label: 'Fat', unit: 'g', color: '#EF5350' },
};

function HomePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nutritionScore, setNutritionScore] = useState(0);
  const [intakeData, setIntakeData] = useState(null);
  const [activityData, setActivityData] = useState(ACTIVITY_DATA_FALLBACK);
  const [activitySummaries, setActivitySummaries] = useState([]);
  const [activityGoals, setActivityGoals] = useState(null);
  const [todayRecommend, setTodayRecommend] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const end = new Date(today);
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        const startDate = start.toISOString().slice(0, 10);
        const endDate = end.toISOString().slice(0, 10);

        const [goalsRes, summaryRes, summariesRes, recommendRes] =
          await Promise.all([
            getNutritionGoals(today),
            getDailySummary(today),
            getDailySummaries(startDate, endDate),
            getTodayRecommend(today).catch(() => null),
          ]);
        if (cancelled) return;

        const goals = goalsRes?.data ?? {};
        const summary = summaryRes?.data ?? {};

        const targetCal = Number(goals.targetCalories) || 0;
        const targetCarb = Number(goals.targetCarbohydrate) || 0;
        const targetSugar = Number(goals.targetSugars) || 0;
        const targetProtein = Number(goals.targetProtein) || 0;
        const targetFat = Number(goals.targetFat) || 0;

        setNutritionScore(Number(summary.score) || 0);
        setIntakeData({
          calories: {
            current: Number(summary.calories) || 0,
            goal: targetCal || 1,
            ...INTAKE_CONFIG.calories,
          },
          carbs: {
            current: Number(summary.carbohydrate) || 0,
            goal: targetCarb || 1,
            ...INTAKE_CONFIG.carbs,
          },
          sugars: {
            current: Number(summary.sugars) || 0,
            goal: targetSugar || 1,
            ...INTAKE_CONFIG.sugars,
          },
          protein: {
            current: Number(summary.protein) || 0,
            goal: targetProtein || 1,
            ...INTAKE_CONFIG.protein,
          },
          fat: {
            current: Number(summary.fat) || 0,
            goal: targetFat || 1,
            ...INTAKE_CONFIG.fat,
          },
        });

        const summaries = summariesRes?.data ?? [];
        const scoreByDate = Object.fromEntries(
          summaries.map((s) => [s.date, Number(s.score) || 0]),
        );
        const scores = [];
        for (
          let d = new Date(startDate);
          d <= end;
          d.setDate(d.getDate() + 1)
        ) {
          const key = d.toISOString().slice(0, 10);
          scores.push(scoreByDate[key] ?? 0);
        }
        setActivityData(scores.length > 0 ? scores : ACTIVITY_DATA_FALLBACK);
        setActivitySummaries(summaries);
        setActivityGoals(goals);
        setTodayRecommend(recommendRes?.data ?? null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err?.response?.data?.message ??
          err?.message ??
          '데이터를 불러오는데 실패했습니다.',
        );
        setNutritionScore(0);
        setIntakeData(null);
        setActivityData(ACTIVITY_DATA_FALLBACK);
        setActivitySummaries([]);
        setActivityGoals(null);
        setTodayRecommend(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayData =
    intakeData ??
    Object.fromEntries(
      Object.entries(INTAKE_CONFIG).map(([k, v]) => [
        k,
        { current: 0, goal: 1, ...v },
      ]),
    );

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 4rem)',
        }}
      >
        <CircularProgress sx={{ color: '#FF8243' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 4rem)',
          gap: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.reload()}
          sx={{ bgcolor: '#FF8243', '&:hover': { bgcolor: '#e5743c' } }}
        >
          다시 시도
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 2fr' },
        gap: 2,
        height: { xs: '100%', lg: 'calc(100vh - 4rem)' },
        minHeight: 0,
        overflow: { xs: 'auto', lg: 'hidden' },
        p: 2,
      }}
    >
      {/* Left: Nutrition Score - 3분할 (Circle | Today's Intake | 격려) */}
      <Paper
        elevation={0}
        sx={{
          gridRow: { lg: 'span 2' },
          border: '1px solid #e8ecf0',
          borderRadius: 3,
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: { xs: 'visible', lg: 'hidden' },
        }}
      >
        <Typography fontWeight={700} fontSize="1.1rem" mb={1}>
          Nutrition Score
        </Typography>

        {/* 1번: Circle 영역 */}
        <Box
          sx={{
            flex: 1,
            minHeight: { xs: 'auto', lg: 0 },
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #e8ecf0',
            py: 2,
          }}
        >
          <Box sx={{ position: 'relative', width: 200, height: 200 }}>
            <svg
              style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#e8ecf0"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#FF8243"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(nutritionScore / 100) * 264} 264`}
              />
            </svg>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography fontWeight={600} fontSize="2.5rem" color="text.primary">
                {nutritionScore}
              </Typography>
              <Typography fontSize="1rem" color="text.secondary">
                / 100점
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* 2번: Today's Intake 영역 */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            py: 2,
            borderBottom: '1px solid #e8ecf0',
          }}
        >
          <Typography fontSize="0.95rem" color="text.secondary" mb={1}>
            Today&apos;s Intake
          </Typography>
          <Stack spacing={1.5}>
            {Object.entries(displayData).map(
              ([key, { current, goal, unit, color, label }]) => (
                <Box key={key}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      {current.toLocaleString?.()} / {goal.toLocaleString?.()} {unit}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((current / goal) * 100, 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#f0f0f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: color,
                        borderRadius: 3,
                      },
                    }}
                  />
                </Box>
              ),
            )}
          </Stack>
        </Box>

        {/* 3번: 오늘의 추천 한 줄 문구 영역 */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2.5,
            mt: 2,
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
            borderRadius: 3,
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -20,
              right: -20,
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255, 130, 67, 0.15)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: -30,
              left: -30,
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'rgba(255, 130, 67, 0.1)',
            },
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FF8243 0%, #F97316 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(255, 130, 67, 0.3)',
              zIndex: 1,
            }}
          >
            <Typography fontSize="1.4rem">💡</Typography>
          </Box>
          <Box sx={{ zIndex: 1 }}>
            <Typography
              variant="caption"
              sx={{
                color: '#EA580C',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Today&apos;s Tip
            </Typography>
            <Typography
              fontWeight={500}
              fontSize="0.95rem"
              color="text.primary"
              lineHeight={1.5}
              sx={{ mt: 0.5 }}
            >
              {todayRecommend?.message ?? '오늘도 건강한 하루 되세요!'}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Right Top: AI Recommended Meal 미리보기 */}
      <Paper
        elevation={0}
        sx={{
          gridColumn: { lg: 'span 1' },
          border: '1px solid #e8ecf0',
          borderRadius: 3,
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <Typography fontWeight={700} fontSize="1rem" mb={2}>
          AI Recommended Meal
        </Typography>

        {/* 태그 필터 미리보기 */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          {['고단백', '다이어트', '채소', '저탄수', '저당', '과일'].map((tag) => (
            <Chip
              key={tag}
              label={`#${tag}`}
              component={Link}
              to={{ pathname: '/home/recommendation', state: { selectedTag: tag } }}
              clickable
              size="small"
              sx={{
                bgcolor: '#f8fafc',
                color: '#64748b',
                fontWeight: 500,
                fontSize: '0.75rem',
                '&:hover': { bgcolor: '#FF8243', color: '#fff' },
              }}
            />
          ))}
        </Stack>

        {/* 추천 식품 3개 미리보기 */}
        {todayRecommend?.foods?.length > 0 ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
              pb: 1,
              overflowX: 'scroll',
            }}
          >
            {(todayRecommend.foods || []).slice(0, 3).map((food) => (
              <RecommendPreviewCard key={food.id} food={food} />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            <Typography variant="body2">추천을 불러오는 중...</Typography>
          </Box>
        )}

        {/* Recommend 페이지 이동 버튼 */}
        <Button
          component={Link}
          to="/home/recommendation"
          variant="contained"
          endIcon={<ChevronRight />}
          sx={{
            mt: 2,
            bgcolor: '#FF8243',
            '&:hover': { bgcolor: '#e5743c' },
            borderRadius: 2,
            fontWeight: 600,
            py: 1.2,
          }}
        >
          식단 추천 페이지로 이동
        </Button>
      </Paper>

      {/* Right Bottom: 최근 7일 영양 점수 추이 */}
      <ActivityScoreChart
        data={activityData.length ? activityData : ACTIVITY_DATA_FALLBACK}
        summaries={activitySummaries}
        goals={activityGoals}
      />
    </Box>
  );
}

// ─── 추천 식품 미리보기 카드 ─────────────────────────────────────────────────
function RecommendPreviewCard({ food }) {
  const items = [
    { label: '칼로리', val: food.kcal, unit: 'kcal', color: '#FF8243' },
    { label: '탄수화물', val: food.carbs, unit: 'g', color: '#6b7280' },
    { label: '단백질', val: food.protein, unit: 'g', color: '#66BB6A' },
    { label: '지방', val: food.fat, unit: 'g', color: '#EF5350' },
    { label: '당', val: food.sugar, unit: 'g', color: '#AB47BC' },
  ];
  const format = (v, u) =>
    v != null && v !== ''
      ? `${Number(v).toFixed(u === 'kcal' ? 0 : 1)}${u}`
      : '-';

  return (
    <Paper
      component={Link}
      to="/home/recommendation"
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: '#f8fafc',
        border: '1px solid #e8ecf0',
        textDecoration: 'none',
        minWidth: 183,
        transition: 'all 0.2s',
        '&:hover': {
          bgcolor: 'rgba(255, 130, 67, 0.05)',
          borderColor: 'rgba(255, 130, 67, 0.3)',
        },
      }}
    >
      <Typography
        fontWeight={600}
        fontSize="0.9rem"
        color="text.primary"
        sx={{
          mb: 1.5,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {food.name}
      </Typography>
      <Stack spacing={0.5}>
        {items.map(({ label, val, unit, color }) => (
          <Box
            key={label}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography variant="caption" fontWeight={600} sx={{ color }}>
              {format(val, unit)}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

// ─── 일일식사기록 영양 목표와 동일한 항목 ─────────────────────────────────────
const NUTRIENT_ITEMS = [
  { key: 'calories', label: '칼로리', apiKey: 'calories', unit: 'kcal', color: '#FF8243' },
  { key: 'carbs', label: '탄수화물', apiKey: 'carbohydrate', unit: 'g', color: '#FFA726' },
  { key: 'protein', label: '단백질', apiKey: 'protein', unit: 'g', color: '#66BB6A' },
  { key: 'fat', label: '지방', apiKey: 'fat', unit: 'g', color: '#EF5350' },
  { key: 'sugars', label: '당류', apiKey: 'sugars', unit: 'g', color: '#AB47BC' },
];

const GOAL_KEYS = {
  calories: 'targetCalories',
  carbs: 'targetCarbohydrate',
  protein: 'targetProtein',
  fat: 'targetFat',
  sugars: 'targetSugars',
};

function ActivityScoreChart({ data: scores, summaries, goals }) {
  const chartData = useMemo(() => {
    const today = new Date();
    const summaryByDate = Object.fromEntries(
      (summaries || []).map((s) => [s.date, s]),
    );
    return scores.map((val, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (scores.length - 1 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const summary = summaryByDate[dateStr] || {};
      return {
        day: `${d.getMonth() + 1}/${d.getDate()}`,
        dateStr,
        score: Math.min(val, 100),
        calories: Number(summary.calories) || 0,
        carbohydrate: Number(summary.carbohydrate) || 0,
        protein: Number(summary.protein) || 0,
        fat: Number(summary.fat) || 0,
        sugars: Number(summary.sugars) || 0,
      };
    });
  }, [scores, summaries]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const row = payload[0].payload;
    const hasGoals =
      goals &&
      (goals.targetCalories != null || goals.targetCarbohydrate != null);
    return (
      <Paper
        elevation={3}
        sx={{
          px: 2,
          py: 1.5,
          borderRadius: 2,
          minWidth: 160,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {row.day}
          </Typography>
          <Typography variant="body2" fontWeight={700} sx={{ color: '#FF8243', ml: 2 }}>
            {row.score}점
          </Typography>
        </Box>
        {hasGoals && (
          <Stack spacing={0.75}>
            {NUTRIENT_ITEMS.map(({ key, label, apiKey, unit, color }) => {
              const current = row[apiKey] ?? 0;
              const goal = Number(goals[GOAL_KEYS[key]]) || 1;
              const pct = Math.min((current / goal) * 100, 100);
              const text =
                unit === 'kcal'
                  ? `${Math.round(current)} / ${Math.round(goal)}`
                  : `${Number(current).toFixed(1)} / ${Number(goal).toFixed(1)}`;
              return (
                <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 48, flexShrink: 0 }}>
                    {label}
                  </Typography>
                  <Box sx={{ flex: 1, minWidth: 40 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: '#f0f0f0',
                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 },
                      }}
                    />
                  </Box>
                  <Typography variant="caption" fontWeight={500} color="text.secondary" sx={{ flexShrink: 0, fontSize: '0.65rem' }}>
                    {text} {unit}
                  </Typography>
                </Box>
              );
            })}
          </Stack>
        )}
        {!hasGoals && (
          <Typography variant="caption" color="text.secondary">
            목표 데이터 없음
          </Typography>
        )}
      </Paper>
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        gridColumn: { lg: 'span 1' },
        border: '1px solid #e8ecf0',
        borderRadius: 3,
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 220,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography fontWeight={700} fontSize="1rem">
          최근 7일 영양 점수
        </Typography>
        <Typography variant="caption" color="text.secondary">
          일별 영양 균형 점수 (0~100점, 높을수록 균형이 좋음)
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minHeight: 160, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="day"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: '#e5e7eb', strokeDasharray: '4 2' }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#FF8243"
              strokeWidth={2}
              dot={{ r: 4, fill: '#FF8243', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#FF8243', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}

export default HomePage;
