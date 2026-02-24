
<<<<<<< Updated upstream
export default function HomeAdmin() {
  return <h2>欢迎管理员登录</h2>;
}
=======
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/auth/AuthContext.jsx";
import "./Home.css";

export default function HomeAdmin() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const quickActions = [
    {
      title: "审核酒店资料",
      desc: "集中处理待审核、上线与下线酒店。",
      cta: "进入审核列表",
      onClick: () => navigate("/admin-hotelList"),
    },
    {
      title: "新增演示酒店",
      desc: "录入一条酒店数据用于联调或演示。",
      cta: "添加酒店",
      onClick: () => navigate("/hotelAdd"),
    },
  ];

  const checklist = [
    "确认待审核酒店资料完整（名称、地址、星级、房型）。",
    "下线前核对库存日历，避免误操作影响在售酒店。",
  ];

  return (
    <div className="console-home">
      <section className="hero-panel admin-theme">
        <div>
          <p className="eyebrow">ADMIN CONSOLE</p>
          <h2>管理员概览</h2>
          <p className="hero-desc">
            管理审核流转、酒店状态变更与基础信息录入。<br/>
            当前登录账号：
            <span>{user?.email || "未知账号"}</span>
          </p>
        </div>
        <div className="hero-badges">
          <div className="hero-badge">
            <span>角色</span>
            <strong>管理员</strong>
          </div>
          <div className="hero-badge">
            <span>常用入口</span>
            <strong>审核列表 / 添加酒店</strong>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel-card">
          <div className="panel-head">
            <h3>快捷操作</h3>
          </div>
          <div className="quick-action-list">
            {quickActions.map((item) => (
              <button
                type="button"
                key={item.title}
                className="quick-action-card"
                onClick={item.onClick}
              >
                <div>
                  <div className="quick-action-title">{item.title}</div>
                  <div className="quick-action-desc">{item.desc}</div>
                </div>
                <span className="quick-action-cta">{item.cta}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-head">
            <h3>审核提醒</h3>
          </div>
          <ul className="todo-list">
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mini-grid">
            <div className="metric-tile">
              <div className="metric-label">审核任务</div>
              <div className="metric-value">待处理</div>
              <button type="button" onClick={() => navigate("/admin-hotelList")}>
                查看列表
              </button>
            </div>
            <div className="metric-tile">
              <div className="metric-label">基础录入</div>
              <div className="metric-value">新增酒店</div>
              <button type="button" onClick={() => navigate("/hotelAdd")}>
                立即创建
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
>>>>>>> Stashed changes
