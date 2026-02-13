import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import "./HotelDetail.css"

export default function HotelDetailView() {
  const { hotelId } = useParams()
  const [hotel, setHotel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!hotelId) return;
    const fetchHotel = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/hotel/${hotelId}`);
            setHotel(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || '获取失败');
        } finally {
            setLoading(false);
        }
    };
    fetchHotel();
  }, [hotelId]);

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
        <div className="info-item">📅 开业时间：{showValue(hotel.open_year)}</div>
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
                <div>房型：{showValue(room.name)}</div>
                <div>容量：{showValue(room.capacity)}</div>
                <div>价格：{showValue(room.base_price)}</div>
                <div>是否可退还：{room.refundable != null ? (room.refundable ? '是' : '否') : '暂无'}</div>
                <div>是否包含早餐：{room.breakfast != null ? (room.breakfast ? '是' : '否') : '暂无'}</div>
              </div>
            ))
          : "暂无房间信息"}
      </div>

      <div className="rooms">
        <h2>附近情况</h2>
        {hotel.nearby_points && hotel.nearby_points.length > 0
          ? hotel.nearby_points.map((nearby, index) => (
              <div className="room-card" key={nearby.id}>
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
            <div className="room-card">
              <div>评分：{showValue(hotel.review_summary.rating)}</div>
              <div>评论数：{showValue(hotel.review_summary.review_count)}</div>
            </div>
          )
          : "暂无评论信息"
        }
      </div>
    </div>
  )
}
