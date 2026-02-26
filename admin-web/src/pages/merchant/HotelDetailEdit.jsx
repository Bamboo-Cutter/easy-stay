import { useEffect, useState, useContext, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from "axios";
import "./HotelDetail.css";



function PriceCalendar({ priceCalendar, roomId }) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());

  const priceMap = useMemo(() => {
    const map = new Map();
    if (!priceCalendar) return map;

    priceCalendar.forEach(item => {
      const dateKey = new Date(item.date).toISOString().split("T")[0];
      map.set(dateKey, item.price);
    });
    return map;
  }, [priceCalendar]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  return (
    <div className="calendar-container">
      <div className="calendar-top">
        <h3 className="calendar-title">价格日历表</h3>
        <button
          className="calendar-edit-btn"
          onClick={() => navigate(`/calendar-edit/${roomId}`)}>
          编辑
        </button>
      </div>
      <div className="calendar-header">
        <button onClick={() => changeMonth(-1)}>‹</button>
        <span>{year}年 {month + 1}月</span>
        <button onClick={() => changeMonth(1)}>›</button>
      </div>

      <div className="calendar-grid">
        {["日","一","二","三","四","五","六"].map(d => (
          <div key={d} className="calendar-week">{d}</div>
        ))}

        {days.map((day, index) => {
          if (!day) return <div key={index} className="calendar-cell empty" />;

          const dateKey = new Date(year, month, day)
            .toISOString()
            .split("T")[0];

          const price = priceMap.get(dateKey);

          return (
            <div key={index} className="calendar-cell">
              <div className="calendar-day">{day}</div>

              {price && (
                <div className="calendar-price">
                  ¥{price/100}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



export default function HotelDetailEdit() {
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;

  const { hotelId } = useParams();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editableHotel, setEditableHotel] = useState(null);
  const params = new URLSearchParams(window.location.search);
  const operation = params.get("operation");

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

  useEffect(() => {
    if (!hotelId) return;
    const fetchHotel = async () => {
      setLoading(true);
      try {
        console.log(hotelId);
        console.log(merchantId);
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/merchant/hotels/${hotelId}`, {
            params: { merchant_id: merchantId },
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        });
        setHotel(res.data);
        setEditableHotel(res.data); // 拷贝一份用于编辑
      } catch (err) {
        setError(err.response?.data?.message || "获取失败");
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

  function toISOString(dateStr, useUTC = true) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return null;
    }
    
    const [year, month, day] = dateStr.split('-').map(Number);
    
    if (useUTC) {
      // UTC 模式：2010-03-03 → 2010-03-03T00:00:00.000Z（显示日期不变）
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toISOString();
    } else {
      // 本地时间模式：可能因时区导致日期偏移
      const d = new Date(year, month - 1, day);
      return d.toISOString();
    }
  }

  if (loading) return <div>加载中...</div>;
  if (error) return <div>{error}</div>;
  if (!hotel) return <div>暂无酒店信息</div>;

  // 辅助函数
  const showValue = (value) => (value === null || value === undefined || value === "" ? "暂无" : value);

  // 修改普通字段
  const handleChange = (field, value) => {
    setEditableHotel({
      ...editableHotel,
      [field]: value,
    });
  };

  // 修改数组字段
  const handleArrayChange = (arrayField, index, key, value) => {
    const newArray = [...editableHotel[arrayField]];
    newArray[index][key] = value;
    setEditableHotel({
      ...editableHotel,
      [arrayField]: newArray,
    });
  };

  // 删除数组项
  const handleArrayDelete = (arrayField, index) => {
    const newArray = [...editableHotel[arrayField]];
    newArray.splice(index, 1);
    setEditableHotel({
      ...editableHotel,
      [arrayField]: newArray,
    });
  };

  // 添加数组项
  const handleArrayAdd = (arrayField, newItem) => {
    setEditableHotel({
      ...editableHotel,
      [arrayField]: [...editableHotel[arrayField], newItem],
    });
  };
  

  const SaveHotel = async (status_str) => {
    console.log(editableHotel,"准备提交")
    setHotel(editableHotel);
    const sumHotel = isEditing ? editableHotel : hotel 

    const submitData = {
      name_cn: sumHotel.name_cn,
      name_en: sumHotel.name_en,
      address: sumHotel.address,
      city: sumHotel.city,
      star: Number(sumHotel.star),
      type: sumHotel.type,
      open_year: sumHotel.open_year,
      status: status_str,

      // ✅ images
      images: sumHotel.hotel_images?.map((img, index) => ({
        url: img.url ?? img.image_url,
        sort: img.sort ?? index
      })),

      // ✅ tags
      tags: sumHotel.hotel_tags?.map(tag => tag.tag),

      // ✅ nearby_points
      nearby_points: sumHotel.nearby_points?.map(point => ({
        type: point.type,
        name: point.name,
        distance_km: Number(point.distance_km)
      })),

      // ✅ rooms
      rooms: (sumHotel.rooms ?? sumHotel.hotel_rooms ?? [])?.map(room => ({
        name: room.name,
        max_occupancy: Number(room.max_occupancy),
        total_rooms: Number(room.total_rooms),
        base_price: Number(room.base_price),
        refundable: room.refundable,
        breakfast: room.breakfast
      }))
    };

    console.log("最终提交数据:", submitData);
    const token = localStorage.getItem("token");
    await axios.patch(
      `/api/merchant/hotels/${hotelId}`,
      submitData,
      {
        params: { merchant_id: merchantId },
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );

    setIsEditing(false);
  };

  //保存草稿
  const handleSaveDraft = async () => {
    try {
      await SaveHotel("DRAFT");
      alert("草稿保存成功");
      window.history.back();  
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "草稿保存失败");
    }
  };

  // 提交修改
  const handleSave = async () => {
    try {
      await SaveHotel("PENDING");
      alert("提交成功");
      window.history.back();  
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "提交失败");
    }
  };



  return (
    <div className="hotel-detail">
      {/* 普通信息 */}
      <div className="hotel-header">
        <div className="hotel-title">
          {isEditing ? (
            <>
             <h2>{key_name["name_cn"]}：</h2>
              <input
                value={editableHotel.name_cn || ""}
                onChange={(e) => handleChange("name_cn", e.target.value)}
              />
              <br />
              <h2>{key_name["name_en"]}：</h2>
              <input
                value={editableHotel.name_en || ""}
                onChange={(e) => handleChange("name_en", e.target.value)}
              />
            </>
          ) : (
            <>
              <h1>{showValue(hotel.name_cn)}</h1>
              <span>{showValue(hotel.name_en)}</span>
            </>
          )}
        </div>
      </div>

      <div className="hotel-base-info-container">
        <div className="field-group address-field" >
          <span>{key_name["address"]}：</span>
          {isEditing ? (
            <input
              value={editableHotel["address"] || ""}
              onChange={(e) => handleChange("address", e.target.value)}
            />
          ) : (
            <div className="field-value">{showValue(hotel["address"])}</div>
          )}
        </div>
        <div className="field-group star-field" >
          <span>{key_name["star"]}：</span>
          {isEditing ? (
            <select name="star" 
              value={editableHotel["star"] || ""} 
              onChange={(e) => handleChange("star", e.target.value)} >
              <option value="2">经济</option>
              <option value="3">三星</option>
              <option value="4">四星</option>
              <option value="5">五星</option>
            </select>
          ) : (
            <div className="field-value">{showValue(hotel["star"])}星</div>
          )}
        </div>
        <div className="field-group city-field">
          <span>{key_name["city"]}：</span>
          {isEditing ? (
            <input
              value={editableHotel["city"] || ""}
              onChange={(e) => handleChange("city", e.target.value)}
            />
          ) : (
            <div className="field-value-text">{showValue(hotel["city"])}</div>
          )}
        </div>
        <div className="field-group type-field">
          <span>{key_name["type"]}：</span>
          {isEditing ? (
            <input
              value={editableHotel["type"] || ""}
              onChange={(e) => handleChange("type", e.target.value)}
            />
          ) : (
            <div className="field-value-text">{showValue(hotel["type"])}</div>
          )}
        </div>
        <div className="field-group date-field" >
          <span>{key_name["open_year"]}：</span>
            {isEditing ? (
              <input
                type="date"
                value={formatDate(editableHotel.open_year) || ""}
                onChange={(e) => handleChange("open_year", toISOString(e.target.value))}
              />
            ) : (
              <div className="field-value-text">{showValue(formatDate(hotel.open_year))}</div>
            )}
          </div>
      </div>

    <div className="hotel-tags-container">
      <div className="tags-title">🏷️ 酒店标签</div>
      <div className="tags-wrapper">
        {/* 展示态 */}
        {!isEditing && hotel.hotel_tags.map((tag) => (
          <span key={tag.id} className="tag-badge-display">
            {tag.tag}
          </span>
        ))}

        {/* 编辑态 */}
        {isEditing && (
          <>
            {editableHotel.hotel_tags.map((tag, index) => (
              <span key={tag.id} className="tag-badge-edit">
                <input 
                  className="tag-input-inner"
                  value={tag.tag} 
                  onChange={(e) => handleArrayChange("hotel_tags", index, "tag", e.target.value)} 
                  placeholder="输入标签"
                />
                <button className="tag-delete-btn" onClick={() => handleArrayDelete("hotel_tags", index)}>×</button>
              </span>
            ))}
            <button className="tag-add-btn" onClick={() => handleArrayAdd("hotel_tags", { tag: "" })}>
              + 添加新标签
            </button>
          </>
        )}
      </div>
    </div>

    {/* 图片展示 */}
    <div className="rooms">
      <h2>酒店图片</h2>
    {isEditing ? ( <>
    <div className="images-grid-container">
    {editableHotel.hotel_images.map((image, index) => (
        <div key={index} className="image-wrapper">
          {/* 本地文件上传 */}
          <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                // 创建本地预览 URL
                const previewUrl = URL.createObjectURL(file);
                // 更新 editableHotel 中对应图片
                handleArrayChange("hotel_images", index, "url", previewUrl);
                // 可选择保存 file 对象到 state 以便上传给后端
                handleArrayChange("hotel_images", index, "file", file);
              }}
            />
            {/* 删除按钮 */}
            <button onClick={() => handleArrayDelete("hotel_images", index)}>删除</button>
            {/* 图片预览 */}
            {(image.url || image.image_url) && (
                <img
                src={image.url || image.image_url}
                alt={`preview-${index}`}
                className="hotel-image"
                />
            )}
          </div>
        ))}
        </div>
        <button
        onClick={() =>
            handleArrayAdd("hotel_images", { url: "", file: null })
        }>
        添加酒店图片
        </button>  
        </>) : (
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
        )}  
    </div>

      {/* 房间信息 */}
      <div className="rooms">
        <h2>房间信息</h2>
        {isEditing ? ( <>
        {editableHotel.rooms.map((room, index) => (
          
          <div className="room-card" key={room.id}>
            <div style={{ width: '90%' }}>
              房间类型：
              <input
                value={room.name || ""}
                onChange={(e) => handleArrayChange("rooms", index, "name", e.target.value)}
                placeholder="房型"
              />
              <br />
              房型可居住总人数：
              <input
                value={room.max_occupancy || ""}
                onChange={(e) => handleArrayChange("rooms", index, "max_occupancy", e.target.value)}
                placeholder="最大居住人数"
              />
              <br />
              房型总数量：
              <input
                value={room.total_rooms || ""}
                onChange={(e) => handleArrayChange("rooms", index, "total_rooms", e.target.value)}
                placeholder="房间总数量"
              />
              <br />
              房型基础价格（元）：
              <input
                value={room.base_price/100 || ""}
                onChange={(e) => handleArrayChange("rooms", index, "base_price", e.target.value*100)}
                placeholder="基础价格"
              />
              <br />
              是否可退还：
              <select
                value={room.refundable != null ? (room.refundable ? "是" : "否") : ""}
                onChange={(e) => handleArrayChange("rooms", index, "refundable", e.target.value === "是")}
              >
                <option value="">暂无</option>
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
              <br />
              是否包含早餐：
              <select
                value={room.breakfast != null ? (room.breakfast ? "是" : "否") : ""}
                onChange={(e) => handleArrayChange("rooms", index, "breakfast", e.target.value === "是")}
              >
                <option value="">暂无</option>
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </div>
            <button onClick={() => handleArrayDelete("rooms", index)}>删除</button>
          </div> 
            ))}
          <button
            onClick={() =>
              handleArrayAdd("rooms", { name: "", max_occupancy: "", total_rooms: "", base_price: "", refundable: null, breakfast: null })
            }>
            添加房间
          </button>
          </>) : (
              hotel.rooms && hotel.rooms.length > 0
              ? hotel.rooms.map((room, index) => (
                  <div className="room-card" key={room.id}>
                    <div className="room-info-box">
                    <div className="room-type-title">房间类型：{showValue(room.name)}</div>
                    <div>房型可居住最大人数：{showValue(room.max_occupancy)}</div>
                    <div>房型总数量：{showValue(room.total_rooms)}</div>
                    <div>房型基础价格：{showValue(room.base_price/100)}</div>
                    <div>是否可退还：{room.refundable != null ? (room.refundable ? '是' : '否') : '暂无'}</div>
                    <div>是否包含早餐：{room.breakfast != null ? (room.breakfast ? '是' : '否') : '暂无'}</div>
                    </div>
                    {/* ✅ 在这里插入价格日历 */}
                    {operation === "online" && (
                    <div className="room-calendar-box">
                    <PriceCalendar priceCalendar={room.price_calendar} roomId={room.id} />
                    </div>)}
                  </div>
                ))
              : "暂无房间信息"
            )}
          </div>

        {/* 附近情况 */}
      <div className="rooms">
        <h2>附近情况</h2>
            {isEditing ? (<>
        {editableHotel.nearby_points.map((nearby, index) => (
          <div className="nearby-card" key={nearby.id}>
              <div style={{ width: '90%' }}>
                附近名称：
                <input
                  value={nearby.name || ""}
                  onChange={(e) => handleArrayChange("nearby_points", index, "name", e.target.value)}
                  placeholder="附近名称"
                />
                <br />
                附近类型：
                <input
                  value={nearby.type || ""}
                  onChange={(e) => handleArrayChange("nearby_points", index, "type", e.target.value)}
                  placeholder="附近类型"
                />
                <br />
                距离（km）：
                <input
                  value={nearby.distance_km || ""}
                  onChange={(e) => handleArrayChange("nearby_points", index, "distance_km", e.target.value)}
                  placeholder="距离"
                />
              </div>
              <button onClick={() => handleArrayDelete("nearby_points", index)}>删除</button>
              </div>
              ))}
              
          <button
            onClick={() =>
              handleArrayAdd("nearby_points", {name: "", type: "", distance_km: "" })
            }
          >
            添加附近情况
          </button></>
            ) : (
              hotel.nearby_points && hotel.nearby_points.length > 0
              ? hotel.nearby_points.map((nearby, index) => (
                  <div className="nearby-card" key={nearby.id}>
                    <div>名称：{showValue(nearby.name)}</div>
                    <div>类型：{showValue(nearby.type)}</div>
                    <div>距离：{showValue(nearby.distance_km)}km</div>
                  </div>
                ))
              : "暂无附近信息"
            )}
     </div>

    {isEditing ? "" : (
    <>
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
      </div></>)}

      {/* 编辑按钮浮动右下角 */}
      <div className="fixed-edit-button">
        {isEditing ? (
          <>
            <button onClick={handleSaveDraft}>保存为草稿</button>
            <button onClick={handleSave}>保存并上传审核</button>
            <button onClick={() => {
              setIsEditing(false);
              setEditableHotel({...hotel});
            }}>取消</button>
          </>
        ) : (<>
          <button style={{background: '#40daa2ff' }} onClick={() => window.history.back()}>返回</button>
          {operation === "wpend" && (<button onClick={handleSave}>上传审核</button>)}
          <button onClick={() => setIsEditing(true)}>编辑</button>
          </>
        )}
      </div>
  </div>
  );
}
