// 嵌套路由出口组件
import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { useEffect, useContext } from "react";
import "./layout.css";
import { AuthContext } from "@/auth/AuthContext.jsx";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  const role = user.role;
  const account = user.email;
  const currentPath = location.pathname;
  const menuItems =
    role === "MERCHANT"
      ? [
          { key: "home", label: "概览", path: "/home-merchant" },
          { key: "hotels", label: "酒店列表", path: "/merchant-hotelList" },
          { key: "add", label: "添加酒店", path: "/hotelAdd" },
        ]
      : [
          { key: "home", label: "概览", path: "/home-admin" },
          { key: "hotels", label: "酒店审核", path: "/admin-hotelList" },
          { key: "add", label: "添加酒店", path: "/hotelAdd" },
        ];

  // ✅ 进入后台时，根据角色跳转默认页面
  useEffect(() => {
    // 未登录，直接回登录页
    if (!role) {
      navigate("/login");
      return;
    }

    // 如果当前路径是首页 /
    if (location.pathname === "/") {
      if (role === "MERCHANT") {
        navigate("/home-merchant");
      } else if (role === "ADMIN") {
        navigate("/home-admin");
      }
    }
  }, [role, location.pathname, navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="layout">
      {/* 左侧菜单 */}
      <aside className="sider">
        <div className="logo">
          <div className="logo-mark">易宿</div>
          <div className="logo-text">
            <div>酒店管理后台</div>
            <small>{role === "ADMIN" ? "管理员端" : "商家端"}</small>
          </div>
        </div>

        <nav className="menu">
          <div className="menu-section-title">导航</div>
          {menuItems.map((item) => (
            <div
              key={item.key}
              className={`menu-item ${currentPath === item.path ? "active" : ""}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </div>
          ))}
        </nav>
        <div className="sider-footer">
          <div className="sider-footer-label">当前角色</div>
          <div className={`role-pill ${role === "ADMIN" ? "admin" : "merchant"}`}>
            {role === "ADMIN" ? "管理员" : "商家"}
          </div>
        </div>
      </aside>

      {/* 右侧内容区 */}
      <div className="main">
        <header className="header">
          <div className="header-title-group">
            <span className="header-title">欢迎进入酒店管理系统</span>
            <span className="header-subtitle">
              {role === "ADMIN" ? "审核与运营视图" : "商户酒店与库存管理"}
            </span>
          </div>
          <span className="account-info">当前账号：{account || "未知用户"}</span>
          <button className="logout-btn" onClick={handleLogout}>
            退出登录
          </button>
        </header>

        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
