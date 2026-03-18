import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import FoodCardRecommend from './FoodCardRecommend';
import { FaStar, FaSearch, FaCircle } from 'react-icons/fa';
import { TbMessageChatbot } from 'react-icons/tb';
import { IoMdRefresh } from 'react-icons/io';
import { LuArrowDownUp, LuCheck } from 'react-icons/lu';

const RecommendPage = () => {
  const LOADING_DELAY_MS = 1000;
  const TAG_SKELETON_MIN_MS = 5000;
  const navigate = useNavigate();
  const [recommendedFoods, setRecommendedFoods] = useState([]);

  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [finalSearchTerm, setFinalSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isFavoriteView, setIsFavoriteView] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [sortType, setSortType] = useState('latest');

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isHalfSplitLayout, setIsHalfSplitLayout] = useState(
    () => window.innerWidth < 1300,
  );
  const [isNutrientSplitViewport, setIsNutrientSplitViewport] = useState(
    () => window.innerWidth < 1700,
  );
  const [isNarrowMobile, setIsNarrowMobile] = useState(
    () => window.innerWidth < 681,
  );
  const [isUltraNarrowMobile, setIsUltraNarrowMobile] = useState(
    () => window.innerWidth < 531,
  );
  const [isMobileChatbotOpen, setIsMobileChatbotOpen] = useState(false);
  const searchInputRef = useRef(null);
  const sortRef = useRef(null);
  const searchRef = useRef(null);
  const listScrollRef = useRef(null);
  const recommendedFoodsRef = useRef(recommendedFoods);
  const loadingTimerRef = useRef(null);
  const searchDebounceTimerRef = useRef(null);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] =
    useState(-1);
  const [isSearchSuggestLoading, setIsSearchSuggestLoading] = useState(false);
  const [tagLoadingByFoodId, setTagLoadingByFoodId] = useState({});
  const [showCardTagSkeleton, setShowCardTagSkeleton] = useState(false);
  const [showTagSkeleton, setShowTagSkeleton] = useState(false);
  const [hasEverHadDisplayedCards, setHasEverHadDisplayedCards] =
    useState(false);
  const tagSkeletonStartRef = useRef(0);
  const tagSkeletonHideTimerRef = useRef(null);
  const cardTagSkeletonHideTimerRef = useRef(null);
  recommendedFoodsRef.current = recommendedFoods;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1299px)');
    const handleLayoutChange = (event) => {
      setIsHalfSplitLayout(event.matches);
    };

    setIsHalfSplitLayout(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleLayoutChange);

    return () => mediaQuery.removeEventListener('change', handleLayoutChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1699px)');
    const handleNutrientLayoutChange = (event) => {
      setIsNutrientSplitViewport(event.matches);
    };

    setIsNutrientSplitViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleNutrientLayoutChange);

    return () =>
      mediaQuery.removeEventListener('change', handleNutrientLayoutChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 680px)');
    const handleMobileChange = (event) => {
      setIsNarrowMobile(event.matches);
      if (!event.matches) {
        setIsMobileChatbotOpen(false);
      }
    };

    setIsNarrowMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleMobileChange);

    return () => mediaQuery.removeEventListener('change', handleMobileChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 530px)');
    const handleUltraNarrowChange = (event) => {
      setIsUltraNarrowMobile(event.matches);
    };

    setIsUltraNarrowMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleUltraNarrowChange);

    return () =>
      mediaQuery.removeEventListener('change', handleUltraNarrowChange);
  }, []);

  // 즐겨찾기 로컬스토리지 연동
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('food-favorites');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('food-favorites', JSON.stringify(favorites));
  }, [favorites]);

  /**
   * '(' 가 나오기 전까지의 순수 이름만 추출하는 함수
   * 예: "비빔밥(고추장)" -> "비빔밥", "치킨" -> "치킨"
   */
  const getBaseName = (name) => {
    if (!name) return '';
    // 괄호가 있으면 분리, 없으면 전체 이름 반환
    return name.split('(')[0].trim();
  };

  /**
   * 중복 여부 확인: 괄호 전(혹은 전체이름)이 같은 카드가 있는지 검사
   */
  const isDuplicateByName = (name, existingFoods) => {
    const baseName = getBaseName(name);
    if (!baseName) return false;

    return existingFoods.some((f) => {
      const existingBase = getBaseName(f.name);
      return existingBase === baseName;
    });
  };

  /**
   * 새로 추천된 음식 중 기존 리스트와 이름(괄호 제외)이 겹치는 것은 제외하고 병합
   */
  const mergeRecommendedFoods = (newFoods, existingFoods) => {
    const normalized = normalizeData(newFoods);
    const existing = existingFoods || [];
    const toAdd = [];

    normalized.forEach((food) => {
      // 1. 기존 리스트와 비교
      const isInExisting = isDuplicateByName(food.name, existing);
      // 2. 현재 새로 추가하려는 리스트 내부에서의 중복 비교
      const isInNewToAdd = isDuplicateByName(food.name, toAdd);

      if (!isInExisting && !isInNewToAdd) {
        toAdd.push(food);
      }
    });

    // 중복 제외된 새 음식들을 기존 리스트 앞에 추가
    return [...toAdd, ...existing];
  };

  const normalizeTagLabel = (tag) =>
    String(tag ?? '')
      .replace(/^#/, '')
      .trim();

  /**
   * 데이터 정규화 함수
   */
  const normalizeData = (data) => {
    const rawList = Array.isArray(data) ? data : data.foods || [];
    return rawList.map((f) => ({
      id:
        f.id ||
        `${f.name || f.title || 'food'}-${f.kcal || f.calories || 0}-${f.carbs || 0}-${f.protein || 0}-${f.fat || 0}-${f.sugar || 0}`,
      name: f.name || f.title || '이름 없음',
      description: f.description || '',
      tags: f.tags || [],
      kcal: f.kcal || f.calories || 0,
      carbs: f.carbs || 0,
      protein: f.protein || 0,
      fat: f.fat || 0,
      sugar: f.sugar || 0,
    }));
  };

  const normalizeMealSearchData = (rows) => {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => ({
      id: String(row.food_code || row.id || row.food_name || 'food'),
      name: row.food_name || row.name || '이름 없음',
      description: row.manufacturer || row.category || '',
      tags: [],
      kcal: Number(row.calories) || 0,
      carbs: Number(row.carbohydrate) || 0,
      protein: Number(row.protein) || 0,
      fat: Number(row.fat) || 0,
      sugar: Number(row.sugars) || 0,
    }));
  };

  const searchMeals = async (query, limit = 20) => {
    const keyword = String(query ?? '').trim();
    if (!keyword) return [];
    const encodedQuery = encodeURIComponent(keyword);
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/meals/search?query=${encodedQuery}&limit=${limit}`,
    );
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || '음식 검색에 실패했습니다.');
    }
    return normalizeMealSearchData(data.data || []);
  };

  const searchMealsForSuggestions = async (query, limit = 8) => {
    const keyword = String(query ?? '').trim();
    if (!keyword) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      setHighlightedSuggestionIndex(-1);
      return;
    }
    setIsSearchSuggestLoading(true);
    try {
      const foods = await searchMeals(keyword, limit);
      setSearchSuggestions(foods);
      setShowSearchSuggestions(foods.length > 0);
      setHighlightedSuggestionIndex(-1);
    } catch (error) {
      console.error('검색 자동완성 실패:', error);
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      setHighlightedSuggestionIndex(-1);
    } finally {
      setIsSearchSuggestLoading(false);
    }
  };

  const fetchFoodsByKeywords = async (keywords) => {
    const uniqueKeywords = [
      ...new Set(
        (keywords || []).map((k) => String(k || '').trim()).filter(Boolean),
      ),
    ];
    if (uniqueKeywords.length === 0) return [];

    const searched = await Promise.all(
      uniqueKeywords.map(async (keyword) => {
        const results = await searchMeals(keyword, 10);
        if (!results.length) return null;
        const exact = results.find(
          (item) =>
            normalizeTagLabel(item.name).toLowerCase() ===
            normalizeTagLabel(keyword).toLowerCase(),
        );
        return exact || results[0];
      }),
    );

    return searched.filter(Boolean);
  };

  // AI 챗봇 상태
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        '안녕하세요! 당신의 현재 영양 상태를 분석하여 최적의 식단을 추천해 드립니다. 어떤 음식이 궁금하신가요?',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const [deleteNotice, setDeleteNotice] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const deleteTimerRef = useRef(null);

  const clearLoadingTimer = () => {
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  const clearDeleteTimer = () => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
  };

  const stopDataLoadingWithDelay = () => {
    clearLoadingTimer();
    loadingTimerRef.current = setTimeout(() => {
      setIsDataLoading(false);
      loadingTimerRef.current = null;
    }, LOADING_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      clearDeleteTimer();
      clearLoadingTimer();
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
      if (tagSkeletonHideTimerRef.current) {
        clearTimeout(tagSkeletonHideTimerRef.current);
      }
      if (cardTagSkeletonHideTimerRef.current) {
        clearTimeout(cardTagSkeletonHideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isNarrowMobile && isMobileChatbotOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isNarrowMobile, isMobileChatbotOpen]);

  const filterTags = useMemo(() => {
    const seen = new Set();
    const tags = [];
    recommendedFoods.forEach((food) => {
      (food.tags || []).forEach((tag) => {
        const normalized = normalizeTagLabel(tag);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        tags.push(normalized);
      });
    });
    return tags;
  }, [recommendedFoods]);

  const isTagChecking = useMemo(() => {
    if (recommendedFoods.length === 0) return false;
    return recommendedFoods.some(
      (food) => tagLoadingByFoodId[food.id] === true,
    );
  }, [recommendedFoods, tagLoadingByFoodId]);

  useEffect(() => {
    setTagLoadingByFoodId((prev) => {
      const existingIds = new Set(recommendedFoods.map((food) => food.id));
      const next = {};
      Object.entries(prev).forEach(([id, isLoading]) => {
        if (existingIds.has(id)) {
          next[id] = isLoading;
        }
      });
      return next;
    });
  }, [recommendedFoods]);

  useEffect(() => {
    if (tagSkeletonHideTimerRef.current) {
      clearTimeout(tagSkeletonHideTimerRef.current);
      tagSkeletonHideTimerRef.current = null;
    }

    if (isTagChecking) {
      if (!showTagSkeleton) {
        tagSkeletonStartRef.current = Date.now();
      }
      setShowTagSkeleton(true);
      return;
    }

    if (!showTagSkeleton) return;
    const elapsed = Date.now() - tagSkeletonStartRef.current;
    const remaining = Math.max(0, TAG_SKELETON_MIN_MS - elapsed);
    tagSkeletonHideTimerRef.current = setTimeout(() => {
      setShowTagSkeleton(false);
      tagSkeletonHideTimerRef.current = null;
    }, remaining);
  }, [isTagChecking, showTagSkeleton]);

  useEffect(() => {
    if (cardTagSkeletonHideTimerRef.current) {
      clearTimeout(cardTagSkeletonHideTimerRef.current);
      cardTagSkeletonHideTimerRef.current = null;
    }

    if (recommendedFoods.length === 0) {
      setShowCardTagSkeleton(false);
      return;
    }

    if (isTagChecking) {
      setShowCardTagSkeleton(true);
      return;
    }

    if (!showCardTagSkeleton) return;
    cardTagSkeletonHideTimerRef.current = setTimeout(() => {
      setShowCardTagSkeleton(false);
      cardTagSkeletonHideTimerRef.current = null;
    }, 2000);
  }, [isTagChecking, recommendedFoods.length, showCardTagSkeleton]);

  // AI 챗봇 전송
  // AI 챗봇 전송 및 카드 동기화 로직
  const sendMessage = async () => {
    // 1. 입력값 검증 및 로딩 상태 확인
    if (!inputMessage.trim() || isLoading) return;

    const token = localStorage.getItem('accessToken');
    const userMsg = { role: 'user', content: inputMessage };

    // 유저 메시지 즉시 반영
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/recommend/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: updatedMessages,
            inputMessage: currentInput,
          }),
        },
      );

      const data = await response.json();

      if (data.success) {
        // 2. AI 텍스트 응답 추가
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.chatContent || data.reply },
        ]);

        // 3. 추천된 음식 카드 리스트 업데이트
        const incomingFoods = Array.isArray(data.foods) ? data.foods : [];
        const recommendedNames = Array.isArray(data.recommendedNames)
          ? data.recommendedNames
          : incomingFoods.map((f) => f?.name).filter(Boolean);
        if (recommendedNames.length > 0) {
          const searchedFoods = await fetchFoodsByKeywords(recommendedNames);
          if (searchedFoods.length > 0) {
            setRecommendedFoods((prev) =>
              mergeRecommendedFoods(searchedFoods, prev),
            );
          }

          // 4. UI 편의성 조치: 필터 초기화 및 스크롤 이동
          // 검색어나 태그 필터 때문에 새 카드가 안 보일 수 있으므로 초기화합니다.
          setSearchTerm('');
          setFinalSearchTerm('');
          setSelectedTags([]);
          setIsFavoriteView(false);

          // 리스트 영역 로딩 애니메이션 트리거
          triggerLoading();

          // 약간의 지연 후 리스트 최상단으로 부드럽게 스크롤
          setTimeout(() => {
            listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }, 150);
        }
      } else {
        // 백엔드 success가 false인 경우 처리
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.message || '추천 메뉴를 가져오지 못했습니다.',
          },
        ]);
      }
    } catch (error) {
      console.error('Chat API Error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '서버와 통신 중 에러가 발생했습니다.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const triggerLoading = () => {
    setIsDataLoading(true);
    stopDataLoadingWithDelay();
  };

  const handleSearch = async () => {
    const keyword = searchTerm.trim();
    setShowSearchSuggestions(false);
    setSearchSuggestions([]);
    setHighlightedSuggestionIndex(-1);
    if (!keyword) {
      triggerLoading();
      setFinalSearchTerm('');
      return;
    }

    triggerLoading();
    try {
      const searchedFoods = await searchMeals(keyword, 20);
      if (searchedFoods.length > 0) {
        setRecommendedFoods((prev) =>
          mergeRecommendedFoods(searchedFoods, prev),
        );
        setFinalSearchTerm('');
        setSelectedTags([]);
        setIsFavoriteView(false);
        setTimeout(() => {
          listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
        }, 150);
      } else {
        setFinalSearchTerm(keyword);
      }
    } catch (error) {
      console.error('식단 검색 실패:', error);
      setFinalSearchTerm(keyword);
    }
  };

  const handleSelectSuggestion = (food) => {
    if (!food) return;
    setSearchTerm(food.name);
    setShowSearchSuggestions(false);
    setSearchSuggestions([]);
    setHighlightedSuggestionIndex(-1);
    setRecommendedFoods((prev) => mergeRecommendedFoods([food], prev));
    setFinalSearchTerm('');
    setSelectedTags([]);
    setIsFavoriteView(false);
    triggerLoading();
    setTimeout(() => {
      listScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 150);
  };

  const handleSearchInputChange = (value) => {
    setSearchTerm(value);
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }
    searchDebounceTimerRef.current = setTimeout(() => {
      searchMealsForSuggestions(value, 8);
    }, 300);
  };

  const handleSearchInputKeyDown = (e) => {
    if (showSearchSuggestions && searchSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedSuggestionIndex((prev) =>
          prev < searchSuggestions.length - 1 ? prev + 1 : prev,
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }
      if (e.key === 'Enter') {
        if (highlightedSuggestionIndex >= 0) {
          e.preventDefault();
          handleSelectSuggestion(searchSuggestions[highlightedSuggestionIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setShowSearchSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleFavorite = (id) => {
    const isFav = favorites.includes(id);
    setFavorites((prev) =>
      isFav ? prev.filter((favId) => favId !== id) : [...prev, id],
    );
  };

  const handleFilter = (label) => {
    triggerLoading();
    setSelectedTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label],
    );
  };

  const resetFilters = () => {
    triggerLoading();
    setSearchTerm('');
    setFinalSearchTerm('');
    setSelectedTags([]);
    setIsFavoriteView(false);
    setShowSearchSuggestions(false);
    setSearchSuggestions([]);
    setHighlightedSuggestionIndex(-1);
  };

  const resetTagFilters = () => {
    triggerLoading();
    setSelectedTags([]);
  };

  const retrySearchInput = () => {
    triggerLoading();
    setSearchTerm('');
    setFinalSearchTerm('');
    setShowSearchSuggestions(false);
    setSearchSuggestions([]);
    setHighlightedSuggestionIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleToggleCheck = (food) => {
    navigate('/home/dailyLog', { state: { food } });
  };

  const handleCardTagsChange = useCallback((foodId, nextTags = []) => {
    const deduped = [
      ...new Set((nextTags || []).map(normalizeTagLabel).filter(Boolean)),
    ];
    setRecommendedFoods((prev) =>
      prev.map((food) =>
        food.id === foodId ? { ...food, tags: deduped } : food,
      ),
    );
  }, []);

  const handleCardTagLoadingChange = useCallback((foodId, isLoading) => {
    setTagLoadingByFoodId((prev) => ({ ...prev, [foodId]: isLoading }));
  }, []);

  const performDelete = (id, name) => {
    const currentFoods = recommendedFoodsRef.current;
    const targetIndex = currentFoods.findIndex((f) => f.id === id);
    if (targetIndex < 0) return;

    const targetFood = currentFoods[targetIndex];
    setRecommendedFoods(currentFoods.filter((f) => f.id !== id));

    clearDeleteTimer();
    setDeleteNotice({
      food: {
        ...targetFood,
        name: name || targetFood.name || '음식',
      },
      index: targetIndex,
    });
    deleteTimerRef.current = setTimeout(() => {
      setDeleteNotice(null);
      deleteTimerRef.current = null;
    }, 5000);
  };

  const handleDelete = (id, name) => {
    const currentFoods = recommendedFoodsRef.current;
    const targetFood = currentFoods.find((f) => f.id === id);
    if (!targetFood) return;

    if (favorites.includes(id)) {
      setDeleteConfirm({
        id,
        name: name || targetFood.name || '음식',
      });
      return;
    }

    performDelete(id, name || targetFood.name);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm?.id) return;
    performDelete(deleteConfirm.id, deleteConfirm.name);
    setDeleteConfirm(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleUndoDelete = () => {
    if (!deleteNotice?.food) return;

    setRecommendedFoods((prev) => {
      if (prev.some((f) => f.id === deleteNotice.food.id)) return prev;
      const next = [...prev];
      const insertIndex = Math.min(deleteNotice.index, next.length);
      next.splice(insertIndex, 0, deleteNotice.food);
      return next;
    });

    clearDeleteTimer();
    setDeleteNotice(null);
  };

  // 필터링 및 정렬 로직
  const displayFoods = recommendedFoods
    .filter((food) => {
      const matchesSearch = food.name
        .toLowerCase()
        .includes(finalSearchTerm.toLowerCase());
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) =>
          food.tags?.some((foodTag) => normalizeTagLabel(foodTag) === tag),
        );
      const matchesFavorite = isFavoriteView
        ? favorites.includes(food.id)
        : true;
      return matchesSearch && matchesTags && matchesFavorite;
    })
    .sort((a, b) => {
      // 실제 정렬 로직 추가
      if (sortType === 'name') {
        return a.name.localeCompare(b.name); // 이름순 (ㄱ-ㅎ)
      } else if (sortType === 'namereverse') {
        return b.name.localeCompare(a.name); // 이름역순 (ㅎ-ㄱ)
      } else {
        // 최신순 (latest):
        return 0;
      }
    });

  useEffect(() => {
    if (displayFoods.length > 0) setHasEverHadDisplayedCards(true);
  }, [displayFoods.length]);

  const renderChatbotPanel = (showCloseButton = false) => (
    <>
      <div className="p-4 border-b border-gray-100 bg-white shrink-0 flex items-center justify-between">
        <h2 className="font-bold flex items-center gap-2">
          <TbMessageChatbot size={24} color="#FF8243" />
          <span className="text-lg">AI 식단 분석가</span>
        </h2>
        {showCloseButton && (
          <button
            onClick={() => setIsMobileChatbotOpen(false)}
            className="px-3 py-1.5 rounded-md text-[12px] font-semibold text-gray-600 hover:bg-gray-100"
          >
            닫기
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 p-4 overflow-y-auto bg-[#F9FBFA] space-y-4 custom-scrollbar"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`p-3 px-4 rounded-2xl shadow-sm max-w-[85%] whitespace-pre-wrap ${
                isUltraNarrowMobile ? 'text-[12px]' : 'text-sm'
              } ${
                msg.role === 'user'
                  ? 'bg-[#FF8243] text-white rounded-tr-none'
                  : 'bg-white text-[#1E2923] border border-gray-100 rounded-tl-none'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div
            className={`p-3 px-4 rounded-2xl shadow-sm text-gray-400 bg-white border border-gray-100 rounded-tl-none animate-pulse max-w-[85%] ${
              isUltraNarrowMobile ? 'text-[12px]' : 'text-sm'
            }`}
          >
            AI가 최적의 식단을 분석 중입니다 ...
          </div>
        )}
      </div>
      <div className="p-3 bg-white border-t border-gray-100 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="음식 이름이나 영양 고민을 입력하세요 ..."
            className="flex-1 p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#FF8243] text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading}
            className="bg-[#FF8243] text-white px-5 rounded-xl text-sm font-medium disabled:bg-gray-300 hover:bg-[#e6753d]"
          >
            전송
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="relative flex w-full p-4 gap-4 text-[#1E2923] bg-gray-50 h-[92vh] max-h-[1000px] overflow-hidden">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #FF8203; border-radius: 10px; }
        @keyframes recommend-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .recommend-float-img {
          animation: recommend-float 2.5s ease-in-out infinite;
          filter: drop-shadow(0 8px 16px rgba(245, 204, 184, 0.5));
        }
        @media (min-width: 1570px) {
          .recommend-float-img {
            height: 352px;
            width: auto;
            object-fit: contain;
          }
        }
        .recommend-hint-text .hint-line-1 { display: inline; }
        .recommend-hint-text .hint-line-2 { display: inline; }
        @media (max-width: 860px) and (min-width: 680px), (max-width: 530px) {
          .recommend-hint-text .hint-line-1 { display: block; }
        }
      `}</style>

      {/* 좌측: AI 챗봇 영역 */}
      <div
        className={`min-w-0 bg-white rounded-2xl border border-gray-100 flex flex-col overflow-hidden shadow-sm ${
          isNarrowMobile ? 'hidden' : 'max-[1299px]:w-1/2 min-[1300px]:flex-1'
        }`}
      >
        {renderChatbotPanel()}
      </div>

      {/* 우측: 리스트 영역 */}
      <div
        className={`flex flex-col min-w-0 bg-[#F9FBFA] h-full overflow-hidden relative pb-1 ${
          isNarrowMobile
            ? 'w-full pt-1'
            : 'max-[1299px]:w-1/2 min-[1300px]:flex-2 pt-1'
        }`}
      >
        <div className="shrink-0 space-y-2 mb-3 px-2">
          <div className="flex gap-2 items-center">
            {isNarrowMobile && !isMobileChatbotOpen && (
              <button
                onClick={() => setIsMobileChatbotOpen(true)}
                className="shrink-0 h-10 flex items-center gap-1.5 px-2.5 rounded-lg bg-[#FF8243] border border-[#FF8243] shadow-sm text-[12px] font-semibold text-white hover:bg-[#e6753d] hover:border-[#e6753d]"
              >
                <TbMessageChatbot size={15} color="#ffffff" />
                챗봇
              </button>
            )}
            <div ref={searchRef} className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="식단 검색 ..."
                value={searchTerm}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyDown={handleSearchInputKeyDown}
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSearchSuggestions(true);
                  }
                }}
                className="w-full h-10 pl-4 pr-10 bg-white rounded-xl shadow-sm border border-gray-100 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF8243]"
              />
              {isSearchSuggestLoading && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#FF8243] border-t-transparent rounded-full animate-spin" />
              )}
              <FaSearch
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer"
                onClick={handleSearch}
              />
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto custom-scrollbar">
                  {searchSuggestions.map((food, index) => (
                    <button
                      key={`${food.id}-${food.name}-${index}`}
                      type="button"
                      onClick={() => handleSelectSuggestion(food)}
                      className={`w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 transition-colors ${
                        highlightedSuggestionIndex === index
                          ? 'bg-orange-50'
                          : 'hover:bg-orange-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-semibold text-[#1E2923] truncate min-w-0">
                          {food.name}
                        </div>
                        <div className="text-[11px] text-[#FF8243] font-semibold shrink-0">
                          {food.kcal} kcal
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                triggerLoading();
                setIsFavoriteView(!isFavoriteView);
              }}
              className="shrink-0 w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl shadow-sm"
            >
              <FaStar
                size={18}
                color={isFavoriteView ? '#FF8243' : '#D1D5DB'}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:text-[#FF8243] transition-colors shrink-0"
            >
              <IoMdRefresh size={20} />
            </button>
            <div className="flex-1 flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
              {showTagSkeleton ? (
                <>
                  <div className="w-16 h-[30px] bg-gray-100 rounded-full animate-pulse shrink-0" />
                  <div className="w-20 h-[30px] bg-gray-100 rounded-full animate-pulse shrink-0" />
                  <div className="w-14 h-[30px] bg-gray-100 rounded-full animate-pulse shrink-0" />
                </>
              ) : (
                filterTags.map((label) => (
                  <button
                    key={label}
                    onClick={() => handleFilter(label)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full border font-medium transition-all ${
                      isUltraNarrowMobile ? 'text-[11px]' : 'text-[12px]'
                    } ${
                      selectedTags.includes(label)
                        ? 'bg-[#FF8243] text-white border-[#FF8243]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    #{label}
                  </button>
                ))
              )}
            </div>

            <div className="relative shrink-0" ref={sortRef}>
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-xl font-semibold text-gray-700 shadow-sm hover:border-[#FF8243] hover:shadow-md transition-all ${
                  isUltraNarrowMobile
                    ? 'pl-2 pr-1.5 py-2 text-[11px] min-w-[98px]'
                    : isNarrowMobile
                      ? 'pl-3 pr-2.5 py-2 text-[13px] min-w-[132px]'
                      : isHalfSplitLayout
                        ? 'pl-2.5 pr-2 py-2 text-[12px] min-w-[114px]'
                        : 'pl-4 pr-3 py-2.5 text-[14px] min-w-[190px]'
                }`}
              >
                <div
                  className={`flex items-center ${isUltraNarrowMobile ? 'gap-1' : 'gap-2'}`}
                >
                  <LuArrowDownUp
                    size={
                      isUltraNarrowMobile
                        ? 13
                        : isNarrowMobile
                          ? 16
                          : isHalfSplitLayout
                            ? 14
                            : 17
                    }
                    className={`text-[#FF8243] ${isUltraNarrowMobile ? 'mr-0' : 'mr-1'}`}
                  />
                  <span
                    className={
                      isUltraNarrowMobile
                        ? 'text-[11px]'
                        : isNarrowMobile
                          ? 'text-[13px]'
                          : isHalfSplitLayout
                            ? 'text-[12px]'
                            : 'text-[13px]'
                    }
                  >
                    {sortType === 'latest'
                      ? '최신순'
                      : sortType === 'name'
                        ? '이름순(ㄱ-ㅎ)'
                        : '이름순(ㅎ-ㄱ)'}
                  </span>
                </div>
              </button>

              {isSortOpen && (
                <div
                  className={`absolute right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden ${
                    isUltraNarrowMobile
                      ? 'w-24'
                      : isNarrowMobile
                        ? 'w-32'
                        : isHalfSplitLayout
                          ? 'w-28'
                          : 'w-40'
                  }`}
                >
                  {[
                    { label: '최신순', value: 'latest' },
                    { label: '이름순 (ㄱ-ㅎ)', value: 'name' },
                    { label: '이름순 (ㅎ-ㄱ)', value: 'namereverse' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortType(opt.value);
                        setIsSortOpen(false);
                        triggerLoading();
                      }}
                      className={`w-full flex items-center justify-between transition-colors hover:bg-gray-50 ${
                        isUltraNarrowMobile
                          ? 'px-2.5 py-2.5 text-[11px]'
                          : isNarrowMobile
                            ? 'px-3 py-2.5 text-[13px]'
                            : isHalfSplitLayout
                              ? 'px-3 py-2 text-[12px]'
                              : 'px-4 py-2.5 text-[13px]'
                      } ${
                        sortType === opt.value
                          ? 'text-[#FF8243] font-bold bg-orange-100/50'
                          : 'text-gray-600'
                      }`}
                    >
                      {opt.label}
                      {sortType === opt.value &&
                        (!isUltraNarrowMobile &&
                          (isNarrowMobile || !isHalfSplitLayout)) && (
                        <LuCheck
                          size={
                            isUltraNarrowMobile
                              ? 11
                              : isNarrowMobile
                                ? 14
                                : isHalfSplitLayout
                                  ? 12
                                  : 14
                          }
                        />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          ref={listScrollRef}
          className="flex-1 min-h-0 overflow-y-auto px-2 custom-scrollbar relative"
        >
          {isDataLoading && (
            <div className="sticky top-0 inset-x-0 h-full flex items-center justify-center bg-gray-50/50 z-20">
              <div className="w-8 h-8 border-4 border-[#FF8243] border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {displayFoods.length > 0 ? (
            <div className="grid grid-cols-1 min-[1300px]:grid-cols-2 gap-x-4 gap-y-1">
              {displayFoods.map((food, index) => (
                <FoodCardRecommend
                  key={`${food.id}-${food.name}-${index}`}
                  food={food}
                  isHalfSplitLayout={isHalfSplitLayout}
                  isNutrientSplitViewport={isNutrientSplitViewport}
                  forceSingleRowNutrients={
                    isNarrowMobile && !isUltraNarrowMobile
                  }
                  forceLargeSelectButton={isUltraNarrowMobile}
                  isFavorite={favorites.includes(food.id)}
                  onTagsChange={handleCardTagsChange}
                  onTagLoadingChange={handleCardTagLoadingChange}
                  forceTagSkeleton={showCardTagSkeleton}
                  onToggleFavorite={() => toggleFavorite(food.id)}
                  onDelete={(id, name) => handleDelete(id, name)}
                  onToggleCheck={() => handleToggleCheck(food)}
                />
              ))}
            </div>
          ) : (
            !isDataLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 h-full">
                {finalSearchTerm ? (
                  <p className="text-[16px] font-medium">
                    '{finalSearchTerm}' 검색 결과가 없습니다.
                  </p>
                ) : selectedTags.length > 0 ||
                  isFavoriteView ||
                  hasEverHadDisplayedCards ? (
                  <p className="text-[16px] font-medium">결과가 없습니다.</p>
                ) : (
                  <div className="flex flex-col items-center -mt-[7px]">
                    <img
                      src="/honeymat_hex.png"
                      alt="HoneyMat"
                      className="w-[45%] mx-auto recommend-float-img"
                    />
                    <p
                      className={`recommend-hint-text text-[#FF8243] text-center ${
                        isHalfSplitLayout
                          ? 'text-[13px] mt-[17px]'
                          : 'text-[15px] mt-[22px]'
                      }`}
                    >
                      <span className="hint-line-1">원하는 식단을 검색하거나</span>
                      <span className="hint-line-2"> 챗봇에게 추천받으세요</span>
                    </p>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2">
                  {selectedTags.length > 0 && (
                    <button
                      type="button"
                      onClick={resetTagFilters}
                      className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:text-[#FF8243] hover:border-[#FF8243] transition-colors"
                    >
                      태그 초기화
                    </button>
                  )}
                  {finalSearchTerm && (
                    <button
                      type="button"
                      onClick={retrySearchInput}
                      className="px-3 py-2 rounded-lg bg-[#FF8243] text-[13px] font-semibold text-white hover:bg-[#e6753d] transition-colors"
                    >
                      다시 입력하기
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {deleteNotice && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1rem)] max-w-[515px] max-[1200px]:max-w-[455px] max-[900px]:max-w-[415px] bg-gray-800 text-white rounded-lg px-4 py-3 shadow-lg flex items-center justify-between gap-3">
            <div className="ml-1 flex shrink-0 items-center">
              <FaCircle
                className="w-3 h-3 max-[800px]:w-2 max-[800px]:h-2"
                color="#FF8243"
              />
            </div>
            <p className="text-[15px] max-[1200px]:text-[12px] max-[900px]:text-[10px] min-w-0 flex-1">
              <span className="inline-block max-w-[230px] max-[1200px]:max-w-[180px] max-[900px]:max-w-[150px] truncate align-bottom font-bold">
                {deleteNotice.food.name}
              </span>
              <span> 이(가) 삭제되었습니다</span>
            </p>
            <button
              onClick={handleUndoDelete}
              className="shrink-0 px-3 py-1 rounded-md text-[15px] max-[1200px]:text-[12px] max-[900px]:text-[10px] underline font-semibold text-[#FF8243]"
            >
              취소
            </button>
          </div>
        )}

        {deleteConfirm && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-500/25 rounded-2xl">
            <div className="w-[92%] max-w-[380px] max-[1200px]:max-w-[320px] rounded-xl bg-white shadow-xl border border-gray-100">
              <p className="text-[16px] max-[1200px]:text-[12px] font-bold text-[#1E2923] mb-2 pl-3 pr-3 pt-3">
                정말로 지우시겠습니까?
              </p>
              <div className="h-[1.5px] bg-[#FF8243] m-2" />
              <p className="text-[14px] max-[1200px]:text-[10px] text-gray-500 mb-5 pl-3 pr-3 pb-1">
                <span> 고정한 </span>
                <span className="font-semibold text-gray-700">
                  {deleteConfirm.name}
                </span>
                <span> 이(가) 삭제됩니다.</span>
              </p>
              <div className="flex justify-end gap-3 pb-3 pr-3">
                <button
                  onClick={handleCancelDelete}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 text-[14px] max-[1200px]:text-[10px] font-medium hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-3 py-2 rounded-lg bg-[#FF8243] text-white text-[14px] max-[1200px]:text-[10px] font-semibold hover:bg-[#e6753d]"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isNarrowMobile && isMobileChatbotOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/35 flex overflow-hidden"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-[92%] max-w-[420px] h-full bg-white shadow-2xl border-r border-gray-200 flex flex-col overflow-hidden min-h-0">
            {renderChatbotPanel(true)}
          </div>
          <button
            aria-label="챗봇 닫기 배경"
            onClick={() => setIsMobileChatbotOpen(false)}
            className="flex-1"
          />
        </div>
      )}
    </div>
  );
};

export default RecommendPage;
