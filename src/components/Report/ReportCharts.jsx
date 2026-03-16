import React, { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
  Line,
  Bar,
} from 'recharts';

// 방사형 차트
export const NutrientRadarChart = ({
  data,
  angleTickFontSize = 14,
  radiusTickFontSize = 12,
  outerRadius = '90%',
  chartHeight = 357,
}) => {
  const maxValue = Math.max(...data.map((item) => item.value || 0), 0);
  const axisMax =
    maxValue > 0 ? Math.max(100, Math.ceil(maxValue / 10) * 10) : 100;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <RadarChart
        cx="50%"
        cy="50%"
        outerRadius={outerRadius}
        data={data}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        <PolarGrid stroke="#d0d0d0" opacity={0.8} />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#1E2923', fontSize: angleTickFontSize }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, axisMax]}
          tick={{
            fill: '#777',
            fontSize: radiusTickFontSize,
            dy: 8,
            dx: -8,
          }}
          axisLine={false}
        />
        <Radar
          name="영양소"
          dataKey="value"
          stroke="#FF8243"
          fill="#FF8243"
          fillOpacity={0.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};

// 7일간 변화 추이
export const WeeklyLineChart = ({
  data,
  maximizeForSmallScreen = false,
  legendFontSize = 14,
  compactTextForNarrow = false,
}) => {
  // 활성화된 시리즈 상태 관리
  const [activeSeries, setActiveSeries] = useState([
    'kcal',
    'carbohydrate',
    'protein',
    'fat',
    'sugars',
  ]);

  // 범례 클릭 핸들러
  const handleLegendClick = (e) => {
    const { dataKey } = e;
    if (activeSeries.includes(dataKey)) {
      setActiveSeries(activeSeries.filter((item) => item !== dataKey));
    } else {
      setActiveSeries([...activeSeries, dataKey]);
    }
  };

  // 범례 텍스트 커스텀 (비활성 시 글자만 회색)
  const renderCustomLegendText = (value, entry) => {
    const { dataKey } = entry;
    const isActive = activeSeries.includes(dataKey);
    return (
      <span
        style={{
          color: isActive ? '#333' : '#ccc',
          cursor: 'pointer',
          marginLeft: '3px',
          fontWeight: '400',
          fontSize: `${legendFontSize}px`,
        }}
      >
        {value}
      </span>
    );
  };

  const axisFontSize = compactTextForNarrow ? 11 : 12;

  // 라인 생성 헬퍼 함수 (탄단지당)
  const createLine = (dataKey, color, label) => {
    const isActive = activeSeries.includes(dataKey);
    return (
      <Line
        key={dataKey}
        type="monotone"
        yAxisId="right"
        dataKey={dataKey}
        name={label}
        legendType="circle"
        stroke={color}
        strokeWidth={2}
        strokeOpacity={isActive ? 1 : 0}
        dot={isActive ? { r: 3, fill: color } : false}
        activeDot={isActive ? { r: 3 } : false}
      />
    );
  };

  // 막대 생성 헬퍼 함수 (칼로리)
  const createBar = (dataKey, color) => {
    const isActive = activeSeries.includes(dataKey);
    return (
      <Bar
        key={dataKey}
        yAxisId="left"
        dataKey={dataKey}
        name="kcal"
        legendType="rect"
        barSize={18}
        fill={color}
        fillOpacity={isActive ? 1 : 0}
      />
    );
  };

  const legendPayload = [
    {
      dataKey: 'carbohydrate',
      value: '탄수화물',
      color: '#FFA726',
      type: 'circle',
    },
    { dataKey: 'protein', value: '단백질', color: '#66BB6A', type: 'circle' },
    { dataKey: 'fat', value: '지방', color: '#EF5350', type: 'circle' },
    { dataKey: 'sugars', value: '당', color: '#AB47BC', type: 'circle' },
    {
      dataKey: 'kcal',
      value: '칼로리',
      color: '#ff9058',
      type: 'square',
    },
  ].map((item) => ({
    ...item,
    inactive: !activeSeries.includes(item.dataKey),
  }));

  return (
    <ResponsiveContainer width="100%" height={maximizeForSmallScreen ? 380 : 343}>
      <ComposedChart
        data={data}
        margin={
          maximizeForSmallScreen
            ? { top: 0, right: 6, left: 0, bottom: 0 }
            : { top: 5, right: 35, left: 0, bottom: 5 }
        }
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f0f0f0"
        />
        <XAxis
          dataKey="day"
          tick={{
            fontSize: maximizeForSmallScreen ? 11 : axisFontSize,
          }}
        />
        <YAxis
          yAxisId="left"
          tick={
            maximizeForSmallScreen
              ? { fill: '#ff9058', fontWeight: 700, fontSize: 11 }
              : { fill: '#ff9058', fontWeight: 700, fontSize: axisFontSize }
          }
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: axisFontSize }}
        />
        <Tooltip
          contentStyle={{
            fontSize: compactTextForNarrow ? '12px' : '13px',
          }}
          itemStyle={{
            fontSize: compactTextForNarrow ? '12px' : '13px',
          }}
          labelStyle={{
            fontSize: compactTextForNarrow ? '12px' : '13px',
          }}
        />
        <Legend
          onClick={handleLegendClick}
          formatter={renderCustomLegendText}
          payload={legendPayload}
          iconSize={maximizeForSmallScreen ? 10 : 12} // ★ 중요: 아이콘의 가로세로 길이를 동일하게 고정 (정사각형화)
          wrapperStyle={{
            paddingTop: maximizeForSmallScreen ? '6px' : '15px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        />
        {createBar('kcal', '#ff9058', 'kcal')}
        {createLine('carbohydrate', '#FFA726', '탄수화물')}
        {createLine('protein', '#66BB6A', '단백질')}
        {createLine('fat', '#EF5350', '지방')}
        {createLine('sugars', '#AB47BC', '당')}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
