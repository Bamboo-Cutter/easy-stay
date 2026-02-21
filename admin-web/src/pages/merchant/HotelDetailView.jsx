import { useEffect, useState, useContext, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from "axios"
import "./HotelDetail.css"
import "./HotelList.css"




// function PriceCalendar({ priceCalendar }) {
//   const [currentDate, setCurrentDate] = useState(new Date());

//   const priceMap = useMemo(() => {
//     const map = new Map();
//     if (!priceCalendar) return map;

//     priceCalendar.forEach(item => {
//       const dateKey = new Date(item.date).toISOString().split("T")[0];
//       map.set(dateKey, item.price);
//     });
//     return map;
//   }, [priceCalendar]);

//   const year = currentDate.getFullYear();
//   const month = currentDate.getMonth();

//   const firstDay = new Date(year, month, 1).getDay();
//   const daysInMonth = new Date(year, month + 1, 0).getDate();

//   const days = [];
//   for (let i = 0; i < firstDay; i++) days.push(null);
//   for (let i = 1; i <= daysInMonth; i++) days.push(i);

//   const changeMonth = (offset) => {
//     setCurrentDate(new Date(year, month + offset, 1));
//   };

//   return (
//     <div className="calendar-container">
//       <div className="calendar-top">
//         <h3 className="calendar-title">价格日历表</h3>
//         <button
//           className="calendar-edit-btn"
//           onClick={() => navigate(`/calendarEdit/${roomId}`)}>
//           编辑
//         </button>
//       </div>

//       <div className="calendar-header">
//         <button onClick={() => changeMonth(-1)}>‹</button>
//         <span>{year}年 {month + 1}月</span>
//         <button onClick={() => changeMonth(1)}>›</button>
//       </div>

//       <div className="calendar-grid">
//         {["日","一","二","三","四","五","六"].map(d => (
//           <div key={d} className="calendar-week">{d}</div>
//         ))}

//         {days.map((day, index) => {
//           if (!day) return <div key={index} className="calendar-cell empty" />;

//           const dateKey = new Date(year, month, day)
//             .toISOString()
//             .split("T")[0];

//           const price = priceMap.get(dateKey);

//           return (
//             <div key={index} className="calendar-cell">
//               <div className="calendar-day">{day}</div>

//               {price && (
//                 <div className="calendar-price">
//                   ¥{price}
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }


