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
export const NutrientRadarChart = ({ data }) => {
  const maxValue = Math.max(...data.map((item) => item.value || 0), 0);
  const axisMax =
    maxValue > 0 ? Math.max(100, Math.ceil(maxValue / 10) * 10) : 100;

  return (
    <ResponsiveContainer width="100%" height={357}>
      <RadarChart
        cx="50%"
        cy="50%"
        outerRadius="90%"
        data={data}
        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
      >
        <PolarGrid stroke="#d0d0d0" opacity={0.8} />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#1E2923', fontSize: 14 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, axisMax]}
          tick={{
            fill: '#777',
            fontSize: 12,
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
export const WeeklyLineChart = ({ data }) => {
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
        }}
      >
        {value}
      </span>
    );
  };

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
    <ResponsiveContainer width="100%" height={343}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 35, left: 0, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke="#f0f0f0"
        />
        <XAxis dataKey="day" />
        <YAxis yAxisId="left" tick={{ fill: '#ff9058', fontWeight: 700 }} />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend
          onClick={handleLegendClick}
          formatter={renderCustomLegendText}
          payload={legendPayload}
          iconSize={12} // ★ 중요: 아이콘의 가로세로 길이를 동일하게 고정 (정사각형화)
          wrapperStyle={{
            paddingTop: '15px',
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
