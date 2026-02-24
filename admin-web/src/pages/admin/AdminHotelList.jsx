import { useState, useContext, useEffect} from "react";
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
  const status_name ={
    PENDING: '待审核',
    REJECTED: '未通过',
    APPROVED: '已上线',
    OFFLINE: '已下线',
    DRAFT: '草稿',
  }
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    if (!merchantId) return;
    const fetchHotels = async (page = 1) => {
      try {
        const token = localStorage.getItem('token'); 
        const res = await axios.get(`/api/admin/hotels?page=${page}&limit=20`, {
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

<<<<<<< Updated upstream
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

  if (loading) return <div>加载中...</div>;
=======
  if (loading) return <div className="list-loading">正在加载酒店列表...</div>;
>>>>>>> Stashed changes

  return (
    <div className="hotel-list">
      <h2>酒店管理列表</h2>

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
      
      <div >{filteredHotels.length === 0 ? (
        <div className="empty">暂无数据</div>
      ) : (
        <>
<<<<<<< Updated upstream
      {/* 表格 */}
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
=======
      <div className="table-shell">
        <div className="table-scroll" >   
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
>>>>>>> Stashed changes

        <tbody>
          {filteredHotels.map(hotel => (
            <tr key={hotel.id}>
              <td>
                <strong>{hotel.name_cn}</strong>
                <div className="hotel-en">{hotel.name_en}</div>
                {/* {activeTab !== "PENDING" && ( <div className="detail-link" onClick={() => { window.open(`/hotel-detail/${hotel.id}`, '_blank');  }} > 酒店详情 </div> )} */}
              </td>
              <td>{hotel.address}</td>
              <td>{hotel.city}</td>
              <td>{hotel.star}</td>
              <td>{hotel.type}</td>
              <td>{hotel.open_year}</td>
              <td>
                <span className={`status ${hotel.status}`}>
                  {status_name[hotel.status]}
                </span>
              </td>
              <td>
                {(() => {
                    if (activeTab === "PENDING") return(
                      <span style={{ color: "#4396eeff" }}
                        onClick={() => {navigate(`/hotel-detail/${hotel.id}?operation=tpending`)}}>  
                        进行审核</span>);
                    else if (activeTab === "APPROVED") return(
                      <span style={{ color: "#4396eeff" }}
                        onClick={() => {navigate(`/hotel-detail/${hotel.id}?operation=toffline`)}}> 
                        下线/退回</span>);
                    else if (activeTab === "OFFLINE") return(
                      <span style={{ color: "#4396eeff" }}
                        onClick={() => {navigate(`/hotel-detail/${hotel.id}?operation=tonline`)}}> 
                        上线/退回</span>);
                  
                  })()
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </>)}
      </div>
    </div>
  );
}