export default function HotelDetailView() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;

  const { hotelId } = useParams()
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [auditResult, setAuditResult] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const params = new URLSearchParams(window.location.search);
  const operation = params.get("operation");
  const jiekou = (operation && 1) === 1   ? `/api/admin/hotels/${hotelId}` :`/api/merchant/hotels/${hotelId}`

  useEffect(() => {
    if (!hotelId) return;
    const fetchHotel = async () => {
        setLoading(true);
        try {
          console.log(hotelId);
          console.log(merchantId);
          const token = localStorage.getItem('token');
          const res = await axios.get(jiekou, {
              params: { merchant_id: merchantId },
              headers: {
                  "Authorization": `Bearer ${token}`,
              },
          });
          console.log(res);
          setHotel(res.data);
        } catch (err) {
            setError(err.response?.data?.message || '获取失败');
        } finally {
            setLoading(false);
        }
    };
    fetchHotel();
  }, [hotelId]);

  const formatDate = (date) => {
    if (!date) return '-';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

   //需要的接口是：PUT /api/hotels/:id/status   body: { status: "PENDING" }
  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `/api/admin/hotels/${id}/status`,
        { status: newStatus },
        {
          params: { merchant_id: merchantId },
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
      if (!rejectReason && newStatus==="REJECTED") {
        const token = localStorage.getItem("token");
        await axios.post(
          `/api/admin/hotels/${id}/reject`,
          { reject_reason: rejectReason },
          {
            params: { merchant_id: merchantId },
            headers: {
              Authorization: `Bearer ${token}`,
            }
          });
      }
      console.log(newStatus);
      if (newStatus === "APPROVED") { alert("上线成功");}
      else if (newStatus === "REJECTED") { alert("退回成功");}
      else if (newStatus === "OFFLINE") { alert("下线成功");}
      window.history.back();  
    } catch (err) {
      console.error(err);
      alert("提交失败");
    }
  };

  if (loading) return <div>加载中...</div>;
  if (error) return <div>{error}</div>;
  if (!hotel) return <div>暂无酒店信息</div>;

  // 辅助函数：判断字段是否为空，空就显示“暂无”
  const showValue = (value) => {
    if (value === null || value === undefined || value === "") return "暂无";
    return value;
  }

  return (
    <div className="hotel-detail">
      <div className="hotel-header">
        <div className="hotel-title">
          <h1>{showValue(hotel.name_cn)}</h1>
          <span>{showValue(hotel.name_en)}</span>
        </div>
      </div>

      <div className="hotel-info">
        <div className="info-item">📍 地址：{showValue(hotel.address)}</div>
        <div className="info-item">⭐ 星级：{showValue(hotel.star)}</div>
        <div className="info-item">📍 所在城市：{showValue(hotel.city)}</div>
        <div className="info-item">📍 酒店类型：{showValue(hotel.type)}</div>
        <div className="info-item">📅 开业时间：{showValue(formatDate(hotel.open_year))}</div>
        <div className="info-item">
          酒店标签：
          {hotel.hotel_tags && hotel.hotel_tags.length > 0
            ? hotel.hotel_tags.map((tag, index) => (
                <span key={tag.id} style={{ marginRight: 8 }}>
                  {showValue(tag.tag)}
                </span>
              ))
            : "暂无"}
        </div>
      </div>

      <div className="images-grid-container">
        {hotel.hotel_images && hotel.hotel_images.length > 0
          ? hotel.hotel_images.map((image, index) => (
              <div key={index} className="image-wrapper">
                <img
                  src={showValue(image.image_url)}
                  alt={`hotel-${index}`}
                  className="hotel-image"
                />
              </div>
            ))
          : "暂无图片"}
      </div>

      <div className="rooms">
        <h2>房间信息</h2>
        {hotel.rooms && hotel.rooms.length > 0
          ? hotel.rooms.map((room, index) => (
              <div className="room-card" key={room.id}>
                <div className="room-info-box">
                <div>房型：{showValue(room.name)}</div>
                <div>容量：{showValue(room.max_occupancy)}</div>
                <div>该房型总量：{showValue(room.total_rooms)}</div>
                <div>基础价格：{showValue(room.base_price)}</div>
                <div>是否可退还：{room.refundable != null ? (room.refundable ? '是' : '否') : '暂无'}</div>
                <div>是否包含早餐：{room.breakfast != null ? (room.breakfast ? '是' : '否') : '暂无'}</div>
                </div>
                {/* ✅ 在这里插入价格日历 */}
                {/* <div className="room-calendar-box"> */}
                  {/* <PriceCalendar  priceCalendar={room.price_calendar}  roomId={room.id}/> </div> */}
              </div>
            ))
          : "暂无房间信息"}
      </div>

      <div className="rooms">
        <h2>附近情况</h2>
        {hotel.nearby_points && hotel.nearby_points.length > 0
          ? hotel.nearby_points.map((nearby, index) => (
              <div className="nearby-card" key={nearby.id}>
                <div>名称：{showValue(nearby.name)}</div>
                <div>类型：{showValue(nearby.type)}</div>
                <div>距离：{showValue(nearby.distance_km)}km</div>
              </div>
            ))
          : "暂无附近信息"}
      </div>

      <div className="rooms">
        <h2>评论摘要</h2>
        {hotel.review_summary
          ? (
            <div className="nearby-card">
              <div>评分：{showValue(hotel.review_summary.rating)}</div>
              <div>评论数：{showValue(hotel.review_summary.review_count)}</div>
            </div>
          )
          : "暂无评论信息"
        }
      </div>
      
      {/* 按钮浮动右下角 */}
      <div className="fixed-edit-button">
          <button style={{background: '#40daa2ff' }} onClick={() => window.history.back()}>返回</button>
      </div>

      {operation === "tpending" && (
        <div className="rooms">
        <h2 style={{color: "blue"}}>审核处理</h2>
        {/* 审核选项 */}
        <div className="audit-section">
          <label>
            <input type="radio" value="pass"  checked={auditResult === "pass"}
              onChange={() => setAuditResult("pass")} />
            通过
          </label>
          <label>
            <input type="radio" value="reject" checked={auditResult === "reject"}
              onChange={() => setAuditResult("reject")} />
            不通过
          </label>
          {auditResult === "reject" && (
            <textarea placeholder="请输入不通过原因" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} />
          )}
        </div>
        {/* 底部按钮 */}
        <div className="modal-footer">
          <button disabled={!auditResult || (auditResult === "reject" && !rejectReason.trim())}
            onClick={() => {handleStatusChange(hotel.id, auditResult === "pass" ? "APPROVED" : "REJECTED"); }} >
            提交
          </button>
        </div>
      </div>)}

      {operation === "toffline" && (
        <div className="rooms">
        <h2 style={{color: "blue"}}>审核处理</h2>
        {/* 审核选项 */}
        <div className="audit-section">
          <label>
            <input type="radio" value="pass"  checked={auditResult === "pass"}
              onChange={() => setAuditResult("pass")} />
            下线
          </label>
          <label>
            <input type="radio" value="reject" checked={auditResult === "reject"}
              onChange={() => setAuditResult("reject")} />
            退回
          </label>
          {auditResult === "reject" && (
            <textarea placeholder="请输入退回原因" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} />
          )}
        </div>
        {/* 底部按钮 */}
        <div className="modal-footer">
          <button disabled={!auditResult || (auditResult === "reject" && !rejectReason.trim())}
            onClick={() => {  handleStatusChange(hotel.id, auditResult === "pass" ? "OFFLINE" : "REJECTED"); }} >
            提交
          </button>
        </div>
      </div>)}

      {operation === "tonline" && (
        <div className="rooms">
        <h2 style={{color: "blue"}}>审核处理</h2>
        {/* 审核选项 */}
        <div className="audit-section">
          <label>
            <input type="radio" value="pass"  checked={auditResult === "pass"}
              onChange={() => setAuditResult("pass")} />
            上线
          </label>
          <label>
            <input type="radio" value="reject" checked={auditResult === "reject"}
              onChange={() => setAuditResult("reject")} />
            退回
          </label>
          {auditResult === "reject" && (
            <textarea placeholder="请输入退回原因" value={rejectReason}
              onChange={e => setRejectReason(e.target.value)} />
          )}
        </div>
        {/* 底部按钮 */}
        <div className="modal-footer">
          <button disabled={!auditResult || (auditResult === "reject" && !rejectReason.trim())}
            onClick={() => {  handleStatusChange(hotel.id, auditResult === "pass" ? "APPROVED" : "REJECTED"); }} >
            提交
          </button>
        </div>
      </div>)}

    </div>
  )
}
