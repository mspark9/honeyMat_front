import React from 'react';
import { PiChefHat } from 'react-icons/pi';
import { IoMdRefresh } from 'react-icons/io';
import FoodCardRecommend from '../Recommend/FoodCardRecommend';

const AIReviewSection = ({
  aiReview,
  isAiLoading,
  isFoodListLoading,
  foodList,
  onResetRecommendations,
  onRefreshAiReport,
  isAtMost600 = false,
}) => {
  return (
    <div className="bg-white py-5 px-5 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="font-bold text-lg mb-4 flex items-center text-gray-800">
        <span className="mr-2">
          <PiChefHat size={25} color="#FF8243" />
        </span>
        AI 영양사 리뷰
      </h3>
      {isAiLoading ? (
        <div className="relative space-y-4 text-gray-700 leading-relaxed min-h-[940px] max-h-[940px] overflow-hidden">
          <div className="min-h-[140px] max-h-[140px] flex items-start">
            <div className="relative bg-white p-5 rounded-xl border-2 border-[#FF8243] shadow-sm w-full">
              <span className="absolute -top-2 left-2 w-3.5 h-3.5 bg-white border-l-2 border-t-2 border-[#FF8243] rotate-45"></span>
              <div className="min-h-[60px] flex items-center justify-center"></div>
            </div>
          </div>
          <div
            className={`mt-5 mb-5 space-y-2 p-3 bg-[#F3FBF5] border border-[#D7EEDB] rounded-xl relative overflow-hidden ${
              isAtMost600 ? 'min-h-[195px] max-h-[195px]' : 'min-h-[175px] max-h-[175px]'
            }`}
          >
            <h4 className="font-bold text-[15.5px] text-gray-900 mb-3 pl-3 pb-2 border-b border-[#CFE5D4]">
              개선 포인트
            </h4>
            <div className="h-[95px] flex items-center justify-center"></div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100 pb-2">
              <h4 className="font-bold text-[15.5px] text-[#FF8243]">
                추천 식단 구성
              </h4>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="추천식단 새로고침"
                  onClick={onResetRecommendations}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  <IoMdRefresh size={20} />
                </button>
              </div>
            </div>
            <div className="flex flex-col min-h-[520px] max-h-[520px] mb-5">
              <div className="h-[250px] bg-gray-100 rounded-2xl mb-5"></div>
              <div className="h-[250px] bg-gray-100 rounded-2xl"></div>
            </div>
          </div>
          <div className="absolute inset-x-0 -top-[20px] h-[calc(100%+30px)] bg-gray-50 rounded-2xl flex items-center justify-center z-10">
            <p className="text-[17px] text-gray-600 font-medium ">
              AI 분석 중 ...
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-gray-700 leading-relaxed">
          <div className="min-h-[140px] max-h-[140px] flex items-start">
            <div className="relative bg-white p-5 rounded-xl border-2 border-[#FF8243] shadow-sm w-full">
              <span className="absolute -top-2 left-2 w-3.5 h-3.5 bg-white border-l-2 border-t-2 border-[#FF8243] rotate-45"></span>
              <p className="font-medium text-[15px] text-[#1E2923]">
                "{aiReview.review}"
              </p>
            </div>
          </div>
          <div
            className={`mt-5 mb-5 space-y-2 p-3 bg-[#F3FBF5] border border-[#D7EEDB] rounded-xl relative overflow-hidden ${
              isAtMost600 ? 'min-h-[195px] max-h-[195px]' : 'min-h-[175px] max-h-[175px]'
            }`}
          >
            <h4 className="font-bold text-[15px] text-gray-900 mb-3 pl-3 pb-2 border-b border-[#CFE5D4]">
              개선 포인트
            </h4>
            <ul className="list-disc marker:text-[#FF8243] [&>li::marker]:text-[13px] ml-4 pl-2 space-y-2 text-[14px] text-gray-600">
              {(aiReview.improvementPoints.length
                ? aiReview.improvementPoints
                : [
                    '개선 포인트를 불러오는 중입니다.',
                    '데이터 분석 후 맞춤 식단 가이드를 제공합니다.',
                    '잠시만 기다려주세요.',
                  ]
              ).map((point, index) => (
                <li key={`${point}-${index}`}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="pt-3 border-t border-gray-100 pb-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-[15.5px] text-[#FF8243]">
                추천 식단 구성
              </h4>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="추천식단 새로고침"
                  onClick={onResetRecommendations}
                  disabled={isFoodListLoading || isAiLoading}
                  className="w-9 h-9 flex items-center justify-center text-gray-500 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 mr-0.5"
                >
                  <IoMdRefresh size={23} />
                </button>
              </div>
            </div>
            <div className="flex flex-col min-h-[520px] max-h-[520px]">
              {isFoodListLoading ? (
                <>
                  <div className="h-[250px] bg-gray-100 rounded-2xl mb-5"></div>
                  <div className="h-[250px] bg-gray-100 rounded-2xl"></div>
                </>
              ) : (
                foodList.slice(0, 2).map((item) => (
                  <FoodCardRecommend
                    key={item.id}
                    food={{
                      ...item,
                      tags: Array.isArray(item?.tags) ? item.tags : [],
                    }}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIReviewSection;
