import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  Camera,
  ChevronRight,
  PieChart,
  Info,
  RefreshCw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { analyzeFoodImage, reanalyzeFood, saveAiScan } from '../../api/scan';
import { saveScanToDiary } from '../../api/diary';
import { useAuth } from '../../contexts/AuthContext';
import {
  calculateNutritionScore,
  buildUserForScore,
} from '../common/calculateNutritionScore';
import { generateFeedback } from '../common/generateFeedback';

const App = () => {
  const { user } = useAuth();
  const [step, setStep] = useState('upload'); // upload, scanning, result
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [editableFoods, setEditableFoods] = useState([]); // { name, amount } 편집 중
  const [appliedFoods, setAppliedFoods] = useState([]); // '다시 분석하기'로 적용된 값
  const [isReanalyzing, setIsReanalyzing] = useState(false); // AI 재분석 로딩
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageRect, setImageRect] = useState(null); // { left, top, width, height } px, 컨테이너 기준
  const [mealType, setMealType] = useState('breakfast');
  const [isSaving, setIsSaving] = useState(false);
  const [aiScanId, setAiScanId] = useState(null); // ai_scans 저장 후 id (기록하기 시 사용)
  const fileInputRef = useRef(null);
  const imgContainerRef = useRef(null);
  const imgRef = useRef(null);
  const navigate = useNavigate();

  const measureImage = useCallback(() => {
    if (!imgContainerRef.current || !imgRef.current || step !== 'result')
      return;
    const containerRect = imgContainerRef.current.getBoundingClientRect();
    const imgElRect = imgRef.current.getBoundingClientRect();
    setImageRect({
      left: imgElRect.left - containerRect.left,
      top: imgElRect.top - containerRect.top,
      width: imgElRect.width,
      height: imgElRect.height,
    });
  }, [step]);

  useEffect(() => {
    if (step !== 'result' || !analysis?.rawFoods?.some((f) => f.bbox)) return;
    measureImage();
    const ro = new ResizeObserver(measureImage);
    if (imgContainerRef.current) ro.observe(imgContainerRef.current);
    window.addEventListener('resize', measureImage);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measureImage);
    };
  }, [step, analysis?.rawFoods, measureImage]);

  useEffect(() => {
    if (analysis?.rawFoods?.length) {
      const initial = analysis.rawFoods.map((f) => ({
        name: String(f.name ?? '').trim(),
        amount: Number(f.amount) || 0,
      }));
      setEditableFoods(initial);
      setAppliedFoods(initial);
    }
  }, [analysis?.rawFoods]);

  const updateFoodName = (index, newName) => {
    setEditableFoods((prev) => {
      const next = [...prev];
      if (next[index])
        next[index] = {
          ...next[index],
          name: String(newName ?? '').trim(),
        };
      return next;
    });
  };

  const updateFoodAmount = (index, value) => {
    setEditableFoods((prev) => {
      const next = [...prev];
      if (next[index])
        next[index] = {
          ...next[index],
          amount: Math.max(0, Number(value) || 0),
        };
      return next;
    });
  };

  const addFoodRow = () => {
    setEditableFoods((prev) => [...prev, { name: '', amount: 0 }]);
  };

  const removeFoodRow = (index) => {
    setEditableFoods((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReanalyze = async () => {
    const payload = editableFoods.map((f) => ({
      name: f.name,
      amount: Number(f.amount) || 0,
    }));
    if (payload.length === 0) return;

    setIsReanalyzing(true);
    setError(null);
    try {
      const res = await reanalyzeFood(payload);
      const { foods, totalCalories } = res;
      const protein = foods.reduce((s, f) => s + (Number(f.protein) || 0), 0);
      const fat = foods.reduce((s, f) => s + (Number(f.fat) || 0), 0);
      const carbs = foods.reduce(
        (s, f) => s + (Number(f.carbohydrate) || 0),
        0,
      );
      const sugar = foods.reduce((s, f) => s + (Number(f.sugars) || 0), 0);

      const mergedFoods = foods.map((f, i) => ({
        ...f,
        name: payload[i]?.name ?? f.name,
        amount: payload[i]?.amount ?? f.amount,
      }));

      setAnalysis((prev) => ({
        ...prev,
        rawFoods: mergedFoods,
        calories: totalCalories,
        macros: { protein, fat, carbs, sugar },
      }));
      setAppliedFoods(payload);

      // ai_scans 테이블에 재분석 결과 저장 (user 로그인 시, uploads 폴더에 이미지 저장)
      if (user?.id && selectedFile) {
        try {
          const saveRes = await saveAiScan({
            userId: user.id,
            imageFile: selectedFile,
            scanResult: {
              foods: mergedFoods,
              totalCalories,
              macros: { protein, fat, carbs, sugar },
            },
          });
          const scanId = saveRes?.data?.ai_scan_id || saveRes?.ai_scan_id;
          if (scanId) {
            setAiScanId(scanId);
          }
        } catch (saveErr) {
          console.warn('ai_scans 재분석 저장 실패:', saveErr);
        }
      }
    } catch (err) {
      setError(err.message || '재분석 중 오류가 발생했습니다.');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const computedTotals = (() => {
    if (!analysis?.rawFoods?.length || !appliedFoods.length) return null;
    let calories = 0,
      carbs = 0,
      sugar = 0,
      protein = 0,
      fat = 0;
    analysis.rawFoods.forEach((raw, i) => {
      const applied = appliedFoods[i];
      if (!applied) return;
      const baseAmount = raw.amount || 1;
      const ratio = (applied.amount || 0) / baseAmount;
      calories += (Number(raw.calories) || 0) * ratio;
      carbs += (Number(raw.carbohydrate) || 0) * ratio;
      sugar += (Number(raw.sugars) || 0) * ratio;
      protein += (Number(raw.protein) || 0) * ratio;
      fat += (Number(raw.fat) || 0) * ratio;
    });
    return { calories: Math.round(calories), carbs, sugar, protein, fat };
  })();

  const scoreAndFeedback = useMemo(() => {
    const totals =
      computedTotals ??
      (analysis
        ? {
          calories: analysis.calories,
          carbs: analysis.macros?.carbs ?? 0,
          sugar: analysis.macros?.sugar ?? 0,
          protein: analysis.macros?.protein ?? 0,
          fat: analysis.macros?.fat ?? 0,
        }
        : null);
    if (!totals) return null;
    const userForScore = buildUserForScore(user);
    const scoreResult = calculateNutritionScore(userForScore, totals);
    scoreResult.meal = totals;
    const feedback = generateFeedback(scoreResult);
    return { score: scoreResult.totalScore, feedback };
  }, [computedTotals, analysis, user, appliedFoods]);

  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = reader.result;
      setSelectedImage(imageData);
      startScanning(file, imageData);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const startScanning = async (file, imageData) => {
    setStep('scanning');
    try {
      const res = await analyzeFoodImage(file);
      const { foods, totalCalories } = res;
      const protein = foods.reduce((s, f) => s + (Number(f.protein) || 0), 0);
      const fat = foods.reduce((s, f) => s + (Number(f.fat) || 0), 0);
      const carbs = foods.reduce(
        (s, f) => s + (Number(f.carbohydrate) || 0),
        0,
      );
      const sugar = foods.reduce((s, f) => s + (Number(f.sugars) || 0), 0);
      const analysisData = {
        foodName: foods.map((f) => f.name).join(', ') || '분석된 음식',
        calories: totalCalories,
        macros: { protein, fat, carbs, sugar },
        score: 85,
        tips:
          foods.length > 1
            ? `총 ${foods.length}종의 음식이 분석되었습니다.`
            : '영양 균형을 위해 다양한 식재료를 곁들이면 좋습니다.',
        rawFoods: foods,
      };
      setAnalysis(analysisData);

      // ai_scans 테이블에 저장 (user 로그인 시, uploads 폴더에 이미지 저장)
      if (user?.id && file) {
        try {
          const saveRes = await saveAiScan({
            userId: user.id,
            imageFile: file,
            scanResult: { foods, totalCalories, macros: { protein, fat, carbs, sugar } },
          });
          const scanId = saveRes?.data?.ai_scan_id || saveRes?.ai_scan_id;
          if (scanId) {
            setAiScanId(scanId);
          }
        } catch (saveErr) {
          console.warn('ai_scans 저장 실패:', saveErr);
          setAiScanId(null);
        }
      }
    } catch (err) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
      setStep('upload');
      setSelectedImage(null);
      setSelectedFile(null);
      return;
    }
    setStep('result');
  };

  const resetScanner = () => {
    setSelectedImage(null);
    setSelectedFile(null);
    setAnalysis(null);
    setEditableFoods([]);
    setAppliedFoods([]);
    setAiScanId(null);
    setError(null);
    setStep('upload');
  };

  return (
    <div className=" w-full bg-[#F2F9F5] flex flex-col items-center font-sans text-[#1E2923]">
      <header className="w-full max-w-lg mb-3">
        <div className="relative bg-linear-to-br from-white via-orange-50/30 to-white rounded-3xl p-5 shadow-lg border border-orange-100/50 overflow-hidden">
          {/* 배경 장식 */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-linear-to-br from-[#FF8243]/20 to-transparent rounded-full blur-2xl" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-linear-to-tr from-orange-200/30 to-transparent rounded-full blur-xl" />

          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 bg-linear-to-br from-[#FF8243] to-[#F97316] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-300/40 ring-4 ring-white">
              <PieChart size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#1E2923] tracking-tight">
                AI 식단 분석
              </h1>
              <p className="text-sm text-[#64748b] mt-0.5 font-medium">
                식사 사진으로 영양 성분을 즉시 확인하세요
              </p>
            </div>
          </div>
        </div>
      </header>

      <main
        className={`w-full flex-1 flex flex-col justify-center ${step === 'result' ? 'max-w-7xl p-3' : 'max-w-lg p-3'}`}
      >
        {/* 에러 표시 */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div
              onClick={() => fileInputRef.current.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`aspect-square bg-white border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center gap-6 cursor-pointer transition-all group shadow-sm ${isDragOver
                  ? 'border-[#FF8243] bg-orange-50/50 scale-[1.02]'
                  : 'border-slate-300 hover:border-[#FF8243] hover:bg-orange-50/30'
                }`}
            >
              <div className="w-20 h-20 bg-[#F2F9F5] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                <Camera
                  className="text-[#1E2923] group-hover:text-[#FF8243]"
                  size={40}
                />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-[#1E2923]">
                  식사 사진 촬영 또는 업로드
                </p>
                <p className="text-sm text-[#1E2923] mt-2 opacity-70">
                  오늘 무엇을 드셨나요?
                </p>
                <p className="text-xs text-[#1E2923] mt-1 opacity-50">
                  또는 여기에 사진을 드래그하여 업로드
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="bg-[#FF8243] p-5 rounded-3xl flex gap-4 items-center shadow-md">
              <Info className="text-white shrink-0" size={24} />
              <p className="text-[0.95rem] text-white font-medium leading-relaxed">
                AI가 사진 속 음식의 이름과 무게를 분석하여 식단의
                <br />
                칼로리와 탄수화물, 단백질, 지방, 당류를 자동으로 계산합니다.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Scanning */}
        {step === 'scanning' && (
          <div className="relative w-full aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <img
              src={selectedImage}
              className="w-full h-full object-cover filter brightness-50"
              alt="Scanning"
            />
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FF8243] shadow-[0_0_20px_#FF8243] animate-[scan_2s_ease-in-out_infinite]"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white backdrop-blur-[1px]">
              <div className="bg-white/20 p-5 rounded-full backdrop-blur-md mb-6 border border-white/30">
                <Loader2 size={44} className="animate-spin" />
              </div>
              <h3 className="text-2xl font-bold mb-2">이미지 분석 중...</h3>
              <p className="text-base opacity-80 font-light">
                메뉴와 영양 정보를 구성하고 있습니다
              </p>
            </div>
            <style>{`
              @keyframes scan {
                0% { top: 0%; opacity: 0.3; }
                50% { top: 100%; opacity: 1; }
                100% { top: 0%; opacity: 0.3; }
              }
            `}</style>
          </div>
        )}

        {/* Step 3: Result */}
        {step === 'result' && analysis && (
          <div className="flex items-stretch gap-5 p-1">
            {/* 사진 박스 - 원본 비율 유지, 가로로 넓게 */}
            <div
              ref={imgContainerRef}
              className="flex-[2.5] min-w-0 rounded-3xl ring-4 ring-orange-50 relative bg-slate-100 flex items-center justify-center overflow-hidden"
            >
              <img
                ref={imgRef}
                src={selectedImage}
                className="object-contain rounded-3xl w-full h-full"
                alt="Food"
                onLoad={measureImage}
              />
              {/* 분석한 음식에 박스 영역 표시 - 픽셀 좌표, 이미지 영역 내로 클램프 */}
              {analysis.rawFoods?.some((f) => f.bbox) && imageRect && (
                <div className="absolute inset-0 pointer-events-none">
                  {analysis.rawFoods.map((food, i) => {
                    if (!food.bbox) return null;
                    const x = (food.bbox.x ?? food.bbox.left ?? 0) / 100;
                    const y = (food.bbox.y ?? food.bbox.top ?? 0) / 100;
                    const w = (food.bbox.w ?? food.bbox.width ?? 10) / 100;
                    const h = (food.bbox.h ?? food.bbox.height ?? 10) / 100;
                    let left = imageRect.left + x * imageRect.width;
                    let top = imageRect.top + y * imageRect.height;
                    let width = w * imageRect.width;
                    let height = h * imageRect.height;
                    left = Math.max(
                      imageRect.left,
                      Math.min(left, imageRect.left + imageRect.width - 4),
                    );
                    top = Math.max(
                      imageRect.top,
                      Math.min(top, imageRect.top + imageRect.height - 4),
                    );
                    width = Math.min(
                      width,
                      imageRect.left + imageRect.width - left,
                    );
                    height = Math.min(
                      height,
                      imageRect.top + imageRect.height - top,
                    );
                    if (width < 2 || height < 2) return null;
                    return (
                      <div
                        key={i}
                        className="absolute border-2 border-yellow-400 bg-yellow-400/20"
                        style={{
                          left: `${left}px`,
                          top: `${top}px`,
                          width: `${width}px`,
                          height: `${height}px`,
                        }}
                      >
                        <span className="absolute -top-6 left-0 text-xs font-bold text-yellow-900 bg-yellow-200/95 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {appliedFoods[i]?.name || food.name || '음식'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {/* 결과 박스 */}
            <div className="flex-[1.5] min-w-0 space-y-5 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 relative">
                <div className="absolute -top-3 -right-3">
                  <div className="w-16 h-16 bg-[#FF8243] rounded-full flex flex-col items-center justify-center text-white shadow-lg border-4 border-white">
                    <span className="text-[10px] font-bold uppercase">
                      Score
                    </span>
                    <span className="font-black text-xl">
                      {scoreAndFeedback?.score ?? analysis.score ?? 85}
                    </span>
                  </div>
                </div>

                {/* 음식별 분석 기준 표 (이름·g 수정 가능) */}
                {editableFoods.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-bold text-[#1E2923]/60 uppercase mb-2">
                      분석 기준 (음식량)
                    </p>
                    <div className="rounded-3xl border border-emerald-100/80 bg-white/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#F2F9F5]/80">
                            <th className="text-left py-2.5 px-3 font-bold text-[#1E2923]">
                              음식 이름
                            </th>
                            <th className="text-right py-2 px-4 font-bold text-[#1E2923] w-24">
                              g
                            </th>
                            <th className="w-24"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {editableFoods.map((food, i) => (
                            <tr
                              key={i}
                              className="border-t border-emerald-100/60"
                            >
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={food.name}
                                  onChange={(e) =>
                                    updateFoodName(i, e.target.value)
                                  }
                                  className="w-full bg-transparent border-b border-transparent hover:border-[#1E2923]/20 focus:border-[#FF8243] focus:outline-none py-1 text-[#1E2923] font-medium"
                                />
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  <input
                                    type="number"
                                    min={0}
                                    value={food.amount || ''}
                                    onChange={(e) =>
                                      updateFoodAmount(i, e.target.value)
                                    }
                                    placeholder="0"
                                    className="w-14 text-right bg-transparent border-b border-transparent hover:border-[#1E2923]/20 focus:border-[#FF8243] focus:outline-none py-1 text-[#1E2923] font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="text-[#1E2923]/70 font-medium text-sm">
                                    g
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeFoodRow(i)}
                                  className="w-7 h-7 flex items-center justify-center text-[#1E2923]/50 hover:text-red-500 hover:bg-red-50/80 rounded-lg transition-colors text-lg leading-none"
                                >
                                  −
                                </button>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t border-emerald-100/60">
                            <td colSpan={3} className="py-2 px-3">
                              <button
                                type="button"
                                onClick={addFoodRow}
                                className="w-full py-2 text-sm font-medium text-[#1E2923]/70 hover:text-[#FF8243] hover:bg-emerald-50/50 rounded-lg transition-colors"
                              >
                                + 행 추가
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <button
                      type="button"
                      onClick={handleReanalyze}
                      disabled={isReanalyzing}
                      className="w-full mt-3 py-2.5 rounded-xl bg-[#FF8243] text-white font-bold text-sm hover:bg-[#E05A1F] transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isReanalyzing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          AI 재분석 중...
                        </>
                      ) : (
                        '다시 분석하기'
                      )}
                    </button>
                  </div>
                )}

                {/* 칼로리, 영양소 총합 */}
                {(() => {
                  const totals = computedTotals ?? {
                    calories: analysis.calories,
                    carbs: analysis.macros.carbs,
                    sugar: analysis.macros.sugar,
                    protein: analysis.macros.protein,
                    fat: analysis.macros.fat,
                  };
                  return (
                    <>
                      <div className="flex items-center gap-5 mb-1">
                        <p className="text-xl font-bold text-[#FF8243]">
                          {totals.calories}{' '}
                          <span className="text-sm font-medium text-[#1E2923]/60">
                            kcal
                          </span>
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        {[
                          {
                            label: '탄수화물 / 당류',
                            val: `${Math.round(totals.carbs * 10) / 10}g / ${Math.round(totals.sugar * 10) / 10}g`,
                          },
                          {
                            label: '단백질',
                            val: `${Math.round(totals.protein * 10) / 10}g`,
                          },
                          {
                            label: '지방',
                            val: `${Math.round(totals.fat * 10) / 10}g`,
                          },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="bg-[#F2F9F5] rounded-2xl py-4 px-2 text-center border border-emerald-100/50"
                          >
                            <p className="text-[10px] text-[#1E2923]/60 font-black mb-1 uppercase">
                              {item.label}
                            </p>
                            <p className="font-bold text-[0.95rem]">
                              {item.val}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-bold">
                          <span>영양 밸런스</span>
                          <span className="text-[#FF8243]">
                            {scoreAndFeedback?.score ?? analysis.score ?? 85}%
                          </span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FF8243] rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,130,67,0.4)]"
                            style={{
                              width: `${Math.min(100, scoreAndFeedback?.score ?? analysis.score ?? 85)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="bg-[#1E2923] rounded-3xl p-4 text-white shadow-lg relative">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 size={22} className="text-[#FF8243]" />
                  <h3 className="font-bold text-lg">영양 피드백</h3>
                </div>
                {scoreAndFeedback?.feedback ? (
                  <div className="space-y-2">
                    <p className="text-[1rem] leading-relaxed opacity-90 font-medium">
                      {scoreAndFeedback.feedback.title}
                    </p>
                    {scoreAndFeedback.feedback.details?.length > 0 && (
                      <ul className="list-disc list-inside text-sm opacity-90 space-y-1">
                        {scoreAndFeedback.feedback.details.map((line, i) => (
                          <li
                            key={i}
                            dangerouslySetInnerHTML={{
                              __html: line.replace(
                                /\*\*(.*?)\*\*/g,
                                '<strong>$1</strong>',
                              ),
                            }}
                          />
                        ))}
                      </ul>
                    )}
                    <p className="text-sm opacity-80 pt-1">
                      {scoreAndFeedback.feedback.tip}
                    </p>
                  </div>
                ) : (
                  <p className="text-[1rem] leading-relaxed opacity-90 font-medium">
                    {analysis.tips}
                  </p>
                )}
              </div>

              {/* 식사 구분 (아침/점심/저녁/간식 선택) */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100">
                <p className="text-xs font-bold text-[#1E2923]/60 uppercase mb-3">
                  식사 구분
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'breakfast', label: '아침' },
                    { value: 'lunch', label: '점심' },
                    { value: 'dinner', label: '저녁' },
                    { value: 'snack', label: '간식' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMealType(opt.value)}
                      className={`py-3 px-3 rounded-xl font-bold text-sm transition-all ${mealType === opt.value
                          ? 'bg-[#FF8243] text-white shadow-md ring-2 ring-[#FF8243]/40'
                          : 'bg-slate-100 text-[#1E2923]/70 hover:bg-slate-200'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={resetScanner}
                  className="bg-white border-2 border-[#1E2923] text-[#1E2923] py-5 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                >
                  <RefreshCw size={20} /> 다시 찍기
                </button>
                <button
                  disabled={isSaving || !user?.id}
                  onClick={async () => {
                    if (!user?.id) return;
                    const totals = computedTotals ?? {
                      calories: analysis.calories,
                      carbs: analysis.macros?.carbs ?? 0,
                      sugar: analysis.macros?.sugar ?? 0,
                      protein: analysis.macros?.protein ?? 0,
                      fat: analysis.macros?.fat ?? 0,
                    };
                    const foods = (analysis.rawFoods || []).map((raw, i) => {
                      const applied = appliedFoods[i];
                      const baseAmount = raw.amount || 1;
                      const amount = applied?.amount ?? raw.amount ?? 0;
                      const ratio = baseAmount > 0 ? amount / baseAmount : 1;
                      return {
                        name: applied?.name ?? raw.name ?? '음식',
                        amount: Number(amount) || 0,
                        calories: Math.round((Number(raw.calories) || 0) * ratio),
                        carbohydrate: (Number(raw.carbohydrate) || 0) * ratio,
                        protein: (Number(raw.protein) || 0) * ratio,
                        fat: (Number(raw.fat) || 0) * ratio,
                        sugars: (Number(raw.sugars) || 0) * ratio,
                      };
                    });
                    if (foods.length === 0) {
                      setError('저장할 음식이 없습니다.');
                      return;
                    }
                    setIsSaving(true);
                    setError(null);
                    try {
                      await saveScanToDiary({
                        userId: user.id,
                        mealType,
                        mealTime: new Date().toISOString(),
                        aiScanId: aiScanId || null,
                        imageFile: aiScanId ? null : selectedFile,
                        foods,
                      });
                      navigate('/home/dailyLog');
                    } catch (err) {
                      setError(err.message || '저장 중 오류가 발생했습니다.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="bg-[#1E2923] text-white py-5 rounded-3xl font-bold flex items-center justify-center gap-2 hover:bg-[#2a3a31] transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      기록하기 <ChevronRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-[#1E2923]/40 text-sm font-medium tracking-tight">
        Powered by Advanced AI Recognition
      </footer>
    </div>
  );
};

export default App;
