import { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useNotification } from '../../contexts/NotificationContext';
import { authApi } from '../../api/auth';

const TopBar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { profile } = useProfile();
  const { notificationEnabled, hasUnreadNotifications } = useNotification();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/home', icon: <Home size={20} />, label: '홈' },
    { path: '/home/recommendation', icon: <Utensils size={20} />, label: '식단추천' },
    { path: '/home/scanAnalysis', icon: <Search size={20} />, label: 'AI 식단분석' },
    { path: '/home/dailyLog', icon: <ClipboardList size={20} />, label: '일일식사기록' },
    { path: '/home/report', icon: <BarChart3 size={20} />, label: '주간리포트' },
  ];

  const bellIcon = notificationEnabled ? <Bell size={18} /> : <BellOff size={18} />;
  const bottomItems = [
    {
      path: '/home/notifications',
      icon: (
        <span className="relative inline-flex">
          {bellIcon}
          {notificationEnabled && hasUnreadNotifications && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </span>
      ),
      label: notificationEnabled ? '알림' : '알림 꺼짐',
    },
    { path: '/home/settings', icon: <Settings size={18} />, label: '환경설정' },
  ];

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {}
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
      isActive
        ? 'bg-[#f2f9f5]/20 text-[#f2f9f5] font-semibold'
        : 'text-[#f2f9f5] hover:bg-[#f2f9f5]/10'
    }`;

  return (
    <>
      {/* 상단 고정 바 */}
      <header
        className="fixed top-0 left-0 w-full h-14 z-30 flex items-center justify-between px-6 shadow-md"
        style={{ backgroundColor: '#ff8243' }}
      >
        <button
          onClick={() => { setMenuOpen(false); navigate('/home'); }}
          className="flex items-center gap-2"
        >
          <img src="/logo1.png" alt="HoneyMat" className="h-9 w-auto object-contain" />
          <span className="text-lg font-bold text-[#f2f9f5]">HoneyMat</span>
        </button>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="text-[#f2f9f5] p-1"
          aria-label="메뉴 열기"
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* 드롭다운 메뉴 */}
      {menuOpen && (
        <>
          {/* 배경 오버레이 (클릭 시 닫힘) */}
          <div
            className="fixed inset-0 z-20 top-14"
            onClick={() => setMenuOpen(false)}
          />

          {/* 메뉴 패널 */}
          <div
            className="fixed top-14 left-0 w-full z-30 shadow-lg overflow-hidden"
            style={{ backgroundColor: '#ff8243' }}
          >
            <nav className="px-4 py-2 space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={navLinkClass}
                  end={item.path === '/home'}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="border-t border-[#f2f9f5]/20 px-4 py-2 space-y-1">
              {bottomItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg transition-all ${
                      isActive ? 'bg-white/15 font-semibold' : 'hover:bg-white/10'
                    }`
                  }
                  style={{ color: '#f2f9f5' }}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            <div className="px-4 py-3 border-t border-[#f2f9f5]/20">
              {isAuthenticated ? (
                <div className="mx-1 p-3 rounded-2xl bg-[#ff8d54] shadow-md">
                  <div className="flex items-center gap-3">
                    {profile?.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt="프로필"
                        className="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        <span className="text-[#ff8243] font-bold text-sm">
                          {(profile?.nickname || user?.nickname || '사용자').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {profile?.nickname || user?.nickname || '사용자'}
                      </p>
                      <p className="text-white/80 text-xs truncate">
                        {user?.email || '환영합니다'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-white/25 hover:bg-white/35 text-white transition-all"
                  >
                    <LogOut size={14} />
                    <span>로그아웃</span>
                  </button>
                </div>
              ) : (
                <NavLink
                  to="/login"
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#ff8d54] text-white font-semibold text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  <User size={18} />
                  <span>로그인</span>
                </NavLink>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default TopBar;
