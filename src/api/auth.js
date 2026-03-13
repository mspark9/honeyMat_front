const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'accessToken';

// 토큰 가져오기/저장하기
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user');
}

// 토큰 갱신 중복 방지
let isRefreshing = false;
let refreshPromise = null;

// 토큰 갱신 함수
async function refreshToken() {
    if (isRefreshing) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.message ?? '토큰 갱신 실패');
            }

            // 새 access token 저장
            if (data.accessToken) {
                setToken(data.accessToken);
                return data.accessToken;
            }

            throw new Error('새 토큰을 받지 못했습니다');
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// API 요청 함수 (401 시 자동 토큰 갱신)
async function request(path, options = {}, isRetry = false) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;
    const headers = {
        // FormData일 경우 Content-Type 생략 (브라우저가 자동 설정)
        ...(!isFormData && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
    });

    // 401 에러 시 토큰 갱신 후 재시도 (refresh 요청 자체는 제외)
    if (res.status === 401 && !isRetry && !path.includes('/auth/refresh')) {
        try {
            await refreshToken();
            // 새 토큰으로 재시도
            return request(path, options, true);
        } catch (refreshError) {
            // 갱신 실패 시 로그아웃 처리
            clearAuth();
            window.location.href = '/login';
            throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
        }
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(data.message ?? `요청 실패 (${res.status})`);
    }

    return data;
}

// 인증 관련 API
export const authApi = {
    signup: (email, password, nickname, gender, age_group, height, weight, goals, dietary_restrictions) =>
        request('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ email, password, nickname, gender, age_group, height, weight, goals, dietary_restrictions }),
        }),

    login: (email, password) =>
        request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        }),

    logout: () =>
        request('/api/auth/logout', { method: 'POST' }),

    refresh: () =>
        request('/api/auth/refresh', { method: 'POST' }),

    // 프로필 조회 (GET /api/auth/me)
    getProfile: () =>
        request('/api/auth/me', { method: 'GET' }),

    // 프로필 수정 (PUT /api/auth/profile)
    updateProfile: (profileData) =>
        request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        }),

    // 회원탈퇴 (DELETE /api/auth/withdraw)
    withdraw: () =>
        request('/api/auth/withdraw', { method: 'DELETE' }),

    // 프로필 이미지 업로드 (POST /api/auth/profile/image)
    uploadProfileImage: (file) => {
        const formData = new FormData();
        formData.append('profileImage', file);
        return request('/api/auth/profile/image', { method: 'POST', body: formData });
    },

    // 프로필 이미지 삭제 (DELETE /api/auth/profile/image)
    deleteProfileImage: () =>
        request('/api/auth/profile/image', { method: 'DELETE' }),
};

// 사용자 관련 API
export const userApi = {
    // 알림 설정 조회 (GET /api/users/me/notification-settings)
    getNotificationSettings: () =>
        request('/api/users/me/notification-settings', { method: 'GET' }),

    // 알림 설정 업데이트 (PUT /api/users/me/notification-settings)
    updateNotificationSettings: (enabled) =>
        request('/api/users/me/notification-settings', {
            method: 'PUT',
            body: JSON.stringify({ receiveNotifications: enabled }),
        }),

    // meal_nudge 식사 기록 시간 조회 (GET /api/users/me/meal-pattern)
    getMealPattern: () =>
        request('/api/users/me/meal-pattern', { method: 'GET' }),

    // meal_nudge 식사 기록 시간 수정 (PUT /api/users/me/meal-pattern)
    updateMealPattern: (data) =>
        request('/api/users/me/meal-pattern', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    // 알림 유형별 설정 조회 (GET /api/users/me/notification-type-settings)
    getNotificationTypeSettings: () =>
        request('/api/users/me/notification-type-settings', { method: 'GET' }),

    // 알림 유형별 설정 수정 (PUT /api/users/me/notification-type-settings)
    updateNotificationTypeSettings: (data) =>
        request('/api/users/me/notification-type-settings', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
};

// 일반 API 요청용 (인증 필요한 API에서 사용)
export const api = {
    get: (path) => request(path, { method: 'GET' }),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (path) => request(path, { method: 'DELETE' }),
};
