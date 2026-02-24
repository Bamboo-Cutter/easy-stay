
<<<<<<< Updated upstream

export default function HomeMerchant() {
  return <h2>欢迎商家登录</h2>;
=======
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/auth/AuthContext.jsx";
import "../admin/Home.css";

export default function HomeMerchant() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const quickActions = [
    {
      title: "管理我的酒店",
      desc: "查看酒店状态、编辑资料、上下线管理。",
      cta: "进入酒店列表",
      onClick: () => navigate("/merchant-hotelList"),
    },
    {
      title: "创建新酒店",
      desc: "新增酒店、房型和基础配置，用于提审。",
      cta: "添加酒店",
      onClick: () => navigate("/hotelAdd"),
    },
  ];

  const tips = [
    "酒店提交审核前建议补齐中文名、英文名、地址与星级。",
    "上线后修改关键资料可能需要重新审核，请提前规划。",
    "库存与价格维护在酒店详情中完成，建议每日检查一次。",
  ];

  return (
    <div className="console-home">
      <section className="hero-panel merchant-theme">
        <div>
          <p className="eyebrow">MERCHANT CONSOLE</p>
          <h2>商家工作台</h2>
          <p className="hero-desc">
            在这里管理酒店资料、提交审核。<br/>
            当前登录账号：
            <span>{user?.email || "未知账号"}</span>
          </p>
        </div>
        <div className="hero-badges">
          <div className="hero-badge">
            <span>角色</span>
            <strong>商家</strong>
          </div>
          <div className="hero-badge">
            <span>重点任务</span>
            <strong>酒店资料 / 提审 / 下线</strong>
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel-card">
          <div className="panel-head">
            <h3>快捷入口</h3>
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
            <h3>提审与运营提示</h3>
            <span>提升审核通过率</span>
          </div>
          <ul className="todo-list">
            {tips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mini-grid">
            <div className="metric-tile">
              <div className="metric-label">管理入口</div>
              <div className="metric-value">我的酒店</div>
              <button type="button" onClick={() => navigate("/merchant-hotelList")}>
                去管理
              </button>
            </div>
            <div className="metric-tile">
              <div className="metric-label">内容创建</div>
              <div className="metric-value">新增酒店</div>
              <button type="button" onClick={() => navigate("/hotelAdd")}>
                去创建
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
>>>>>>> Stashed changes
}
