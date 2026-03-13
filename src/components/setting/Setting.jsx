import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, userApi } from '../../api/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
  Box,
  Button,
  TextField,
  Typography,
  InputAdornment,
  Checkbox,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  TagFacesOutlined,
  MonitorWeight,
  FitnessCenter,
  Restaurant,
  FavoriteBorder,
  LocalDining,
  SpaOutlined,
  GrainOutlined,
  NoFood,
  Logout,
  PersonRemove,
  Save,
  Restore,
  CameraAlt,
  Delete,
} from '@mui/icons-material';

// ─── 목표 / 식이 제한 옵션 (RegisterPage와 동일) ─────────────────────────────
const GOAL_OPTIONS = [
  {
    key: 'weight',
    label: '체중 관리',
    Icon: MonitorWeight,
    color: '#FF8243',
    bg: '#fff3ed',
  },
  {
    key: 'muscle',
    label: '근육 증가',
    Icon: FitnessCenter,
    color: '#5C6BC0',
    bg: '#e8eaf6',
  },
  {
    key: 'nutrition',
    label: '영양 균형',
    Icon: Restaurant,
    color: '#43A047',
    bg: '#e8f5e9',
  },
  {
    key: 'condition',
    label: '컨디션 관리',
    Icon: FavoriteBorder,
    color: '#EC407A',
    bg: '#fce4ec',
  },
];

const DIET_OPTIONS = [
  {
    key: 'lactose',
    label: '유당불내증',
    Icon: LocalDining,
    color: '#FFA726',
    bg: '#fff8e1',
  },
  {
    key: 'vegan',
    label: '채식주의',
    Icon: SpaOutlined,
    color: '#66BB6A',
    bg: '#e8f5e9',
  },
  {
    key: 'gluten',
    label: '글루텐 프리',
    Icon: GrainOutlined,
    color: '#8D6E63',
    bg: '#efebe9',
  },
  {
    key: 'nut',
    label: '견과류 알레르기',
    Icon: NoFood,
    color: '#EF5350',
    bg: '#ffebee',
  },
];

// 알림 유형별 메타데이터 (설명, 설정 가능한 항목)
const NOTIFICATION_TYPE_CONFIG = [
  {
    type: 'meal_nudge',
    label: '식사 기록 유도',
    description: '아침·점심·저녁 식사 시간에 기록을 잊지 않도록 알림',
    configFields: [
      { key: 'breakfastTime', label: '아침', default: '08:00' },
      { key: 'lunchTime', label: '점심', default: '12:30' },
      { key: 'dinnerTime', label: '저녁', default: '19:00' },
    ],
  },
  {
    type: 'streak',
    label: '연속 기록 응원',
    description: '아침·점심·저녁을 N일 연속으로 기록하면 격려 메시지',
    configFields: [{ key: 'time', label: '발송 시간', default: '23:00' }],
  },
  {
    type: 'insight_sugar_fat',
    label: '당류/지방 주의',
    description: '특정 끼니에서 당류·지방이 목표를 초과하면 피드백',
    configFields: [
      { key: 'time1', label: '점심 후 시간', default: '14:00' },
      { key: 'time2', label: '저녁 후 시간', default: '20:30' },
    ],
  },
  {
    type: 'insight_protein',
    label: '단백질 채우기 제안',
    description: '목표 단백질이 부족할 때 간식 추천',
    configFields: [{ key: 'time', label: '발송 시간', default: '20:00' }],
  },
  {
    type: 'recommendation_tomorrow',
    label: '내일 식단 제안',
    description: '오늘 부족한 영양소를 채울 내일 아침 메뉴 추천',
    configFields: [{ key: 'time', label: '발송 시간', default: '20:30' }],
  },
  {
    type: 'recommendation_menu',
    label: '메뉴 고민 해결',
    description: '점심·저녁 시간대에 날씨 기반 메뉴 추천',
    configFields: [
      { key: 'time1', label: '점심 시간대', default: '11:30' },
      { key: 'time2', label: '저녁 시간대', default: '17:30' },
    ],
  },
  {
    type: 'weekly_report',
    label: '주간 리포트',
    description: '매주 월요일에 지난주 영양 점수 리포트',
    configFields: [
      { key: 'dayOfWeek', label: '요일', default: 1, inputType: 'dayOfWeek' },
      { key: 'time', label: '발송 시간', default: '08:30' },
    ],
  },
  {
    type: 'goal_achievement',
    label: '목표 달성 축하',
    description: '주간 목표 달성 시 축하 메시지',
    configFields: [
      { key: 'dayOfWeek', label: '요일', default: 1, inputType: 'dayOfWeek' },
      { key: 'time', label: '발송 시간', default: '08:35' },
    ],
  },
];

