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
  console.log(user);

  // ✅ 从 localStorage 读取角色
  const role = user.role;
  const account = user.email;
  const merchantId = user?.id; // merchant_id

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
        <div className="logo">易宿后台</div>

        <nav className="menu">
          <div className="menu-item" onClick={() => {
            role === "MERCHANT"
              ? navigate("/home-merchant")
              : navigate("/home-admin");
          }}>
            首页
          </div>

          {role === "MERCHANT" && (
            <>
              <div className="menu-item" onClick={() => navigate("/merchant-hotelList")}>
                酒店列表
              </div>
              <div className="menu-item" onClick={() => navigate("/merchant-hotelAdd")}>
                添加酒店
              </div>
              <div className="menu-item" onClick={() => navigate("/merchant-hotelAudit")}>
                审核中酒店
              </div>
            </>
          )}

          {role === "ADMIN" && (
            <div className="menu-item" onClick={() => navigate("/admin-hotelList")}>
              酒店列表
            </div>
          )}
        </nav>
      </aside>

      {/* 右侧内容区 */}
      <div className="main">
        <header className="header">
          <span>欢迎进入酒店管理系统</span>
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
