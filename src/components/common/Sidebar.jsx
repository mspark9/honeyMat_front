import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Utensils,
  Search,
  ClipboardList,
  BarChart3,
  Bell,
  BellOff,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useNotification } from '../../contexts/NotificationContext';
import { authApi } from '../../api/auth';

const Sidebar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { profile } = useProfile();
  const { notificationEnabled, hasUnreadNotifications } = useNotification();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/home', icon: <Home size={20} />, label: '홈' },
    {
      path: '/home/recommendation',
      icon: <Utensils size={20} />,
      label: '식단추천',
    },
    {
      path: '/home/scanAnalysis',
      icon: <Search size={20} />,
      label: 'AI 식단분석',
    },
    {
      path: '/home/dailyLog',
      icon: <ClipboardList size={20} />,
      label: '일일식사기록',
    },
    {
      path: '/home/report',
      icon: <BarChart3 size={20} />,
      label: '주간리포트',
    },
  ];

  const bellIcon = notificationEnabled ? (
    <Bell size={18} />
  ) : (
    <BellOff size={18} />
  );
  const notificationItem = {
    path: '/home/notifications',
    icon: (
      <span className="relative inline-flex">
        {bellIcon}
        {notificationEnabled && hasUnreadNotifications && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full"
            aria-hidden="true"
          />
        )}
      </span>
    ),
    label: notificationEnabled ? '알림' : '알림 꺼짐',
  };
  const bottomItems = [
    notificationItem,
    { path: '/home/settings', icon: <Settings size={18} />, label: '환경설정' },
  ];

  const navLinkClass = ({ isActive }) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isActive
        ? 'bg-[#f2f9f5]/20 text-[#f2f9f5] shadow-md font-semibold'
        : 'text-[#f2f9f5] hover:bg-[#f2f9f5]/10'
    }`;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // 서버 로그아웃 실패해도 클라이언트는 로그아웃 처리
    }
    logout();
    navigate('/login');
  };

  return (
    <aside
      className="w-64 h-screen flex flex-col py-8 px-4 fixed left-0 top-0 z-20 shrink-0 border-r border-[#ff8243]/20"
      style={{ backgroundColor: '#ff8243' }}
    >
      <div className="flex items-center gap-2 px-4 mb-10 shrink-0">
        <img
          src="/logo1.png"
          alt="HoneyMat"
          className="h-12 w-auto object-contain rounded-[8px]"
        />
        <h1 className="text-xl font-bold" style={{ color: '#f2f9f5' }}>
          HoneyMat
        </h1>
      </div>

      <nav className="flex-1 space-y-2 min-h-0 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={navLinkClass}
            end={item.path === '/home'}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[#f2f9f5]/20 pt-4 pb-4 space-y-2 shrink-0">
        {bottomItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${
                isActive ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'
              }`
            }
            style={{ color: '#f2f9f5' }}
          >
            {item.icon} <span>{item.label}</span>
          </NavLink>
        ))}

        {/* 사용자 프로필 카드 */}
        {isAuthenticated ? (
          <div className="mt-3 mx-1 p-3 rounded-2xl bg-[#ff8d54] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3">
              {/* 아바타 */}
              {profile?.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt="프로필"
                  className="w-10 h-10 rounded-full object-cover shadow-md border-2 border-white/50"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
                  <span className="text-[#ff8243] font-bold text-sm">
                    {(profile?.nickname || user?.nickname || '사용자')
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
              )}
              {/* 사용자 정보 */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate drop-shadow-sm">
                  {profile?.nickname || user?.nickname || '사용자'}
                </p>
                <p className="text-white/80 text-xs truncate">
                  {user?.email || '환영합니다'}
                </p>
              </div>
            </div>
            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-white/25 hover:bg-white/35 text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <LogOut size={14} />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          <NavLink
            to="/login"
            className="mt-3 mx-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#ff8d54] hover:bg-[#ff9a6c] text-white font-semibold text-sm shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <User size={18} />
            <span>로그인</span>
          </NavLink>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
