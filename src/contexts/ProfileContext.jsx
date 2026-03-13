import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { authApi } from '../api/auth';

const PROFILE_IMAGE_KEY = 'profileImage';

const defaultProfile = {
  nickname: '',
  height: '',
  weight: '',
  goals: [],
  dietary: [],
  profileImage: null, // base64 이미지 또는 URL
};

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { user, updateUser } = useAuth();
  const [profile, setProfileState] = useState(() => {
    // 초기 로드 시 localStorage에서 프로필 이미지 복원
    const savedImage = localStorage.getItem(PROFILE_IMAGE_KEY);
    return { ...defaultProfile, profileImage: savedImage || null };
  });

  // user 변경 시 프로필 상태 업데이트 (로그인 응답의 user 데이터 사용)
  useEffect(() => {
    if (!user) {
      setProfileState((prev) => ({ ...defaultProfile, profileImage: prev.profileImage }));
      return;
    }

    // localStorage에서 저장된 프로필 이미지 가져오기
    const savedImage = localStorage.getItem(PROFILE_IMAGE_KEY);

    // auth.user 데이터에서 프로필 추출
    const profileFromUser = {
      nickname: user.nickname ?? '',
      height: user.height != null ? String(user.height) : '',
      weight: user.weight != null ? String(user.weight) : '',
      goals: Array.isArray(user.goals) ? user.goals : [],
      dietary: Array.isArray(user.dietaryRestrictions)
        ? user.dietaryRestrictions
        : (Array.isArray(user.dietary) ? user.dietary : []),
      profileImage: user.profileImage || savedImage || null,
    };

    setProfileState(profileFromUser);
  }, [user]);

  // 서버에서 프로필 조회 (GET /api/auth/me)
  const fetchProfile = useCallback(async () => {
    try {
      const data = await authApi.getProfile();

      // 응답이 { success, data: {...} } 형태인 경우 data 추출
      const userData = data.data || data.user || data;

      // localStorage에서 저장된 프로필 이미지 가져오기
      const savedImage = localStorage.getItem(PROFILE_IMAGE_KEY);

      const fetched = {
        nickname: userData.nickname ?? '',
        height: userData.height != null ? String(userData.height) : '',
        weight: userData.weight != null ? String(userData.weight) : '',
        goals: Array.isArray(userData.goals) ? userData.goals : [],
        dietary: Array.isArray(userData.dietaryRestrictions)
          ? userData.dietaryRestrictions
          : (Array.isArray(userData.dietary) ? userData.dietary : []),
        profileImage: userData.profileImage || savedImage || null,
      };
      setProfileState(fetched);

      // localStorage의 user 데이터도 업데이트 (기존 user와 병합하여 id 등 유지)
      if (updateUser && user) {
        updateUser({ ...user, ...userData });
      }

      return fetched;
    } catch (err) {
      console.error('프로필 조회 실패:', err);
      throw err;
    }
  }, [updateUser, user]);

  // 프로필 이미지 업데이트 (localStorage에도 저장)
  const setProfileImage = useCallback((imageData) => {
    if (imageData) {
      localStorage.setItem(PROFILE_IMAGE_KEY, imageData);
    } else {
      localStorage.removeItem(PROFILE_IMAGE_KEY);
    }
    setProfileState((prev) => ({ ...prev, profileImage: imageData }));
  }, []);

  // 프로필 로컬 상태 업데이트
  const updateProfile = useCallback((fieldOrUpdates, value) => {
    setProfileState((prev) => {
      const updates =
        typeof fieldOrUpdates === 'string'
          ? { [fieldOrUpdates]: value }
          : fieldOrUpdates;
      return { ...prev, ...updates };
    });
  }, []);

  const value = {
    profile,
    updateProfile,
    fetchProfile,
    setProfileImage,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
