import { useState, useRef, useEffect, useMemo } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom'; // 추천 페이지에서 전달된 state 읽기용
import {
    Box,
    Paper,
    Typography,
    IconButton,
    Divider,
    TextField,
    Button,
    LinearProgress,
    Collapse,
    Stack,
    Avatar,
    Chip,
    Tooltip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from '@mui/material';
import {
    ChevronLeft,
    ChevronRight,
    AddPhotoAlternate,
    ExpandMore,
    ExpandLess,
    FreeBreakfast,
    LunchDining,
    DinnerDining,
    Icecream,
    LocalFireDepartment,
    Add,
    ArrowBack,
    CheckCircle,
    EditNote,
    DeleteOutline,
} from '@mui/icons-material';
import FoodSearchInput from '../components/search/FoodSearchInput';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { getNutritionGoals } from '../api/nutrition.js';
import { calculateMealTargets } from '../components/common/calculateNutritionScore';

// ─── API 기본 URL ──────────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL;

// ─── 상수 ────────────────────────────────────────────────────────────────────
const MEALS = [
    {
        key: 'breakfast',
        label: '아침',
        Icon: FreeBreakfast,
        color: '#FF8A65',
        bg: '#FFF3E0',
        darkColor: '#E64A19',
    },
    {
        key: 'lunch',
        label: '점심',
        Icon: LunchDining,
        color: '#66BB6A',
        bg: '#E8F5E9',
        darkColor: '#2E7D32',
    },
    {
        key: 'dinner',
        label: '저녁',
        Icon: DinnerDining,
        color: '#7986CB',
        bg: '#E8EAF6',
        darkColor: '#303F9F',
    },
    {
        key: 'snack',
        label: '간식',
        Icon: Icecream,
        color: '#F06292',
        bg: '#FCE4EC',
        darkColor: '#C2185B',
    },
];

// 기본 영양소 설정 (프로필 정보가 없을 때 사용하는 기본값)
const DEFAULT_NUTRIENT_CONFIG = [
    { key: 'carbs', label: '탄수화물', color: '#FFA726', daily: 300 },
    { key: 'protein', label: '단백질', color: '#66BB6A', daily: 60 },
    { key: 'fat', label: '지방', color: '#EF5350', daily: 65 },
    { key: 'sugar', label: '당류', color: '#AB47BC', daily: 50 },
];

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────
function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function isSameDay(d1, d2) {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}
function getKoreanDate(date) {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${days[date.getDay()]})`;
}
function getMealTotalCalories(meal) {
    if (!meal?.foods?.length) return 0;
    return meal.foods.reduce((sum, f) => sum + f.calories, 0);
}

// ─── API 응답을 프론트엔드 형식으로 변환 ────────────────────────────────────
function transformApiResponse(apiData) {
    if (!apiData || !apiData.success) return null;

    // 이미지 URL 변환 함수
    const getFullImageUrl = (imageUrl) => {
        if (!imageUrl) return null;
        // 이미 전체 URL인 경우 그대로 반환
        if (imageUrl.startsWith('http')) return imageUrl;
        // 상대 경로인 경우 API_BASE_URL 추가
        const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
        return `${API_BASE_URL}${path}`;
    };

    const transformMeal = (meal) => {
        const foods = meal.foods || [];
        // 모든 음식의 메모를 수집 (중복 제거, 빈 값 제외)
        const allMemos = foods
            .map((f) => f.memo)
            .filter((memo) => memo && memo.trim())
            .filter((memo, index, arr) => arr.indexOf(memo) === index); // 중복 제거

        return {
            foods: foods.map((f) => ({
                id: f.id,
                name: f.foodName || '알 수 없는 음식',
                calories: f.calories || 0,
                servingSize: f.servings || f.servingSize || 0,  // 백엔드는 servings로 반환
                nutrients: f.nutrients || { carbs: 0, protein: 0, fat: 0, sugar: 0 },
                image: getFullImageUrl(f.imageUrl),
                aiScanId: f.aiScanId || null,
            })),
            nutrients: meal.nutrients || { carbs: 0, protein: 0, fat: 0, sugar: 0 },
            memos: allMemos, // 메모 배열로 저장
        };
    };

    return {
        summary: apiData.summary || { calories: 0, carbs: 0, protein: 0, fat: 0, sugar: 0 },
        breakfast: transformMeal(apiData.breakfast),
        lunch: transformMeal(apiData.lunch),
        dinner: transformMeal(apiData.dinner),
        snack: transformMeal(apiData.snack),
    };
}

// ─── 영양소 바 ────────────────────────────────────────────────────────────────
function NutrientBar({ label, value, daily, color }) {
    const pct = Math.min((value / daily) * 100, 100);
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {label}
                </Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color }}>
                    {Number(value).toFixed(2)}g{' '}
                    <Typography component="span" variant="caption" color="text.disabled">
                        / {daily}g
                    </Typography>
                </Typography>
            </Box>
            <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                    height: 6,
                    borderRadius: 4,
                    bgcolor: '#f1f5f9',
                    '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                }}
            />
        </Box>
    );
}

// ─── 식사 카드 ────────────────────────────────────────────────────────────────
function MealCard({ meal, data, isToday, dateStr, nutrientConfig }) {
    const [open, setOpen] = useState(false);
    const totalCal = getMealTotalCalories(data);
    const { Icon, color, bg, darkColor } = meal;

    // 저장된 메모 배열
    const savedMemos = data?.memos || [];

    // AI 식단분석에서 기록한 경우: 같은 이미지를 공유하는 음식들은 공통 이미지로 한 번만 표시
    const allImages = data?.foods?.map((f) => f.image).filter(Boolean) || [];
    const uniqueImages = [...new Set(allImages)];
    // 모든 음식이 같은 이미지를 공유하거나, aiScanId가 있는 경우 공통 이미지로 처리
    const hasSharedImage = uniqueImages.length === 1 && data?.foods?.length > 1;
    const aiScanFood = data?.foods?.find((f) => f.aiScanId && f.image);
    const aiScanImage = hasSharedImage ? uniqueImages[0] : (aiScanFood?.image || null);

    return (
        <Paper
            elevation={0}
            sx={{
                border: `1.5px solid ${open ? color : '#e8ecf0'}`,
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                flexGrow: 1,
            }}
        >
            {/* 카드 헤더 */}
            <Box
                onClick={() => setOpen((v) => !v)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    bgcolor: open ? bg : 'transparent',
                    transition: 'background 0.2s',
                    '&:hover': { bgcolor: bg },
                }}
            >
                <Avatar sx={{ width: 36, height: 36, bgcolor: color }}>
                    <Icon sx={{ fontSize: 18, color: '#fff' }} />
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography fontWeight={700} fontSize="0.95rem">
                        {meal.label}
                    </Typography>
                    {data?.foods?.length > 0 && (
                        <Typography variant="caption" color="text.secondary">
                            {data.foods.map((f) => f.name).join(', ')}
                        </Typography>
                    )}
                </Box>
                {totalCal > 0 ? (
                    <Chip
                        icon={
                            <LocalFireDepartment
                                sx={{
                                    fontSize: '14px !important',
                                    color: `${darkColor} !important`,
                                }}
                            />
                        }
                        label={`${totalCal} kcal`}
                        size="small"
                        sx={{
                            bgcolor: bg,
                            color: darkColor,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                        }}
                    />
                ) : (
                    <Chip
                        label="미기록"
                        size="small"
                        variant="outlined"
                        sx={{ color: 'text.disabled', borderColor: '#e2e8f0' }}
                    />
                )}
                <IconButton size="small" sx={{ ml: 0.5 }}>
                    {open ? (
                        <ExpandLess fontSize="small" />
                    ) : (
                        <ExpandMore fontSize="small" />
                    )}
                </IconButton>
            </Box>

            {/* 카드 내용 */}
            <Collapse in={open}>
                <Divider />
                <Box sx={{ p: 2.5 }}>
                    {/* AI 분석 사진 (ai_scan_id가 있는 경우 음식목록 위에 한 번만 표시) */}
                    {aiScanImage && (
                        <Box sx={{ mb: 2 }}>
                            <Typography
                                variant="caption"
                                fontWeight={600}
                                color="text.secondary"
                                sx={{ display: 'block', mb: 0.5 }}
                            >
                                AI 분석 사진
                            </Typography>
                            <Box
                                component="img"
                                src={aiScanImage}
                                alt="AI 분석 사진"
                                sx={{
                                    width: 80,
                                    height: 80,
                                    objectFit: 'cover',
                                    borderRadius: 1.5,
                                    border: `2px solid ${color}`,
                                }}
                            />
                        </Box>
                    )}
                    {/* 음식 리스트 */}
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        mb={1}
                        color="text.secondary"
                    >
                        음식 목록
                    </Typography>
                    {data?.foods?.length > 0 ? (
                        <Stack spacing={1} mb={2}>
                            {data.foods.map((food, i) => (
                                <Box
                                    key={i}
                                    sx={{
                                        bgcolor: '#f8fafc',
                                        borderRadius: 2,
                                        p: 1.5,
                                        border: '1px solid #e8ecf0',
                                    }}
                                >
                                    {/* 음식 이름, 그램, 칼로리 */}
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Typography variant="body2" fontWeight={500}>
                                            {food.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                            {food.servingSize > 0 && (
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    fontWeight={600}
                                                >
                                                    {food.servingSize}g
                                                </Typography>
                                            )}
                                            <Typography
                                                variant="body2"
                                                color={darkColor}
                                                fontWeight={700}
                                            >
                                                {food.calories} kcal
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {/* 사진: 공통 이미지로 표시된 경우 제외, 수동 추가 음식만 개별 표시 */}
                                    {food.image && !food.aiScanId && !hasSharedImage && (
                                        <Box sx={{ mt: 1 }}>
                                            <Box
                                                component="img"
                                                src={food.image}
                                                alt={`${food.name} 사진`}
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    objectFit: 'cover',
                                                    borderRadius: 1.5,
                                                    border: `2px solid ${color}`,
                                                }}
                                            />
                                        </Box>
                                    )}
                                </Box>
                            ))}
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    pt: 0.5,
                                    pr: 1.5,
                                }}
                            >
                                <Typography variant="body2" fontWeight={700} color={color}>
                                    합계 {totalCal} kcal
                                </Typography>
                            </Box>
                        </Stack>
                    ) : (
                        <Box
                            sx={{
                                bgcolor: '#f8fafc',
                                borderRadius: 2,
                                p: 2,
                                textAlign: 'center',
                                mb: 2,
                            }}
                        >
                            <Typography variant="body2" color="text.disabled">
                                아직 기록된 음식이 없습니다.
                            </Typography>
                        </Box>
                    )}

                    {/* 영양소 */}
                    {data?.nutrients && (
                        <>
                            <Typography
                                variant="body2"
                                fontWeight={700}
                                mb={1.5}
                                color="text.secondary"
                            >
                                영양소
                            </Typography>
                            <Stack spacing={1.2} mb={2}>
                                {nutrientConfig.map((n) => (
                                    <NutrientBar
                                        key={n.key}
                                        label={n.label}
                                        value={data.nutrients[n.key]}
                                        daily={n.daily}
                                        color={n.color}
                                    />
                                ))}
                            </Stack>
                        </>
                    )}

                    {/* 메모 */}
                    <Typography
                        variant="body2"
                        fontWeight={700}
                        mb={1}
                        color="text.secondary"
                    >
                        메모
                    </Typography>
                    {savedMemos.length > 0 ? (
                        <Box
                            sx={{
                                bgcolor: '#f8fafc',
                                borderRadius: 2,
                                p: 1.5,
                                border: '1px solid #e8ecf0',
                            }}
                        >
                            {savedMemos.map((memoText, idx) => (
                                <Box
                                    key={idx}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 1,
                                        py: 0.5,
                                        mt: idx > 0 ? '6px' : 0,
                                        borderBottom:
                                            idx < savedMemos.length - 1
                                                ? '1px dashed #e2e8f0'
                                                : 'none',
                                    }}
                                >
                                    <EditNote
                                        sx={{ fontSize: 18, color: color, mt: '2px', flexShrink: 0 }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        {memoText}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Box
                            sx={{
                                bgcolor: '#f8fafc',
                                borderRadius: 2,
                                p: 2,
                                textAlign: 'center',
                                border: '1px dashed #e2e8f0',
                            }}
                        >
                            <Typography variant="body2" color="text.disabled">
                                저장된 메모가 없습니다.
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Collapse>
        </Paper>
    );
}

// ─── 기록 추가 카드 ───────────────────────────────────────────────────────────
const EMPTY_FOOD = () => ({
    name: '',
    calories: '',
    servingSize: '',  // 1회 제공량 (g)
    foodCode: '',
    nutrients: { carbs: 0, protein: 0, fat: 0, sugar: 0 },
    // 기준값 (API 원본 값, g 변경 시 비율 계산에 사용)
    baseServingSize: 0,
    baseCalories: 0,
    baseNutrients: { carbs: 0, protein: 0, fat: 0, sugar: 0 },
    image: null,      // 미리보기용 base64
    imageFile: null,  // 서버 전송용 File 객체
});

function AddRecordCard({ onRefresh, userId, selectedDate, initialFoodName = '', initialFoodKcal = '' }) { // 외부에서 전달된 초기 음식명
    const [open, setOpen] = useState(false);
    const [selectedMeal, setSelectedMeal] = useState('breakfast');
    const [foods, setFoods] = useState([EMPTY_FOOD()]);
    const [memo, setMemo] = useState('');
    const fileInputRefs = useRef([]);
    const hasAppliedInitialFood = useRef(false); // 초기 음식명 자동 주입을 1회로 제한

    const selectedMealInfo = MEALS.find((m) => m.key === selectedMeal);
    const totalCalories = foods.reduce(
        (sum, f) => sum + (Number(f.calories) || 0),
        0,
    );

    useEffect(() => {
        // 선택한 음식명을 "기록 추가" 첫 번째 입력칸에 최초 1회만 반영
        const trimmedName = initialFoodName.trim();
        if (!trimmedName || hasAppliedInitialFood.current) return;

        // "선택하기"로 넘어온 경우 기록 추가 카드를 자동으로 펼침
        setOpen(true);
        setFoods((prev) => {
            if (!prev.length) return [{ ...EMPTY_FOOD(), name: trimmedName }];
            if (prev[0].name.trim()) return prev;
            return prev.map((food, index) => (index === 0 ? { ...food, name: trimmedName } : food));
        });
        hasAppliedInitialFood.current = true;
    }, [initialFoodName]);

    const handleFoodChange = (index, field, value) => {
        setFoods((prev) =>
            prev.map((f, i) => {
                if (i !== index) return f;

                // servingSize 변경 시 비율에 따라 영양소 재계산
                if (field === 'servingSize' && f.baseServingSize > 0) {
                    const newServingSize = Number(value) || 0;
                    const ratio = newServingSize / f.baseServingSize;
                    return {
                        ...f,
                        servingSize: value,
                        calories: Math.round(f.baseCalories * ratio),
                        nutrients: {
                            carbs: Number((f.baseNutrients.carbs * ratio).toFixed(2)),
                            protein: Number((f.baseNutrients.protein * ratio).toFixed(2)),
                            fat: Number((f.baseNutrients.fat * ratio).toFixed(2)),
                            sugar: Number((f.baseNutrients.sugar * ratio).toFixed(2)),
                        },
                    };
                }

                return { ...f, [field]: value };
            }),
        );
    };

    // 음식 검색에서 선택 시 이름, 칼로리, 영양소, foodCode, servingSize 동시 업데이트
    const handleFoodSelect = (index, name, calories, nutrientsData = null) => {
        setFoods((prev) =>
            prev.map((f, i) => {
                if (i !== index) return f;

                // nutrientsData에서 foodCode, servingSize 추출
                const foodCode = nutrientsData?.foodCode || f.foodCode;
                const servingSize = nutrientsData?.servingSize || 0;
                const nutrients = nutrientsData
                    ? {
                        carbs: nutrientsData.carbs,
                        protein: nutrientsData.protein,
                        fat: nutrientsData.fat,
                        sugar: nutrientsData.sugar,
                    }
                    : f.nutrients;

                return {
                    ...f,
                    name,
                    calories: calories !== '' ? String(calories) : f.calories,
                    servingSize: servingSize !== '' ? String(servingSize) : f.servingSize,
                    foodCode,
                    nutrients,
                    // 기준값 저장 (g 변경 시 비율 계산에 사용)
                    baseServingSize: servingSize,
                    baseCalories: Number(calories) || 0,
                    baseNutrients: { ...nutrients },
                };
            }),
        );
    };

    const handleAddRow = () => setFoods((prev) => [...prev, EMPTY_FOOD()]);

    const handleRemoveRow = (index) => {
        setFoods((prev) => prev.filter((_, i) => i !== index));
    };

    // 이미지 클릭 핸들러
    const handleImageClick = (index) => {
        fileInputRefs.current[index]?.click();
    };

    // 이미지 변경 핸들러
    const handleImageChange = (index, e) => {
        const file = e.target.files?.[0];
        if (file) {
            // 미리보기용 base64
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target.result;
                setFoods((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, image: imageData, imageFile: file } : f)),
                );
            };
            reader.readAsDataURL(file);
        }
    };

    // 이미지 삭제 핸들러
    const handleImageRemove = (index, e) => {
        e.stopPropagation();
        setFoods((prev) =>
            prev.map((f, i) => (i === index ? { ...f, image: null, imageFile: null } : f)),
        );
        if (fileInputRefs.current[index]) {
            fileInputRefs.current[index].value = '';
        }
    };

    const handleCancel = () => {
        setFoods([EMPTY_FOOD()]);
        setMemo('');
        setOpen(false);
    };

    const handleSubmit = async () => {
        const validFoods = foods.filter((f) => f.name.trim() && f.foodCode);
        if (!validFoods.length) {
            alert('음식을 검색하여 선택해주세요.\n(음식 이름을 입력 후 드롭다운에서 선택해야 합니다)');
            return;
        }

        if (!userId) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            // 각 음식별로 API POST 요청 (FormData 방식)
            const results = await Promise.all(
                validFoods.map(async (f) => {
                    const formData = new FormData();
                    formData.append('userId', userId);
                    formData.append('foodCode', f.foodCode);
                    formData.append('foodName', f.name);
                    formData.append('servings', 1);
                    formData.append('mealType', selectedMeal);
                    // 로컬 시간대를 유지한 ISO 문자열 생성 (timezone offset 적용)
                    const mealDate = selectedDate || new Date();
                    const localISOString = new Date(mealDate.getTime() - mealDate.getTimezoneOffset() * 60000).toISOString();
                    formData.append('mealTime', localISOString);
                    // 사용자가 입력한 servingSize, calories, 영양소 전송 (g 변경 시 비율 계산된 값)
                    if (f.servingSize) formData.append('servingSize', f.servingSize);
                    if (f.calories) formData.append('calories', f.calories);
                    if (f.nutrients?.carbs != null) formData.append('carbohydrate', f.nutrients.carbs);
                    if (f.nutrients?.protein != null) formData.append('protein', f.nutrients.protein);
                    if (f.nutrients?.fat != null) formData.append('fat', f.nutrients.fat);
                    if (f.nutrients?.sugar != null) formData.append('sugars', f.nutrients.sugar);
                    if (memo) formData.append('memo', memo);
                    if (f.imageFile) formData.append('image', f.imageFile);

                    const response = await fetch(`${API_BASE_URL}/api/meals`, {
                        method: 'POST',
                        // Content-Type 헤더 생략 (브라우저가 자동 설정)
                        body: formData,
                    });

                    const data = await response.json();
                    // console.log('API 응답:', response.status, data);

                    if (!response.ok) {
                        throw new Error(data.message || `HTTP ${response.status}`);
                    }
                    return data;
                }),
            );

            // console.log('저장 완료:', results);

            // 저장 성공 후 데이터 새로고침
            if (onRefresh) {
                await onRefresh();
            }

            setFoods([EMPTY_FOOD()]);
            setMemo('');
            setOpen(false);
        } catch (error) {
            console.error('식사 기록 저장 실패:', error);
            alert(`저장에 실패했습니다: ${error.message}`);
        }
    };

    return (
        <Paper
            elevation={0}
            sx={{
                border: '1.5px dashed',
                borderColor: open ? '#FF8243' : '#e2e8f0',
                borderRadius: 3,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                mt: 1,
            }}
        >
            {/* 헤더 */}
            <Box
                onClick={() => setOpen((v) => !v)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 2,
                    py: 1.5,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#fff8f5' },
                    transition: 'background 0.2s',
                }}
            >
                <Avatar
                    sx={{ width: 36, height: 36, bgcolor: '#fff3ed', color: '#FF8243' }}
                >
                    <Add sx={{ fontSize: 20 }} />
                </Avatar>
                <Typography fontWeight={600} color="#FF8243">
                    기록 추가
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton size="small">
                    {open ? (
                        <ExpandLess fontSize="small" />
                    ) : (
                        <ExpandMore fontSize="small" />
                    )}
                </IconButton>
            </Box>

            <Collapse in={open}>
                <Divider />
                <Box sx={{ p: 2.5 }}>
                    <Stack spacing={2.5}>
                        {/* 끼니 선택 */}
                        <FormControl size="small" fullWidth>
                            <InputLabel>끼니 선택</InputLabel>
                            <Select
                                value={selectedMeal}
                                label="끼니 선택"
                                onChange={(e) => setSelectedMeal(e.target.value)}
                                sx={{ borderRadius: 2, bgcolor: '#f8fafc' }}
                            >
                                {MEALS.map((m) => (
                                    <MenuItem key={m.key} value={m.key}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <m.Icon sx={{ fontSize: 18, color: m.color }} />
                                            {m.label}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* 음식 목록 입력 행들 */}
                        <Box>
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 1,
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    color="text.secondary"
                                >
                                    음식 목록
                                </Typography>
                                <Typography variant="caption" color="text.disabled">
                                    {foods.length}개 항목
                                </Typography>
                            </Box>

                            <Stack spacing={1.5}>
                                {foods.map((food, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            bgcolor: '#f8fafc',
                                            borderRadius: 2,
                                            p: 1.5,
                                            border: '1px solid #e8ecf0',
                                        }}
                                    >
                                        {/* 상단: 순번, 음식이름, 칼로리, 삭제버튼 */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            {/* 순번 */}
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    bgcolor: selectedMealInfo?.bg,
                                                    color: selectedMealInfo?.darkColor,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    flexShrink: 0,
                                                    fontSize: '0.65rem',
                                                }}
                                            >
                                                {index + 1}
                                            </Typography>

                                            {/* 음식 이름 (검색 자동완성) */}
                                            <FoodSearchInput
                                                value={food.name}
                                                targetCalories={index === 0 ? initialFoodKcal : null}
                                                onChange={(name, calories, nutrients) =>
                                                    handleFoodSelect(index, name, calories, nutrients)
                                                }
                                            />

                                            {/* 1회 제공량 (g) */}
                                            <TextField
                                                size="small"
                                                placeholder="g"
                                                type="number"
                                                value={food.servingSize}
                                                onChange={(e) =>
                                                    handleFoodChange(index, 'servingSize', e.target.value)
                                                }
                                                sx={{
                                                    width: 72,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1.5,
                                                        bgcolor: '#fff',
                                                        fontSize: '0.875rem',
                                                    },
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#e8ecf0',
                                                    },
                                                    '& input': { textAlign: 'right' },
                                                }}
                                            />

                                            {/* 칼로리 */}
                                            <TextField
                                                size="small"
                                                placeholder="kcal"
                                                type="number"
                                                value={food.calories}
                                                onChange={(e) =>
                                                    handleFoodChange(index, 'calories', e.target.value)
                                                }
                                                sx={{
                                                    width: 80,
                                                    '& .MuiOutlinedInput-root': {
                                                        borderRadius: 1.5,
                                                        bgcolor: '#fff',
                                                        fontSize: '0.875rem',
                                                    },
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: '#e8ecf0',
                                                    },
                                                    '& input': { textAlign: 'right' },
                                                }}
                                            />

                                            {/* 삭제 버튼 */}
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveRow(index)}
                                                disabled={foods.length === 1}
                                                sx={{
                                                    color: '#cbd5e1',
                                                    flexShrink: 0,
                                                    '&:hover': { color: '#EF5350', bgcolor: '#fef2f2' },
                                                    '&.Mui-disabled': { opacity: 0.3 },
                                                }}
                                            >
                                                <DeleteOutline fontSize="small" />
                                            </IconButton>
                                        </Box>

                                        {/* 하단: 사진 추가 영역 */}
                                        <Box sx={{ mt: 1, ml: 3.5 }}>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                ref={(el) => (fileInputRefs.current[index] = el)}
                                                onChange={(e) => handleImageChange(index, e)}
                                                style={{ display: 'none' }}
                                            />
                                            {food.image ? (
                                                <Box
                                                    sx={{ position: 'relative', display: 'inline-block' }}
                                                >
                                                    <Box
                                                        component="img"
                                                        src={food.image}
                                                        alt="음식 사진"
                                                        sx={{
                                                            width: 80,
                                                            height: 80,
                                                            objectFit: 'cover',
                                                            borderRadius: 1.5,
                                                            border: '2px solid #e8ecf0',
                                                            cursor: 'pointer',
                                                        }}
                                                        onClick={() => handleImageClick(index)}
                                                    />
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => handleImageRemove(index, e)}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: -8,
                                                            right: -8,
                                                            bgcolor: 'rgba(0,0,0,0.6)',
                                                            color: '#fff',
                                                            width: 20,
                                                            height: 20,
                                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                                                        }}
                                                    >
                                                        <DeleteOutline sx={{ fontSize: 14 }} />
                                                    </IconButton>
                                                </Box>
                                            ) : (
                                                <Box
                                                    onClick={() => handleImageClick(index)}
                                                    sx={{
                                                        width: 80,
                                                        height: 80,
                                                        border: '2px dashed #d0d5dd',
                                                        borderRadius: 1.5,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        transition: '0.2s',
                                                        '&:hover': {
                                                            borderColor: '#FF8243',
                                                            bgcolor: '#fff8f5',
                                                        },
                                                    }}
                                                >
                                                    <AddPhotoAlternate
                                                        sx={{ fontSize: 24, color: '#cbd5e1' }}
                                                    />
                                                    <Typography
                                                        variant="caption"
                                                        color="text.disabled"
                                                        sx={{ fontSize: '0.65rem', mt: 0.3 }}
                                                    >
                                                        사진 추가
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                ))}
                            </Stack>

                            {/* 행 추가 버튼 */}
                            <Button
                                size="small"
                                startIcon={<Add />}
                                onClick={handleAddRow}
                                sx={{
                                    mt: 1,
                                    color: '#FF8243',
                                    fontSize: '0.8rem',
                                    '&:hover': { bgcolor: '#fff3ed' },
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    px: 1.5,
                                }}
                            >
                                음식 추가
                            </Button>
                        </Box>

                        {/* 칼로리 합계 */}
                        {totalCalories > 0 && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    bgcolor: '#fff3ed',
                                    borderRadius: 2,
                                    px: 2,
                                    py: 1.2,
                                    border: '1px solid #ffe0cc',
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    fontWeight={500}
                                >
                                    합계 칼로리
                                </Typography>
                                <Typography fontWeight={800} color="#E05A1F">
                                    {totalCalories.toLocaleString()} kcal
                                </Typography>
                            </Box>
                        )}

                        {/* 메모 입력 */}
                        <Box>
                            <Typography
                                variant="body2"
                                fontWeight={700}
                                mb={1}
                                color="text.secondary"
                            >
                                메모
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                placeholder="식사에 대한 메모를 남겨보세요..."
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <EditNote
                                            sx={{
                                                color: 'text.disabled',
                                                mr: 1,
                                                mt: '2px',
                                                alignSelf: 'flex-start',
                                                fontSize: 20,
                                            }}
                                        />
                                    ),
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        fontSize: '0.875rem',
                                        bgcolor: '#fff',
                                        borderRadius: 2,
                                    },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: '#e8ecf0',
                                    },
                                }}
                            />
                        </Box>

                        {/* 하단 버튼 */}
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={handleCancel}
                                sx={{
                                    borderColor: '#e2e8f0',
                                    color: 'text.secondary',
                                    borderRadius: 2,
                                }}
                            >
                                취소
                            </Button>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={handleSubmit}
                                startIcon={<Add />}
                                sx={{ borderRadius: 2 }}
                            >
                                {foods.filter((f) => f.name.trim()).length}개 저장
                            </Button>
                        </Box>
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ─── 달력 ────────────────────────────────────────────────────────────────────
function CustomCalendar({
    selectedDate,
    onDateSelect,
    currentMonth,
    onMonthChange,
    dayData,
    datesWithData = [],
}) {
    const today = new Date();
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekLabels = ['일', '월', '화', '수', '목', '금', '토'];

    const cells = [
        ...Array(firstDayOfWeek).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    // 선택된 날짜의 총 칼로리 계산
    const selectedDateStr = formatDate(selectedDate);
    const selectedDayCalories = dayData?.summary?.calories || 0;

    return (
        <Box>
            {/* 월 이동 헤더 */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                }}
            >
                <IconButton size="small" onClick={() => onMonthChange(-1)}>
                    <ChevronLeft />
                </IconButton>
                <Typography fontWeight={700} fontSize="1rem">
                    {year}년 {month + 1}월
                </Typography>
                <IconButton
                    size="small"
                    onClick={() => onMonthChange(1)}
                    disabled={year === today.getFullYear() && month >= today.getMonth()}
                >
                    <ChevronRight />
                </IconButton>
            </Box>

            {/* 요일 헤더 */}
            <Box
                sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}
            >
                {weekLabels.map((d, i) => (
                    <Typography
                        key={d}
                        variant="caption"
                        align="center"
                        fontWeight={600}
                        sx={{
                            color:
                                i === 0 ? '#EF5350' : i === 6 ? '#5C6BC0' : 'text.secondary',
                        }}
                    >
                        {d}
                    </Typography>
                ))}
            </Box>

            {/* 날짜 그리드 */}
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: 0.3,
                }}
            >
                {cells.map((day, idx) => {
                    if (!day) return <Box key={idx} />;

                    const thisDate = new Date(year, month, day);
                    const dateStr = formatDate(thisDate);
                    const isToday = isSameDay(thisDate, today);
                    const isSelected = isSameDay(thisDate, selectedDate);
                    const isFuture = thisDate > today;
                    // 해당 날짜에 데이터가 있는지 확인 (월별 API 응답 기준)
                    const hasData = datesWithData.includes(dateStr);
                    const dayOfWeek = thisDate.getDay();

                    return (
                        // <Tooltip
                        //     key={idx}
                        //     title={hasData ? `${selectedDayCalories} kcal` : ''}
                        //     arrow
                        //     placement="top"
                        // >
                        <Box
                            key={idx}
                            onClick={() => !isFuture && onDateSelect(thisDate)}
                            sx={{
                                position: 'relative',
                                aspectRatio: '1',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 2,
                                cursor: isFuture ? 'default' : 'pointer',
                                bgcolor: isSelected
                                    ? '#FF8243'
                                    : isToday
                                        ? '#fff3ed'
                                        : 'transparent',
                                border:
                                    isToday && !isSelected
                                        ? '2px solid #FF8243'
                                        : '2px solid transparent',
                                opacity: isFuture ? 0.3 : 1,
                                transition: 'all 0.15s',
                                '&:hover': !isFuture
                                    ? { bgcolor: isSelected ? '#E05A1F' : '#fff3ed' }
                                    : {},
                            }}
                        >
                            {isToday && isSelected && (
                                <CheckCircle
                                    sx={{
                                        position: 'absolute',
                                        top: 2,
                                        right: 2,
                                        fontSize: 10,
                                        color: '#fff',
                                    }}
                                />
                            )}
                            <Typography
                                variant="caption"
                                fontWeight={isToday || isSelected ? 700 : 400}
                                sx={{
                                    color: isSelected
                                        ? '#fff'
                                        : isToday
                                            ? '#FF8243'
                                            : dayOfWeek === 0
                                                ? '#EF5350'
                                                : dayOfWeek === 6
                                                    ? '#5C6BC0'
                                                    : 'text.primary',
                                    fontSize: '0.8rem',
                                    lineHeight: 1,
                                }}
                            >
                                {day}
                            </Typography>
                            {hasData && (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        bottom: { xs: 4, lg: 10 },
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: 4,
                                        height: 4,
                                        borderRadius: '50%',
                                        bgcolor: isSelected ? 'rgba(255,255,255,0.8)' : '#FF8243',
                                    }}
                                />
                            )}
                        </Box>
                        // </Tooltip>
                    );
                })}
            </Box>
        </Box>
    );
}

// ─── 영양 목표 요약 카드 (선택한 날짜 기준, 섭취량/목표 바 형태) ─────────────────
function NutritionGoalsCard({ selectedDate, data }) {
    const [goals, setGoals] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        async function fetchGoals() {
            setLoading(true);
            try {
                const dateStr = formatDate(selectedDate);
                const res = await getNutritionGoals(dateStr);
                if (cancelled) return;
                setGoals(res?.data ?? null);
            } catch {
                if (!cancelled) setGoals(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchGoals();
        return () => { cancelled = true; };
    }, [selectedDate]);

    const summary = data?.summary ?? {};
    const items = goals
        ? [
              { label: '칼로리', current: Number(summary.calories) || 0, goal: Number(goals.targetCalories) || 1, unit: 'kcal', color: '#FF8243' },
              { label: '탄수화물', current: Number(summary.carbs) || 0, goal: Number(goals.targetCarbohydrate) || 1, unit: 'g', color: '#FFA726' },
              { label: '단백질', current: Number(summary.protein) || 0, goal: Number(goals.targetProtein) || 1, unit: 'g', color: '#66BB6A' },
              { label: '지방', current: Number(summary.fat) || 0, goal: Number(goals.targetFat) || 1, unit: 'g', color: '#EF5350' },
              { label: '당류', current: Number(summary.sugar) || 0, goal: Number(goals.targetSugars) || 1, unit: 'g', color: '#AB47BC' },
          ]
        : [];

    return (
        <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px dashed #e2e8f0' }}>
            <Typography variant="body2" fontWeight={700} color="text.secondary" mb={1.5}>
                🎯 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 영양 목표
            </Typography>
            {loading ? (
                <Typography variant="caption" color="text.secondary">불러오는 중...</Typography>
            ) : items.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {items.map(({ label, current, goal, unit, color }) => {
                        const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
                        const valueText = unit === 'kcal'
                            ? `${Math.round(current)} / ${Math.round(goal)} ${unit}`
                            : `${Number(current).toFixed(1)} / ${Number(goal).toFixed(1)} ${unit}`;
                        return (
                            <Box key={label}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                                        {label}
                                    </Typography>
                                    <Typography variant="caption" fontWeight={700} sx={{ color }}>
                                        {valueText}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={pct}
                                    sx={{
                                        height: 6,
                                        borderRadius: 4,
                                        bgcolor: '#f1f5f9',
                                        '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 },
                                    }}
                                />
                            </Box>
                        );
                    })}
                </Box>
            ) : (
                <Typography variant="caption" color="text.secondary">목표 데이터가 없습니다.</Typography>
            )}
        </Box>
    );
}

// ─── 영양 요약 (이전 날짜 선택 시 표시) ─────────────────────────────────────
function NutritionSummaryPanel({ date, data }) {
    const today = new Date();
    const isPast = !isSameDay(date, today);
    if (!isPast || !data) return null;

    const { calories, carbs, protein, fat, sugar } = data.summary;

    return (
        <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px dashed #e2e8f0' }}>
            <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
                mb={1.5}
            >
                📊 {date.getMonth() + 1}월 {date.getDate()}일 요약
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 1,
                }}
            >
                {[
                    {
                        label: '칼로리',
                        value: `${calories} kcal`,
                        color: '#FF8243',
                        bg: '#fff3ed',
                    },
                    {
                        label: '탄수화물',
                        value: `${carbs}g`,
                        color: '#FFA726',
                        bg: '#fff8f0',
                    },
                    {
                        label: '단백질',
                        value: `${protein}g`,
                        color: '#66BB6A',
                        bg: '#f0faf0',
                    },
                    { label: '지방', value: `${fat}g`, color: '#EF5350', bg: '#fff0f0' },
                    {
                        label: '당류',
                        value: `${sugar}g`,
                        color: '#AB47BC',
                        bg: '#faf0ff',
                    },
                ].map((item) => (
                    <Box
                        key={item.label}
                        sx={{
                            bgcolor: item.bg,
                            borderRadius: 2,
                            p: 1.2,
                            textAlign: 'center',
                        }}
                    >
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                        >
                            {item.label}
                        </Typography>
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: item.color }}
                        >
                            {item.value}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function DailyLogPage() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const location = useLocation(); // navigate(..., { state })로 넘어온 데이터
    const prefilledFoodName = location.state?.food?.name || ''; // 추천 카드에서 선택한 음식명
    const prefilledFoodKcal = location.state?.food?.kcal || location.state?.food?.calories || ''; // 추천 카드에서 선택한 칼로리

    // 사용자 프로필 기반 식사별 동적 영양소 권장량 계산
    const mealTargets = useMemo(() => calculateMealTargets(profile), [profile]);

    // 식사 종류별 영양소 설정 생성 함수
    const getNutrientConfig = (mealKey) => {
        const targets = mealTargets[mealKey] || mealTargets.breakfast;
        return [
            { key: 'carbs', label: '탄수화물', color: '#FFA726', daily: targets.carbs },
            { key: 'protein', label: '단백질', color: '#66BB6A', daily: targets.protein },
            { key: 'fat', label: '지방', color: '#EF5350', daily: targets.fat },
            { key: 'sugar', label: '당류', color: '#AB47BC', daily: targets.sugar },
        ];
    };

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(today);
    const [currentMonth, setCurrentMonth] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1),
    );
    const [dayData, setDayData] = useState(null);
    const [datesWithData, setDatesWithData] = useState([]); // 해당 월에 데이터 있는 날짜 목록
    const [isLoading, setIsLoading] = useState(false);

    // 월별 데이터 있는 날짜 목록 불러오기
    const fetchMonthlyDates = async (year, month, userId) => {
        if (!userId) return;
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/diary/monthly?userId=${userId}&year=${year}&month=${month + 1}`,
            );
            if (response.ok) {
                const data = await response.json();
                setDatesWithData(data.dates || []);
            }
        } catch (error) {
            console.error('월별 데이터 조회 실패:', error);
        }
    };

    // API에서 날짜별 식사 데이터 불러오기
    const fetchDailyData = async (date, userId) => {
        if (!userId) return;

        setIsLoading(true);
        try {
            const dateStr = formatDate(date);
            const response = await fetch(
                `${API_BASE_URL}/api/diary/daily?userId=${userId}&date=${dateStr}`,
            );
            if (response.ok) {
                const data = await response.json();
                const transformed = transformApiResponse(data);
                setDayData(transformed);
            } else {
                console.error('식사 기록 조회 실패:', response.status);
                setDayData(null);
            }
        } catch (error) {
            console.error('식사 기록 조회 실패:', error);
            setDayData(null);
        } finally {
            setIsLoading(false);
        }
    };

    // 페이지 로드 시 오늘 날짜 데이터 불러오기
    useEffect(() => {
        if (user?.id) {
            fetchDailyData(today, user.id);
            fetchMonthlyDates(today.getFullYear(), today.getMonth(), user.id);
        }
    }, [user?.id]);

    // 월 변경 시 해당 월의 데이터 있는 날짜 목록 조회
    useEffect(() => {
        if (user?.id) {
            fetchMonthlyDates(currentMonth.getFullYear(), currentMonth.getMonth(), user.id);
        }
    }, [currentMonth, user?.id]);

    const handleMonthChange = (delta) => {
        setCurrentMonth(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
        );
    };

    const handleDateSelect = async (date) => {
        setSelectedDate(date);
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));

        // 해당 날짜의 식사 기록 조회
        if (user?.id) {
            await fetchDailyData(date, user.id);
        }
    };

    // 저장 후 데이터 새로고침
    const handleRefreshData = async () => {
        // console.log('handleRefreshData 호출됨, user:', user, 'selectedDate:', selectedDate);
        if (user?.id) {
            await fetchDailyData(selectedDate, user.id);
        }
    };

    const dateStr = formatDate(selectedDate);
    const isToday = isSameDay(selectedDate, today);

    const totalCalories = dayData
        ? MEALS.reduce((sum, m) => sum + getMealTotalCalories(dayData[m.key]), 0)
        : 0;

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
            {/* 상단 네비 */}
            <Box
                sx={{
                    bgcolor: '#fff',
                    borderBottom: '1px solid #e8ecf0',
                    px: { xs: 2, md: 4 },
                    py: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    position: 'sticky',
                    top: 0,
                    zIndex: 100,
                }}
            >
                <Box>
                    <Typography fontWeight={800} fontSize="1.1rem" lineHeight={1.2}>
                        일일 식단 기록
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Daily Log
                    </Typography>
                </Box>
                <Box sx={{ flexGrow: 1 }} />
                {isToday && totalCalories > 0 && (
                    <Chip
                        icon={
                            <LocalFireDepartment
                                sx={{
                                    fontSize: '16px !important',
                                    color: '#FF8243 !important',
                                }}
                            />
                        }
                        label={`오늘 ${totalCalories} kcal`}
                        size="small"
                        sx={{ bgcolor: '#fff3ed', color: '#E05A1F', fontWeight: 700 }}
                    />
                )}
            </Box>

            {/* 본문 */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 3,
                    p: { xs: 2, md: 3 },
                    maxWidth: 1280,
                    mx: 'auto',
                    alignItems: 'flex-start',
                    flexDirection: { xs: 'column', md: 'row' },
                }}
            >
                {/* ── 왼쪽: 달력 패널 ── */}
                <Box sx={{ width: { xs: '100%', md: 400, lg: 500 }, flexShrink: 0 }}>
                    <Paper
                        elevation={0}
                        sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e8ecf0' }}
                    >
                        <CustomCalendar
                            selectedDate={selectedDate}
                            onDateSelect={handleDateSelect}
                            currentMonth={currentMonth}
                            onMonthChange={handleMonthChange}
                            dayData={dayData}
                            datesWithData={datesWithData}
                        />
                        <NutritionGoalsCard selectedDate={selectedDate} data={dayData} />
                        <NutritionSummaryPanel date={selectedDate} data={dayData} />
                    </Paper>
                </Box>

                {/* ── 오른쪽: 타임라인 ── */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    {/* 날짜 헤더 */}
                    <Box
                        sx={{ mb: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                        <Box>
                            <Typography component="div" fontWeight={800} fontSize="1.2rem">
                                {getKoreanDate(selectedDate)}
                                {isToday && (
                                    <Chip
                                        label="오늘"
                                        size="small"
                                        sx={{
                                            ml: 1,
                                            bgcolor: '#FF8243',
                                            color: '#fff',
                                            fontWeight: 700,
                                            fontSize: '0.7rem',
                                        }}
                                    />
                                )}
                            </Typography>
                            {totalCalories > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    총 섭취 칼로리:{' '}
                                    <Typography component="span" fontWeight={700} color="#FF8243">
                                        {totalCalories} kcal
                                    </Typography>
                                </Typography>
                            )}
                        </Box>
                    </Box>

                    {/* 타임라인 */}
                    <Stack spacing={0}>
                        {MEALS.map((meal, index) => (
                            <Box key={meal.key} sx={{ display: 'flex', gap: 2 }}>
                                {/* 타임라인 인디케이터 */}
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        width: 20,
                                        flexShrink: 0,
                                        mt: 2,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 12,
                                            height: 12,
                                            borderRadius: '50%',
                                            bgcolor: dayData?.[meal.key]?.foods?.length
                                                ? meal.color
                                                : '#e2e8f0',
                                            border: `2px solid ${meal.color}`,
                                            zIndex: 1,
                                            flexShrink: 0,
                                        }}
                                    />
                                    {index < MEALS.length - 1 && (
                                        <Box
                                            sx={{
                                                width: 2,
                                                flexGrow: 1,
                                                bgcolor: '#e8ecf0',
                                                my: 0.5,
                                                minHeight: 24,
                                            }}
                                        />
                                    )}
                                </Box>

                                {/* 식사 카드 */}
                                <Box
                                    sx={{ flexGrow: 1, pb: index < MEALS.length - 1 ? 1.5 : 0 }}
                                >
                                    <MealCard
                                        meal={meal}
                                        data={dayData?.[meal.key]}
                                        isToday={isToday}
                                        dateStr={dateStr}
                                        nutrientConfig={getNutrientConfig(meal.key)}
                                    />
                                </Box>
                            </Box>
                        ))}

                        {/* 기록 추가 영역 */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 1.5 }}>
                            <Box sx={{ width: 20, flexShrink: 0 }} />
                            <Box sx={{ flexGrow: 1 }}>
                                <AddRecordCard
                                    onRefresh={handleRefreshData}
                                    userId={user?.id}
                                    selectedDate={selectedDate}
                                    initialFoodName={prefilledFoodName} // AddRecordCard 초기 음식명 전달
                                    initialFoodKcal={prefilledFoodKcal}
                                />
                            </Box>
                        </Box>
                    </Stack>
                </Box>
            </Box>
        </Box>
    );
}
