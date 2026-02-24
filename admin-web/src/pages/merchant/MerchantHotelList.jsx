import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom"
import "./HotelList.css";
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from 'axios';

export default function MerchantHotelList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("APPROVED");
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const filteredHotels = hotels.filter(h => h.status === activeTab);
  const statusCounts = hotels.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});
  const status_name ={
    PENDING: '审核中',
    REJECTED: '未通过',
    APPROVED: '已上线',
    OFFLINE: '已下线',
    DRAFT: '草稿',
  }

  useEffect(() => {
    if (!merchantId) return;
    const fetchHotels = async () => {
      console.log(merchantId);
      try {
        const token = localStorage.getItem('token'); // 假设token存储在localStorage中
        const res = await axios.get(`/api/merchant/hotels`, {
          params: { merchant_id: merchantId },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setHotels(res.data);
        // console.log(res.data)
      } catch (err) {
        console.error("获取酒店列表失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, [merchantId]);

  const formatDate = (date) => {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  const handleSubmitStatus = async (id, newStatus) => {
    console.log(newStatus)
    const subResult = {"status": newStatus}
    console.log(subResult)
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`/api/merchant/hotels/${id}/status`, subResult, {
        params: { merchant_id: merchantId },
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      alert("修改成功！")
      // 数据库更新成功后，再更新前端状态
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("状态更新失败，请稍后重试");
    }
  }

  if (loading) return <div className="list-loading">正在加载我的酒店...</div>;

  return (
    <div className="hotel-list">
      <div className="list-page-head">
        <div>
          <h2>我的酒店列表</h2>
          <div className="list-page-subtitle">
            管理商家名下酒店，查看审核状态并执行提审/下线操作。
          </div>
        </div>
        <div className="list-summary">
          <div className="summary-chip">总酒店数 <strong>{hotels.length}</strong></div>
          <div className="summary-chip">已上线 <strong>{statusCounts.APPROVED || 0}</strong></div>
          <div className="summary-chip">审核中 <strong>{statusCounts.PENDING || 0}</strong></div>
          <div className="summary-chip">草稿 <strong>{statusCounts.DRAFT || 0}</strong></div>
        </div>
      </div>

      {/* Tab */}
      <div className="tab-bar">
        {["APPROVED", "PENDING", "REJECTED", "DRAFT", "OFFLINE"].map(tab => (
          <div
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {status_name[tab]}
          </div>
        ))}
      </div>

      <div>
      {filteredHotels.length === 0 ? (
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
                <th style={{ width: "15%" }}>
                  {(() => {
                    if (activeTab === "PENDING") return "审核状态";
                    if (activeTab === "REJECTED") return "理由";
                    return "操作";
                  })()}
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredHotels.map(hotel => (
                <tr key={hotel.id}>
                  <td>
                    <div className="hotel-main-name">{hotel.name_cn}</div>
                    <div className="hotel-en">{hotel.name_en}</div>
                    <span
                      className="detail-link"
                      onClick={() => {
                        if (activeTab === "PENDING") navigate(`/hotel-detail/${hotel.id}`);
                        else if (activeTab === "APPROVED") navigate(`/hotel-detail/${hotel.id}/edit?operation=online`);
                        else if (activeTab === "REJECTED") navigate(`/hotel-detail/${hotel.id}/edit`);
                        else return navigate(`/hotel-detail/${hotel.id}/edit?operation=wpend`);
                      }}
                    >
                      {(() => {
                        if (activeTab === "PENDING") return "酒店详情";
                        if (activeTab === "APPROVED") return "酒店详情/修改";
                        if (activeTab === "REJECTED") return "修改";
                        return "修改/上传审核";
                      })()}
                    </span>
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
                        return <span className="cell-muted">等待审核</span>;
                      if (activeTab === "REJECTED")
                        return (
                          <span className="danger-text">
                            {hotel.reject_reason || "—"}
                          </span>
                        );
                      return (
                        <span
                          className="list-action-link"
                          onClick={() => {
                            activeTab === "APPROVED"
                              ? handleSubmitStatus(hotel.id, "OFFLINE")
                              : handleSubmitStatus(hotel.id, "PENDING");
                          }}
                        >
                          {activeTab === "APPROVED" ? "下线" : "上传审核"}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
      </div>
    </div>
  );
}
