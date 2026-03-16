import React, { useState } from 'react';

const NutrientItem = ({
  name,
  amount,
  percentage,
  type,
  isBetween1400And1800 = false,
  removeTopMargin = false,
  compactYFor600 = false,
  compactFor500 = false,
}) => {
  const isExcess = type === 'excess';
  const accentColor = isExcess ? 'text-rose-600' : 'text-sky-600';

  return (
    <div
      className={`bg-white border border-gray-100 rounded-xl ${
        compactFor500 ? 'px-2 py-1.5' : compactYFor600 ? 'px-3 py-2' : 'p-3'
      } ${removeTopMargin ? 'mt-0' : compactFor500 ? 'mt-1' : compactYFor600 ? 'mt-1' : 'mt-2'} ${
        compactFor500 ? 'mb-2' : compactYFor600 ? 'mb-2' : 'mb-3'
      } shadow-sm min-h-[20px] flex flex-col justify-between transition-transform hover:scale-[1.02]`}
    >
      <div className="flex flex-row justify-between items-center">
        <div
          className={`text-[15px] font-extrabold text-gray-800 tracking-tight -mt-0.5 ${
            compactFor500 ? 'mb-1' : compactYFor600 ? 'mb-2' : 'mb-3'
          }`}
        >
          {name}
        </div>

        <span
          className={`${
            isBetween1400And1800
              ? 'text-[20px] -mt-0.5 mb-2'
              : 'text-[17px] -mt-1 mb-3'
          } font-black ${accentColor}`}
        >
          {percentage > 0 ? `+${percentage}` : percentage}%
        </span>
      </div>
      <div className="flex justify-between items-end">
        <div className="flex flex-row justify-between items-baseline">
          <span className="text-[12px] text-gray-400 font-bold uppercase mb-0.5 mr-1">
            {isExcess ? '초과 섭취량:  ' : '부족 섭취량:  '}
          </span>
          <span className={`${accentColor} font-black text-[13px]`}>
            {Math.abs(amount).toLocaleString()}g
          </span>
        </div>

        <div className="text-right"></div>
      </div>
    </div>
  );
};

