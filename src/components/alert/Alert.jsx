// # HoneyMat 알림 기능 PRD (Product Requirements Document)

// ## 개요
// 사용자에게 맞춤형 알림을 제공하여 식사 기록 완성도와 서비스 재방문을 높입니다.
// 백엔드: API 및 스케줄러/작업 큐, 프론트엔드: Alert.jsx 컴포넌트 및 API 연동.

// ---

// ## 1. 식사 기록 유도 알림 (Nudge)

// 사용자가 식사 시간을 놓치지 않고 기록하여 '일간 기록'을 완성하게 돕는 알림.

// ### 1.1 아침/점심/저녁 기록 알림
// - 문구 예시: "오늘 점심은 무엇을 드셨나요? 사진 한 장으로 '꿀맛' 점수를 확인해보세요! 🍯"
// - 시간: 사용자의 평소 식사 패턴에 맞춰 발송 (예: 오후 12:30, 저녁 7:00)
// - 구현: 사용자별 식사 패턴 저장, 스케줄 기반 알림 생성, DB notifications 테이블 저장

// ### 1.2 연속 기록 응원
// - 문구 예시: "벌써 3일째 모든 식단을 기록 중이시네요! 이번 주 주간 리포트가 기대돼요. 🔥"
// - 조건: N일 연속 아침/점심/저녁 모두 기록 완료 시 발송
// - 구현: 일간 기록 완성 여부 집계, 연속 일수 계산, 조건 충족 시 알림 생성

// ---

// ## 2. AI 분석 기반 영양 피드백 알림 (Insight)

// 그날 먹은 음식을 분석해서 부족하거나 과한 영양소를 바탕으로 실시간 조언.

// ### 2.1 당류/지방 주의 알림
// - 문구 예시: "앗! 점심에 당류를 조금 많이 섭취하셨어요. 저녁은 담백한 식단을 추천해 드릴까요? 🥗"
// - 조건: 특정 식사에서 당류/지방 목표 초과 시
// - 구현: 영양 분석 API 연동, 임계값 비교, 알림 생성

// ### 2.2 단백질 채우기 제안
// - 문구 예시: "오늘 목표 단백질까지 20g 남았어요! 간식으로 삶은 계란이나 두유 어떠세요? 💪"
// - 조건: 일간 목표 대비 단백질 부족, 저녁 이후 시점
// - 구현: 일간 영양 집계, 목표 대비 차이 계산, 제안 문구 생성

// ---

// ## 3. AI 식단 추천 알림 (Engagement)

// 내일이나 다음 식사를 고민하는 사용자에게 AI가 맞춤형 메뉴를 제안.

// ### 3.1 내일의 식단 제안
// - 문구 예시: "내일 아침은 오늘 부족했던 식이섬유를 채워줄 '사과와 요거트' 식단 어떠세요? 🍎"
// - 조건: 저녁 식사 후 또는 특정 시각
// - 구현: 당일 부족 영양소 분석, AI/추천 로직 연동, 맞춤 메뉴 생성

// ### 3.2 메뉴 고민 해결
// - 문구 예시: "비 오는 날이네요! 칼로리는 낮으면서 따뜻한 '두부 전골' 레시피를 확인해보세요."
// - 조건: 날씨 API 연동, 사용자 선호도 반영
// - 구현: 외부 API(날씨), 추천 엔진 연동, 알림 생성

// ---

// ## 4. 주간 리포트 및 성과 알림 (Reward)

// 한 주간의 변화를 시각화하여 서비스 재방문을 유도.

// ### 4.1 주간 리포트 발행
// - 문구 예시: "지난주 'HoneyMat' 리포트가 도착했습니다! 지난주보다 영양 점수가 5점 올랐어요! 📈"
// - 시간: 주 시작일(예: 월요일 아침)
// - 구현: 주간 데이터 집계, 전주 대비 비교, 리포트 생성 및 알림

// ### 4.2 목표 달성 축하
// - 문구 예시: "축하합니다! 이번 주 목표 체중/영양 균형을 완벽하게 지키셨어요."
// - 조건: 주간 목표(체중/영양 균형) 달성
// - 구현: 목표 달성 여부 판별, 축하 알림 생성

// ---

// ## 기술 요구사항

// - 백엔드: notifications 테이블 활용, 알림 생성 API, 스케줄러/배치 또는 실시간 트리거
// - 프론트엔드: Alert.jsx에서 GET /api/notifications 연동, sampleNotifications 제거, 실제 알림 목록 표시, 읽음 처리 PATCH 연동
// - 사용자별 식사 패턴 저장을 위한 DB 스키마 확장 고려
// - 알림 유형(type): meal_nudge, streak, insight_sugar_fat, insight_protein, recommendation_tomorrow, recommendation_menu, weekly_report, goal_achievement

