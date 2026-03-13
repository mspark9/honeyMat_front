import React, { useState, useRef, useEffect } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';
import { TbTrashX } from 'react-icons/tb';
import { useNavigate } from 'react-router-dom';
import { MdOutlineHorizontalRule } from 'react-icons/md';

const FoodCardRecommend = ({
  food,
  isFavorite,
  onToggleFavorite,
  onDelete,
  onToggleCheck,
}) => {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [tags, setTags] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const titleRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchAiTags = async () => {
      // 이미 데이터에 태그가 있거나 로딩 중이면 중단
      if ((food.tags && food.tags.length > 0) || tags.length > 0) {
        if (food.tags && tags.length === 0) setTags(food.tags);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const apiKey =
          import.meta.env?.VITE_OPENAI_API_KEY ||
          process?.env?.REACT_APP_OPENAI_API_KEY;

        if (!apiKey) {
          setIsLoading(false);
          return;
        }

        const response = await fetch(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'user',
                  content: `음식명: ${food.name}, 칼로리: ${food.kcal}, 탄수: ${food.carbs}, 단백질: ${food.protein}, 지방: ${food.fat}, 당: ${food.sugar}`,
                },
                {
                  role: 'assistant',
                  content:
                    '당신은 영양사입니다. 영양성분 데이터를 보고 [#고단백, #다이어트, #비건, #저탄수, #0kcal, #저당, #과일, #저지방, #고지방, #고칼로리, #고당] 중 적합한 태그를 골라 JSON 배열 형태로만 응답하세요. 예: ["#고단백"]. 해당 없으면 [] 반환.',
                },
              ],
              temperature: 0.3,
            }),
          },
        );

        const data = await response.json();

        if (data.choices?.[0]?.message?.content) {
          const aiTags = JSON.parse(data.choices[0].message.content);
          setTags(aiTags);
          // 부모가 관리하는 food 객체의 tags 속성에 AI 태그 직접 할당
          food.tags = aiTags;
        }
      } catch (error) {
        console.error('AI 태그 생성 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAiTags();
  }, [food]);

  useEffect(() => {
    if (!isLoading && titleRef.current && containerRef.current) {
      const hasOverflow =
        titleRef.current.scrollWidth > containerRef.current.clientWidth;
      setIsOverflowing(hasOverflow);
    }
  }, [food.name, isLoading]);

  const navigate = useNavigate();

  return (
    <div className="w-full bg-white rounded-2xl py-4 px-5 border border-gray-100 shadow-sm relative flex flex-col mb-4 hover:shadow-md transition-shadow">
      {/* 상단: 제목 및 즐겨찾기 */}
      <div className="flex justify-between items-start mb-3 gap-4">
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden rounded-lg px-1 py-1 h-[38px] flex items-center"
        >
          <div className="relative w-full overflow-hidden">
            <h3
              ref={titleRef}
              className={`inline-block font-bold text-lg text-[#1E2923] whitespace-nowrap ${isOverflowing ? 'animate-marquee' : ''}`}
            >
              {food.name}
              {isOverflowing && <span className="ml-12">{food.name}</span>}
            </h3>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(food.id);
          }}
          className="focus:outline-none p-1.5"
        >
          {isFavorite ? (
            <FaStar size={23} color="#FF8243" />
          ) : (
            <FaRegStar size={23} color="#FF8243" />
          )}
        </button>
      </div>

      {/* 영양성분 그리드 */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {[
          {
            label: '칼로리',
            value: food.kcal,
            unit: 'kcal',
            color: 'text-[#FF8243]',
          },
          {
            label: '탄수화물',
            value: food.carbs,
            unit: 'g',
            color: 'text-[#FFA726]',
          },
          {
            label: '단백질',
            value: food.protein,
            unit: 'g',
            color: 'text-[#66BB6A]',
          },
          {
            label: '지방',
            value: food.fat,
            unit: 'g',
            color: 'text-[#EF5350]',
          },
          {
            label: '당',
            value: food.sugar,
            unit: 'g',
            color: 'text-[#AB47BC]',
          },
        ].map((item, idx) => {
          const isEmpty = !item.value;

          return (
            <div
              key={idx}
              className="flex flex-col items-center justify-center p-2 bg-[#F9FBFA] rounded-xl border border-gray-50"
            >
              <span className="text-[12.5px] mb-2">{item.label}</span>
              <span
                className={`flex items-center justify-center text-[13.5px] font-bold h-5 ${item.color || 'text-gray-700'} `}
              >
                {isEmpty ? (
                  <MdOutlineHorizontalRule size={20} color="364153" />
                ) : (
                  `${item.value}${item.unit}`
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-px bg-white mb-1" />

      {/* 태그 영역 */}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[26px]">
        {isLoading && tags.length === 0 ? (
          <>
            <div className="w-16 h-[26px] bg-gray-100 rounded-md animate-pulse" />
            <div className="w-22 h-[26px] bg-gray-100 rounded-md animate-pulse" />
            <div className="w-10 h-[26px] bg-gray-100 rounded-md animate-pulse" />
          </>
        ) : (
          tags.map((tag, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 bg-gray-100 text-gray-500 text-[12px] font-bold rounded-md flex items-center justify-center animate-fadeIn"
            >
              {tag}
            </span>
          ))
        )}
      </div>
      <div className="h-px bg-white mb-3" />

      {/* 하단: 삭제 및 선택 버튼 */}
      <div className="flex items-center gap-28">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(food.id, food.name);
          }}
          className="p-1 text-gray-300 hover:text-gray-700 mt-1"
        >
          <TbTrashX size={23} />
        </button>

        <div className="flex flex-1 gap-5">
          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              console.log(food, '비슷한 음식 보기');
            }}
            className="flex-1 py-1.5 bg-[#ffffff] text-[#FF8243] font-semibold rounded-xl shadow-sm border-2 border-[#FF8243] text-[15px] hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            비슷한 음식 보기
          </button> */}

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleCheck) {
                onToggleCheck();
                return;
              }
              navigate('/home/dailyLog', { state: { food } });
            }}
            className="flex-1 py-1.5 bg-[#FF8243] border-2 border-[#FF8243] text-white font-bold rounded-xl shadow-sm hover:bg-[#e6753d] hover:border-[#e6753d] transition-colors text-[15px] whitespace-nowrap ml-auto max-w-[150px]"
          >
            선택하기
          </button>
        </div>
      </div>

      <style>{`
  .animate-marquee {
    display: inline-block;
    animation: marquee 10s linear infinite;
  }

  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); } 
  }

  .animate-marquee:hover {
    animation-play-state: paused;
  }

  .mask-fade {
    mask-image: linear-gradient(
      to right,
      transparent,
      black 5%,
      black 95%,
      transparent
    );
  }
`}</style>
    </div>
  );
};

export default FoodCardRecommend;
