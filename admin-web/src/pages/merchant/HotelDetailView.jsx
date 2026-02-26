import { useEffect, useState, useContext, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from "axios"
import "./HotelDetail.css"
// import "./HotelList.css"


export default function HotelDetailView() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;

  const { hotelId } = useParams()
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const key_name =
    {
      name_cn: "中文名",
      name_en: "英文名",
      address: "📍 地址",
      star: "⭐ 星级",
      type: "📍 酒店类型",
      city: "📍 所在城市",
      open_year: "📅 开业时间",
    }
  
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
        {
          status: newStatus,
          ...(newStatus === "REJECTED" ? { reason: rejectReason.trim() } : {}),
        },
        {
          params: { merchant_id: merchantId },
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      );
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


       <div className="hotel-base-info-container">
        <div className="field-group address-field" >
          <span>{key_name["address"]}：</span>
            <div className="field-value">{showValue(hotel["address"])}</div>
        </div>
        <div className="field-group star-field" >
          <span>{key_name["star"]}：</span>
            <div className="field-value">{showValue(hotel["star"])}星</div>
        </div>
        <div className="field-group city-field">
          <span>{key_name["city"]}：</span>
            <div className="field-value-text">{showValue(hotel["city"])}</div>
        </div>
        <div className="field-group type-field">
          <span>{key_name["type"]}：</span>
            <div className="field-value-text">{showValue(hotel["type"])}</div>
        </div>
        <div className="field-group date-field" >
          <span>{key_name["open_year"]}：</span>
              <div className="field-value-text">{showValue(formatDate(hotel.open_year))}</div>
          </div>
      </div>

    <div className="hotel-tags-container">
      <div className="tags-title">🏷️ 酒店标签</div>
      <div className="tags-wrapper">
        {/* 展示态 */}
        {hotel.hotel_tags.map((tag) => (
          <span key={tag.id} className="tag-badge-display">
            {tag.tag}
          </span>
        ))}
      </div>
    </div>

    {/* 图片展示 */}
    <div className="rooms">
      <h2>酒店图片</h2>
        <div className="images-grid-container">{
        (hotel.hotel_images && hotel.hotel_images.length) > 0
        ? hotel.hotel_images.map((image, index) => (
            <div key={index} className="image-wrapper">
              <img
                src={showValue(image.url || image.image_url)}
                alt={`hotel-${index}`}
                className="hotel-image"
              />
            </div>
          )) : "暂无图片"}
        </div> 
    </div>

      <div className="rooms">
        <h2>房间信息</h2>
        {hotel.rooms && hotel.rooms.length > 0
          ? hotel.rooms.map((room, index) => (
              <div className="room-card" key={room.id}>
                <div className="room-info-box">
                <div className="room-type-title">房型：{showValue(room.name)}</div>
                <div>房间可居住最大人数：{showValue(room.max_occupancy)}</div>
                <div>该房型总数量：{showValue(room.total_rooms)}</div>
                <div>基础价格（元）：{showValue(room.base_price/100)}</div>
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
