import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom"
import "../merchant/HotelList.css";
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from 'axios';

export default function AdminHotelList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("PENDING");
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const status_name ={
    PENDING: '待审核',
    REJECTED: '未通过',
    APPROVED: '已上线',
    OFFLINE: '已下线',
    DRAFT: '草稿',
  }

  
  useEffect(() => {
    if (!merchantId) return;
    const fetchHotels = async () => {
      try {
        const token = localStorage.getItem('token'); 
        const res = await axios.get(`/api/admin/hotels`, {
            //params: { merchant_id: merchantId },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        console.log(res.data);
        setHotels(res.data);
      } catch (err) {
        console.error("获取酒店列表失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, [merchantId]);

  const filteredHotels = hotels.filter(h => h.status === activeTab);
  const statusCounts = hotels.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const formatDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return String(date);
    return d.toISOString().slice(0, 10);
  };

  //需要的接口是：PUT /api/hotels/:id/status   body: { status: "PENDING" }
  // const handleStatusChange = async (id, newStatus) => {
  //   try {
  //     const res = await fetch(`api/hotel/${id}/status`, {
  //       method: "PUT",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ status: newStatus }),
  //     });

  //     if (!res.ok) {
  //       throw new Error("更新失败");
  //     }
  //     // 数据库更新成功后，再更新前端状态
  //     setHotels(prev =>
  //       prev.map(h =>
  //         h.id === id ? { ...h, status: newStatus } : h
  //       )
  //     );
  //   } catch (err) {
  //     console.error(err);
  //     alert("状态更新失败，请稍后重试");
  //   }
  // };

  if (loading) return <div className="list-loading">正在加载酒店列表...</div>;

  return (
    <div className="hotel-list">
      <div className="list-page-head">
        <div>
          <h2>酒店审核管理</h2>
          <div className="list-page-subtitle">
            查看待审核、已上线与已下线酒店，并执行审核流转操作。
          </div>
        </div>
        <div className="list-summary">
          <div className="summary-chip">总酒店数 <strong>{hotels.length}</strong></div>
          <div className="summary-chip">待审核 <strong>{statusCounts.PENDING || 0}</strong></div>
          <div className="summary-chip">已上线 <strong>{statusCounts.APPROVED || 0}</strong></div>
          <div className="summary-chip">已下线 <strong>{statusCounts.OFFLINE || 0}</strong></div>
        </div>
      </div>

      {/* Tab 选择栏 */}
      <div className="tab-bar">
        {["PENDING", "APPROVED", "OFFLINE"].map(tab => (
          <div
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {status_name[tab]}
          </div>
        ))}
      </div>
      
      <div>{filteredHotels.length === 0 ? (
        <div className="empty">暂无数据</div>
      ) : (
        <>
      <div className="table-shell">
        <div className="table-scroll">
          <table className="hotel-table">
            <thead>
              <tr>
                <th style={{ width: "18%" }}>酒店名</th>
                <th style={{ width: "22%" }}>地址</th>
                <th style={{ width: "10%" }}>城市</th>
                <th style={{ width: "7%" }}>星级</th>
                <th style={{ width: "10%" }}>酒店类型</th>
                <th style={{ width: "10%" }}>开业时间</th>
                <th style={{ width: "8%" }}>状态</th>
                <th style={{ width: "15%" }}>操作</th>
              </tr>
            </thead>

            <tbody>
              {filteredHotels.map(hotel => (
                <tr key={hotel.id}>
                  <td>
                    <div className="hotel-main-name">{hotel.name_cn}</div>
                    <div className="hotel-en">{hotel.name_en}</div>
                  </td>
                  <td className="cell-multi-line">{hotel.address}</td>
                  <td className="cell-muted">{hotel.city}</td>
                  <td className="cell-muted">{hotel.star ?? "-"}</td>
                  <td className="cell-muted">{hotel.type || "-"}</td>
                  <td className="cell-muted">{formatDate(hotel.open_year)}</td>
                  <td>
                    <span className={`status ${hotel.status}`}>
                      {status_name[hotel.status]}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      if (activeTab === "PENDING")
                        return (
                          <span
                            className="list-action-link"
                            onClick={() => {
                              navigate(`/hotel-detail/${hotel.id}?operation=tpending`);
                            }}
                          >
                            进行审核
                          </span>
                        );
                      if (activeTab === "APPROVED")
                        return (
                          <span
                            className="list-action-link"
                            onClick={() => {
                              navigate(`/hotel-detail/${hotel.id}?operation=toffline`);
                            }}
                          >
                            下线/退回
                          </span>
                        );
                      if (activeTab === "OFFLINE")
                        return (
                          <span
                            className="list-action-link"
                            onClick={() => {
                              navigate(`/hotel-detail/${hotel.id}?operation=tonline`);
                            }}
                          >
                            上线/退回
                          </span>
                        );
                      return null;
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>)}
      </div>
    </div>
  );
}