import { useState, useEffect, useCallback } from 'react';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';
import {
  Bell,
  BellOff,
  Info,
  Utensils,
  BarChart3,
  Sparkles,
  Award,
  Flame,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/** createdAt(ISO 문자열)을 "오전 8:00", "어제", "2일 전" 등으로 포맷 */
function formatNotificationTime(createdAt) {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  // diffDays < 0: 서버/클라이언트 타임존 차이로 미래로 해석될 때 → 오늘·방금으로 표시
  if (diffDays < 0) {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h < 12 ? '오전' : '오후';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${ampm} ${hour}:${String(m).padStart(2, '0')}`;
  }
  if (diffDays === 0) {
    const h = date.getHours();
    const m = date.getMinutes();
    const ampm = h < 12 ? '오전' : '오후';
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${ampm} ${hour}:${String(m).padStart(2, '0')}`;
  }
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return date.toLocaleDateString('ko-KR');
}

/** type에 따른 아이콘/스타일 반환 */
function getNotificationStyle(type) {
  const styles = {
    meal: { bg: 'bg-orange-100', icon: Utensils, color: 'text-orange-600' },
    meal_nudge: {
      bg: 'bg-orange-100',
      icon: Utensils,
      color: 'text-orange-600',
    },
    report: {
      bg: 'bg-emerald-100',
      icon: BarChart3,
      color: 'text-emerald-600',
    },
    weekly_report: {
      bg: 'bg-emerald-100',
      icon: BarChart3,
      color: 'text-emerald-600',
    },
    tip: { bg: 'bg-sky-100', icon: Info, color: 'text-sky-600' },
    insight_sugar_fat: {
      bg: 'bg-amber-100',
      icon: Sparkles,
      color: 'text-amber-600',
    },
    insight_protein: {
      bg: 'bg-amber-100',
      icon: Sparkles,
      color: 'text-amber-600',
    },
    recommendation_tomorrow: {
      bg: 'bg-violet-100',
      icon: Sparkles,
      color: 'text-violet-600',
    },
    recommendation_menu: {
      bg: 'bg-violet-100',
      icon: Sparkles,
      color: 'text-violet-600',
    },
    streak: { bg: 'bg-rose-100', icon: Flame, color: 'text-rose-600' },
    goal_achievement: {
      bg: 'bg-emerald-100',
      icon: Award,
      color: 'text-emerald-600',
    },
  };
  return (
    styles[type] ?? { bg: 'bg-sky-100', icon: Info, color: 'text-gray-600' }
  );
}

export default function Alert() {
  const { notificationEnabled, setUnreadFromList } = useNotification();
  const { updateToken: authUpdateToken } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const doFetch = async (token) => {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok)
      throw {
        status: res.status,
        code: json.code,
        message: json.message ?? `요청 실패 (${res.status})`,
      };
    const list = json.data ?? json ?? [];
    // 동일 내용·시각의 중복 알림 제거 (type, title, message, createdAt 기준)
    const seen = new Set();
    return Array.isArray(list)
      ? list.filter((n) => {
          const key = `${n.type}|${n.title}|${n.message}|${n.createdAt ?? ''}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      : [];
  };

  const fetchNotifications = useCallback(
    async (retried = false) => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await doFetch(token);
        const arr = Array.isArray(list) ? list : [];
        setNotifications(arr);
        setUnreadFromList(arr);
      } catch (err) {
        if (!retried && (err.status === 401 || err.code === 'TOKEN_EXPIRED')) {
          try {
            const data = await authApi.refresh();
            const newToken = data.token;
            localStorage.setItem('accessToken', newToken);
            authUpdateToken?.(newToken);
            const list = await doFetch(newToken);
            const arr = Array.isArray(list) ? list : [];
            setNotifications(arr);
            setUnreadFromList(arr);
            setError(null);
            return;
          } catch {
            setError('다시 로그인해 주세요.');
            setNotifications([]);
            setUnreadFromList([]);
          }
        } else {
          setError(err.message ?? '알림을 불러오지 못했어요');
          setNotifications([]);
          setUnreadFromList([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [authUpdateToken],
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const next = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      setNotifications(next);
      setUnreadFromList(next); // 사이드바 빨간 점 갱신
    } catch {
      // 무시
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.read) markAsRead(item.id);
  };

  return (
    <div className="p-2 min-h-screen">
      <div className="bg-[#F2F9F5] text-[#1E2923] w-full max-w-2xl mx-auto rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 border-b-0 pb-0">
            알림
          </h2>
        </div>

        {notificationEnabled ? (
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-gray-500">알림을 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <p className="text-amber-600 font-medium">
                  알림을 불러오지 못했어요
                </p>
                <p className="text-gray-500 text-sm mt-1">{error}</p>
              </div>
            ) : notifications.filter((n) => !n.read).length > 0 ? (
              notifications.filter((item) => !item.read).map((item) => {
                const style = getNotificationStyle(item.type);
                const Icon = style.icon;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && handleNotificationClick(item)
                    }
                    className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer ${
                      !item.read ? 'border-l-4 border-l-[#FF8243]' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.bg}`}
                      >
                        <Icon size={20} className={style.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 text-sm">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 text-sm mt-0.5">
                          {item.message}
                        </p>
                        <span className="text-xs text-gray-400 mt-1 block">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium">알림이 없습니다</p>
                <p className="text-gray-400 text-sm mt-1">
                  새로운 알림이 오면 여기에 표시됩니다.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <BellOff size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">알림이 꺼져 있습니다</p>
            <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
              환경설정에서 알림을 켜면 식사 기록, 주간 리포트 등 유용한 알림을
              받을 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