const ReportCards = ({
  nutritionData,
  isBetween1400And1800 = false,
  isAtMost1400 = false,
  isAtMost1180 = false,
  enableSingleSelect = false,
  compactYFor600 = false,
  compactFor500 = false,
}) => {
  const [activePanel, setActivePanel] = useState('excess');

  if (!nutritionData || !Array.isArray(nutritionData)) {
    return (
      <div className="p-10 text-gray-400 text-center font-bold">
        데이터가 없습니다.
      </div>
    );
  }

  // 1. 데이터 가공: 각 영양소별 차이량과 퍼센트 계산
  const processedData = nutritionData.map((item) => {
    const diff = item.inputAmount - item.adviseAmount;
    // 권장량이 0일 경우 대비 (0으로 나누기 방지)
    const percentage =
      item.adviseAmount > 0 ? Math.round((diff / item.adviseAmount) * 100) : 0;

    return {
      ...item,
      diffAmount: diff,
      percentage: percentage,
    };
  });

  // 2. 과잉 영양소 정렬 (퍼센트 높은 순 2개)
  const excessList = processedData
    .filter((item) => item.percentage > 0)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  // 3. 결핍 영양소 정렬 (퍼센트 낮은 순 2개)
  const deficiencyList = processedData
    .filter((item) => item.percentage < 0)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 3);

  if (isAtMost1400 && enableSingleSelect) {
    return (
      <div
        className={`${compactFor500 ? 'h-[295px]' : compactYFor600 ? 'h-[310px]' : 'h-[385px]'} ${
          compactYFor600 ? 'mt-1' : 'mt-2'
        } rounded-3xl border border-gray-100 bg-white ${
          compactFor500 ? 'p-1.5' : compactYFor600 ? 'p-2' : 'p-3'
        } flex flex-col`}
      >
        <div
          className={`grid grid-cols-2 ${
            compactFor500 ? 'gap-1.5' : 'gap-2'
          } ${compactFor500 ? 'mb-1.5' : compactYFor600 ? 'mb-2' : 'mb-3'}`}
        >
          <button
            type="button"
            onClick={() => setActivePanel('excess')}
            className={`rounded-xl border px-3 ${
              compactFor500 ? 'py-0.5' : compactYFor600 ? 'py-1' : 'py-2'
            } ${compactFor500 ? 'text-sm' : 'text-sm'} font-black transition-colors ${
              activePanel === 'excess'
                ? 'bg-rose-50 border-rose-200 text-rose-600'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            과잉 영양소
          </button>
          <button
            type="button"
            onClick={() => setActivePanel('deficiency')}
            className={`rounded-xl border px-3 ${
              compactFor500 ? 'py-0.5' : compactYFor600 ? 'py-1' : 'py-2'
            } ${compactFor500 ? 'text-sm' : 'text-sm'} font-black transition-colors ${
              activePanel === 'deficiency'
                ? 'bg-sky-50 border-sky-200 text-sky-600'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            결핍 영양소
          </button>
        </div>

        <div
          className={`flex-1 rounded-2xl border ${
            compactFor500 ? 'p-1.5' : compactYFor600 ? 'p-2' : 'p-3'
          } overflow-y-auto ${
            activePanel === 'excess'
              ? 'bg-rose-50/50 border-rose-100'
              : 'bg-sky-50/50 border-sky-100'
          }`}
        >
          {activePanel === 'excess' ? (
            excessList.length > 0 ? (
              excessList.map((item) => (
                <NutrientItem
                  key={item.id}
                  name={item.name}
                  amount={item.diffAmount}
                  percentage={item.percentage}
                  type="excess"
                  isBetween1400And1800={isBetween1400And1800}
                  compactYFor600={compactYFor600}
                  compactFor500={compactFor500}
                />
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-rose-400 font-bold text-sm text-center">
                과잉 영양소가 없습니다
              </div>
            )
          ) : deficiencyList.length > 0 ? (
            deficiencyList.map((item) => (
              <NutrientItem
                key={item.id}
                name={item.name}
                amount={item.diffAmount}
                percentage={item.percentage}
                type="deficiency"
                isBetween1400And1800={isBetween1400And1800}
                compactYFor600={compactYFor600}
                compactFor500={compactFor500}
              />
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-sky-400 font-bold text-sm text-center">
              결핍 영양소가 없습니다
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-2 gap-5 ${
        compactYFor600 ? 'h-[300px]' : 'h-[350px]'
      } ${compactYFor600 ? 'mt-1' : 'mt-2'}`}
    >
      {/* 과잉 섹션 */}
      <div
        className={`${compactYFor600 ? 'p-3' : 'p-4'} rounded-3xl flex flex-col bg-rose-50/50 border border-rose-100 ${
          compactYFor600 ? 'min-h-[210px]' : 'min-h-[280px]'
        }`}
      >
        <h4
          className={`text-center text-l font-black text-rose-600 ${
            compactYFor600 ? 'mb-1 pb-2' : 'mb-2 pb-3'
          } border-b-2 border-rose-200/50`}
        >
          과잉 영양소
        </h4>
        <div className="flex-1 overflow-y-visible pr-1">
          {excessList.length > 0 ? (
            excessList.map((item) => (
              <NutrientItem
                key={item.id}
                name={item.name}
                amount={item.diffAmount}
                percentage={item.percentage}
                type="excess"
                isBetween1400And1800={isBetween1400And1800}
                removeTopMargin
                compactYFor600={compactYFor600}
              />
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-rose-400 font-bold text-sm text-center">
              과잉 영양소가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* 결핍 섹션 */}
      <div
        className={`${compactYFor600 ? 'p-3' : 'p-4'} rounded-3xl flex flex-col bg-sky-50/50 border border-sky-100 ${
          compactYFor600 ? 'min-h-[210px]' : 'min-h-[280px]'
        }`}
      >
        <h4
          className={`text-center text-l font-black text-sky-600 ${
            compactYFor600 ? 'mb-1 pb-2' : 'mb-2 pb-3'
          } border-b-2 border-sky-200/50`}
        >
          결핍 영양소
        </h4>
        <div className="flex-1 overflow-y-visible pr-1">
          {deficiencyList.length > 0 ? (
            deficiencyList.map((item) => (
              <NutrientItem
                key={item.id}
                name={item.name}
                amount={item.diffAmount}
                percentage={item.percentage}
                type="deficiency"
                isBetween1400And1800={isBetween1400And1800}
                removeTopMargin
                compactYFor600={compactYFor600}
              />
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-sky-400 font-bold text-sm text-center">
              결핍 영양소가 없습니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportCards;
