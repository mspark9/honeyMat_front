import React from 'react';

const NutrientItem = ({ name, amount, percentage, type }) => {
  const isExcess = type === 'excess';
  const accentColor = isExcess ? 'text-rose-600' : 'text-sky-600';

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3 mt-2 mb-3 shadow-sm min-h-[20px] flex flex-col justify-between transition-transform hover:scale-[1.02]">
      <div className="flex flex-row justify-between items-center">
        <div className="text-[17px] font-extrabold text-gray-800 tracking-tight -mt-0.5">
          {name}
        </div>

        <span className={`text-[22px] font-black -mt-1 ${accentColor}`}>
          {percentage > 0 ? `+${percentage}` : percentage}%
        </span>
      </div>
      <div className="flex justify-between items-end">
        <div className="flex flex-row justify-between items-baseline">
          <span className="text-[13px] text-gray-400 font-bold uppercase mb-0.5 mr-1">
            {isExcess ? '초과 섭취량:  ' : '부족 섭취량:  '}
          </span>
          <span className={`${accentColor} font-black text-[14px]`}>
            {Math.abs(amount).toLocaleString()}g
          </span>
        </div>

        <div className="text-right"></div>
      </div>
    </div>
  );
};

const ReportCards = ({ nutritionData }) => {
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

  return (
    <div className="grid grid-cols-2 gap-5 h-[350px] mt-2">
      {/* 과잉 섹션 */}
      <div className="p-4 rounded-3xl flex flex-col bg-rose-50/50 border border-rose-100 min-h-[280px]">
        <h4 className="text-center text-l font-black text-rose-600 mb-2 pb-3 border-b-2 border-rose-200/50">
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
      <div className="p-4 rounded-3xl flex flex-col bg-sky-50/50 border border-sky-100 min-h-[280px]">
        <h4 className="text-center text-l font-black text-sky-600 mb-2 pb-3 border-b-2 border-sky-200/50">
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