const DAY_NAMES = [
  { value: 0, label: '일요일' },
  { value: 1, label: '월요일' },
  { value: 2, label: '화요일' },
  { value: 3, label: '수요일' },
  { value: 4, label: '목요일' },
  { value: 5, label: '금요일' },
  { value: 6, label: '토요일' },
];

const textFieldFocusStyle = {
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused fieldset': {
      borderColor: '#FF8243',
    },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#FF8243',
  },
};

function CheckboxGrid({ options, selected, onChange }) {
  const toggle = (key) => {
    onChange(
      selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key],
    );
  };
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
      {options.map(({ key, label, Icon, color, bg }) => {
        const checked = selected.includes(key);
        return (
          <Box
            key={key}
            onClick={() => toggle(key)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              px: 1.5,
              py: 1.2,
              borderRadius: 2,
              cursor: 'pointer',
              border: `1.5px solid ${checked ? color : '#e8ecf0'}`,
              bgcolor: checked ? bg : '#fafafa',
              transition: 'all 0.15s',
              '&:hover': { borderColor: color, bgcolor: bg },
            }}
          >
            <Checkbox
              checked={checked}
              size="small"
              sx={{ p: 0, color: '#cbd5e1', '&.Mui-checked': { color } }}
            />
            <Icon sx={{ fontSize: 18, color: checked ? color : '#94a3b8' }} />
            <Typography
              variant="body2"
              fontWeight={checked ? 700 : 400}
              sx={{
                color: checked ? color : 'text.primary',
                fontSize: '0.82rem',
              }}
            >
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

export default function Setting() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile, updateProfile, fetchProfile, setProfileImage } =
    useProfile();
  const { notificationEnabled, setNotificationEnabled, notificationLoading } =
    useNotification();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [typeSettings, setTypeSettings] = useState({});
  const [typeSettingsLoading, setTypeSettingsLoading] = useState(false);
  const [typeSettingsSaving, setTypeSettingsSaving] = useState(false);
  const fileInputRef = useRef(null);

  // 로컬 form 상태 (수정하기 버튼 누르기 전까지 sidebar에 반영되지 않음)
  const [form, setForm] = useState({
    nickname: '',
    height: '',
    weight: '',
    goals: [],
    dietary: [],
  });

  // 페이지 진입 시 서버에서 최신 프로필 조회 (마운트 시 1회)
  useEffect(() => {
    fetchProfile().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 알림 유형별 설정 조회
  const fetchTypeSettings = useCallback(async () => {
    try {
      setTypeSettingsLoading(true);
      const res = await userApi.getNotificationTypeSettings();
      const data = res.data ?? res;
      if (data && typeof data === 'object') {
        setTypeSettings(data);
      }
    } catch {
      // 무시
    } finally {
      setTypeSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTypeSettings();
  }, [fetchTypeSettings]);

  const handleTypeSettingChange = (typeKey, field, value) => {
    setTypeSettings((prev) => {
      const current = prev[typeKey] ?? { enabled: true, config: {} };
      return {
        ...prev,
        [typeKey]: {
          ...current,
          ...(field === 'enabled'
            ? { enabled: value }
            : { config: { ...current.config, [field]: value } }),
        },
      };
    });
    setError('');
  };

  const getTypeSettingValue = (typeKey, configKey, defaultVal) => {
    return typeSettings[typeKey]?.config?.[configKey] ?? defaultVal;
  };

  const getTypeEnabled = (typeKey) => {
    return typeSettings[typeKey]?.enabled ?? true;
  };

  const handleResetTypeSettings = () => {
    const defaults = {};
    NOTIFICATION_TYPE_CONFIG.forEach(({ type, configFields }) => {
      const config = {};
      configFields?.forEach(({ key, default: d }) => {
        config[key] = d;
      });
      defaults[type] = { enabled: true, config };
    });
    setTypeSettings(defaults);
    setError('');
    setInfoMessage(
      '기본값으로 초기화되었습니다. 저장하려면 "알림 설정 저장"을 눌러주세요.',
    );
  };

  const handleSaveTypeSettings = async () => {
    setTypeSettingsSaving(true);
    setError('');
    setInfoMessage('');
    try {
      const updates = {};
      NOTIFICATION_TYPE_CONFIG.forEach(({ type, configFields }) => {
        const s = typeSettings[type] ?? { enabled: true, config: {} };
        const config = {};
        configFields?.forEach(({ key, default: d }) => {
          config[key] = s.config?.[key] ?? d;
        });
        updates[type] = {
          enabled: s.enabled ?? true,
          config,
        };
      });
      const res = await userApi.updateNotificationTypeSettings(updates);
      if (res?.data) setTypeSettings(res.data);
      else await fetchTypeSettings();
      setInfoMessage('알림 설정이 저장되었습니다.');
    } catch (err) {
      setError(err.message || '알림 설정 저장에 실패했습니다.');
    } finally {
      setTypeSettingsSaving(false);
    }
  };

  // profile이 변경되면 로컬 form 상태 초기화
  useEffect(() => {
    setForm({
      nickname: profile.nickname || '',
      height: profile.height || '',
      weight: profile.weight || '',
      goals: profile.goals || [],
      dietary: profile.dietary || [],
    });
  }, [profile]);

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // 프로필 이미지 선택 핸들러
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 체크 (2MB 제한)
      if (file.size > 2 * 1024 * 1024) {
        setError('이미지 크기는 2MB 이하여야 합니다.');
        return;
      }

      setError('');
      setInfoMessage('');

      try {
        // 서버에 이미지 업로드
        const response = await authApi.uploadProfileImage(file);

        // 서버에서 반환한 이미지 URL로 프로필 업데이트
        const imageUrl = response.data?.profileImage || response.profileImage;
        if (imageUrl) {
          setProfileImage(imageUrl);
        } else {
          // URL이 없으면 base64로 로컬 표시
          const reader = new FileReader();
          reader.onload = (event) => {
            setProfileImage(event.target.result);
          };
          reader.readAsDataURL(file);
        }

        setInfoMessage('프로필 사진이 변경되었습니다.');
      } catch (err) {
        setError(err.message || '프로필 사진 업로드에 실패했습니다.');
      }
    }
  };

  // 프로필 이미지 삭제 핸들러
  const handleImageRemove = async () => {
    setError('');
    setInfoMessage('');

    try {
      // 서버에서 이미지 삭제
      await authApi.deleteProfileImage();

      setProfileImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setInfoMessage('프로필 사진이 삭제되었습니다.');
    } catch (err) {
      setError(err.message || '프로필 사진 삭제에 실패했습니다.');
    }
  };

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    setError('');
    setInfoMessage('');
    try {
      await authApi.updateProfile({
        nickname: form.nickname,
        height: Number(form.height) || 0,
        weight: Number(form.weight) || 0,
        goals: form.goals,
        dietaryRestrictions: form.dietary,
      });
      // 수정 성공 후 서버에서 최신 데이터 다시 조회 (sidebar 업데이트)
      await fetchProfile();
      setInfoMessage('프로필이 성공적으로 수정되었습니다.');
    } catch (err) {
      setError(err.message || '프로필 수정에 실패했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    setError('');
    try {
      await authApi.logout();
    } catch {
      // 서버 오류 시에도 로컬 로그아웃 진행
    } finally {
      auth.logout();
      navigate('/login');
      setLogoutLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setError('');
    setInfoMessage('');
    try {
      await authApi.withdraw();
      setDeleteDialogOpen(false);
      auth.logout();
      navigate('/login');
    } catch (err) {
      setError(err.message || '회원탈퇴에 실패했습니다.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-2 min-h-screen">
      <div className="bg-[#F2F9F5] text-[#1E2923] w-full max-w-2xl mx-auto rounded-2xl border border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 border-b border-gray-200 pb-3">
          환경설정
        </h2>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}
        {infoMessage && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            {infoMessage}
          </Alert>
        )}

        {/* ── 프로필 정보 (회원가입 폼과 동일한 형태) ── */}
        <Box className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <Typography
            variant="subtitle1"
            fontWeight={700}
            color="text.secondary"
            mb={2}
          >
            프로필 정보
          </Typography>

          {/* 프로필 사진 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar
                src={profile.profileImage}
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: '#ff8243',
                  fontSize: '2rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: '3px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {!profile.profileImage &&
                  (form.nickname || '사용자').charAt(0).toUpperCase()}
              </Avatar>
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: '#ff8243',
                  color: '#fff',
                  width: 28,
                  height: 28,
                  '&:hover': { bgcolor: '#e05a1f' },
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}
              >
                <CameraAlt sx={{ fontSize: 16 }} />
              </IconButton>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.primary"
                mb={0.5}
              >
                프로필 사진
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={1}
              >
                JPG, PNG 형식 (최대 2MB)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    fontSize: '0.75rem',
                    borderColor: '#e2e8f0',
                    color: 'text.secondary',
                    '&:hover': { borderColor: '#ff8243', color: '#ff8243' },
                  }}
                >
                  사진 변경
                </Button>
                {profile.profileImage && (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={handleImageRemove}
                    startIcon={<Delete sx={{ fontSize: 14 }} />}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    삭제
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {/* 닉네임 */}
          <TextField
            fullWidth
            label="닉네임"
            value={form.nickname}
            onChange={(e) => handleFormChange('nickname', e.target.value)}
            placeholder="앱에서 사용할 이름"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TagFacesOutlined
                    sx={{ color: 'text.secondary', fontSize: 20 }}
                  />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3, ...textFieldFocusStyle }}
          />

          {/* 키 / 몸무게 */}
          <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
            <TextField
              fullWidth
              label="키"
              type="number"
              value={form.height}
              onChange={(e) => handleFormChange('height', e.target.value)}
              placeholder="170"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary">
                      cm
                    </Typography>
                  </InputAdornment>
                ),
              }}
              sx={{ ...textFieldFocusStyle }}
            />
            <TextField
              fullWidth
              label="몸무게"
              type="number"
              value={form.weight}
              onChange={(e) => handleFormChange('weight', e.target.value)}
              placeholder="65"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="body2" color="text.secondary">
                      kg
                    </Typography>
                  </InputAdornment>
                ),
              }}
              sx={{ ...textFieldFocusStyle }}
            />
          </Box>

          {/* 목표 선택 */}
          <Box sx={{ mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                mb: 1.5,
              }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
              >
                목표 선택
              </Typography>
              <Typography variant="caption" color="text.disabled">
                중복 선택 가능
              </Typography>
            </Box>
            <CheckboxGrid
              options={GOAL_OPTIONS}
              selected={form.goals}
              onChange={(v) => handleFormChange('goals', v)}
            />
          </Box>

          {/* 식이 제한 */}
          <Box sx={{ mb: 0 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                mb: 1.5,
              }}
            >
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.secondary"
              >
                식이 제한
              </Typography>
              <Typography variant="caption" color="text.disabled">
                해당하는 항목 선택
              </Typography>
            </Box>
            <CheckboxGrid
              options={DIET_OPTIONS}
              selected={form.dietary}
              onChange={(v) => handleFormChange('dietary', v)}
            />
          </Box>

          {/* 수정하기 버튼 */}
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSaveProfile}
            disabled={saveLoading}
            startIcon={<Save />}
            sx={{
              mt: 3,
              py: 1.5,
              bgcolor: '#FF8243',
              '&:hover': { bgcolor: '#E05A1F' },
            }}
          >
            {saveLoading ? '저장 중...' : '수정하기'}
          </Button>
        </Box>

        {/* ── 알림 설정 ── */}
        <Box className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <Typography
            variant="subtitle1"
            fontWeight={700}
            color="text.secondary"
            mb={2}
          >
            알림 설정
          </Typography>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              전체 알림 ON/OFF
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={notificationEnabled}
                  onChange={(e) => setNotificationEnabled(e.target.checked)}
                  disabled={notificationLoading}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF8243' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#FF8243',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  {notificationLoading
                    ? '저장 중...'
                    : notificationEnabled
                      ? '알림 켜짐'
                      : '알림 꺼짐'}
                </Typography>
              }
            />
          </Box>

          {notificationEnabled && (
            <>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                알림 유형별 설정
              </Typography>

              {typeSettingsLoading ? (
                <Typography
                  variant="body2"
                  color="text.disabled"
                  sx={{ py: 2 }}
                >
                  로딩 중...
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    mb: 3,
                  }}
                >
                  {NOTIFICATION_TYPE_CONFIG.map(
                    ({ type, label, description, configFields }) => (
                      <Box
                        key={type}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: getTypeEnabled(type)
                            ? 'transparent'
                            : 'action.hover',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: 1,
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block', mt: 0.5 }}
                            >
                              {description}
                            </Typography>
                          </Box>
                          <FormControlLabel
                            control={
                              <Switch
                                size="small"
                                checked={getTypeEnabled(type)}
                                onChange={(e) =>
                                  handleTypeSettingChange(
                                    type,
                                    'enabled',
                                    e.target.checked,
                                  )
                                }
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#FF8243',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track':
                                    {
                                      backgroundColor: '#FF8243',
                                    },
                                }}
                              />
                            }
                            label=""
                          />
                        </Box>
                        {configFields &&
                          configFields.length > 0 &&
                          getTypeEnabled(type) && (
                            <Box
                              sx={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 2,
                                mt: 2,
                              }}
                            >
                              {configFields.map(
                                ({
                                  key,
                                  label: fieldLabel,
                                  default: defaultVal,
                                  inputType,
                                }) =>
                                  inputType === 'dayOfWeek' ? (
                                    <FormControl
                                      key={key}
                                      size="small"
                                      sx={{ minWidth: 120 }}
                                    >
                                      <InputLabel>{fieldLabel}</InputLabel>
                                      <Select
                                        value={Number(
                                          getTypeSettingValue(
                                            type,
                                            key,
                                            defaultVal,
                                          ),
                                        )}
                                        label={fieldLabel}
                                        onChange={(e) =>
                                          handleTypeSettingChange(
                                            type,
                                            key,
                                            e.target.value,
                                          )
                                        }
                                      >
                                        {DAY_NAMES.map((d) => (
                                          <MenuItem
                                            key={d.value}
                                            value={d.value}
                                          >
                                            {d.label}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                  ) : (
                                    <TextField
                                      key={key}
                                      type="time"
                                      label={fieldLabel}
                                      value={getTypeSettingValue(
                                        type,
                                        key,
                                        defaultVal,
                                      )}
                                      onChange={(e) =>
                                        handleTypeSettingChange(
                                          type,
                                          key,
                                          e.target.value,
                                        )
                                      }
                                      size="small"
                                      InputLabelProps={{ shrink: true }}
                                      inputProps={{ step: 300 }}
                                      sx={{
                                        maxWidth: 150,
                                        ...textFieldFocusStyle,
                                      }}
                                    />
                                  ),
                              )}
                            </Box>
                          )}
                      </Box>
                    ),
                  )}
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleResetTypeSettings}
                  startIcon={<Restore />}
                  sx={{
                    borderColor: '#e2e8f0',
                    color: 'text.secondary',
                    '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                  }}
                >
                  알림 설정 초기화
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveTypeSettings}
                  disabled={typeSettingsLoading || typeSettingsSaving}
                  startIcon={<Save />}
                  sx={{
                    bgcolor: '#FF8243',
                    '&:hover': { bgcolor: '#E05A1F' },
                  }}
                >
                  {typeSettingsSaving ? '저장 중...' : '알림 설정 저장'}
                </Button>
              </Box>
            </>
          )}
        </Box>

        {/* ── 로그아웃 / 회원탈퇴 ── */}
        <Box className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={handleLogout}
            disabled={logoutLoading}
            startIcon={<Logout />}
            sx={{
              py: 1.5,
              borderColor: '#e2e8f0',
              color: 'text.secondary',
              '&:hover': {
                borderColor: '#FF8243',
                color: '#FF8243',
                bgcolor: '#fff3ed',
              },
            }}
          >
            로그아웃
          </Button>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
            startIcon={<PersonRemove />}
            sx={{
              py: 1.5,
              borderColor: '#fecaca',
              '&:hover': {
                borderColor: '#ef4444',
                bgcolor: '#fef2f2',
              },
            }}
          >
            회원탈퇴
          </Button>
        </Box>
      </div>

      {/* 회원탈퇴 확인 모달 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3, minWidth: 320 },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>회원탈퇴 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            정말로 회원탈퇴 하시겠습니까? 탈퇴 시 모든 데이터가 삭제되며 복구할
            수 없습니다.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleteLoading}
            sx={{ color: 'text.secondary' }}
          >
            취소
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={deleteLoading}
            sx={{
              bgcolor: '#ef4444',
              '&:hover': { bgcolor: '#dc2626' },
            }}
          >
            {deleteLoading ? '처리 중...' : '탈퇴하기'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
