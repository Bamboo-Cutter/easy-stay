import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./HotelDetail.css";
import "./HotelDetailEdit.css"

export default function HotelDetailEdit() {
  const { hotelId } = useParams();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editableHotel, setEditableHotel] = useState(null);

  
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
        const res = await axios.get(`/api/hotel/${hotelId}`);
        setHotel(res.data.data);
        setEditableHotel(res.data.data); // 拷贝一份用于编辑
      } catch (err) {
        setError(err.response?.data?.message || "获取失败");
      } finally {
        setLoading(false);
      }
    };
    fetchHotel();
  }, [hotelId]);

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

  // 提交修改
  const handleSave = async () => {
    try {
      await axios.put(`/api/hotel/${hotelId}`, editableHotel);
      setHotel(editableHotel);
      setIsEditing(false);
      alert("修改成功");
    } catch (err) {
      alert(err.response?.data?.message || "修改失败");
    }
  };

  return (
    <div className="hotel-detail">
      {/* 普通信息 */}
      <div className="hotel-header">
        <div className="hotel-title">
          {isEditing ? (
            <>
              <input
                value={editableHotel.name_cn || ""}
                onChange={(e) => handleChange("name_cn", e.target.value)}
              />
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

      <div className="hotel-info">
        {["address", "star", "city", "type", "open_year"].map((field) => (
          <div className="info-item" key={field}>
            {key_name[field]}：
            {isEditing ? (
              <input
                value={editableHotel[field] || ""}
                onChange={(e) => handleChange(field, e.target.value)}
              />
            ) : (
              showValue(hotel[field])
            )}
          </div>
        ))}

        <div className="info-item">
          酒店标签：
          {isEditing ? (
            <>
              {editableHotel.hotel_tags.map((tag, index) => (
                <span key={tag.id} style={{ marginRight: 8 }}>
                  <input
                    value={tag.tag || ""}
                    onChange={(e) => handleArrayChange("hotel_tags", index, "tag", e.target.value)}
                  />
                  <button onClick={() => handleArrayDelete("hotel_tags", index)}>删除</button>
                </span>
              ))}
              <button
                onClick={() =>
                  handleArrayAdd("hotel_tags", { id: Date.now(), tag: "" })
                }
              >
                添加标签
              </button>
            </>
          ) : (
            hotel.hotel_tags.map((tag, index) => (
              <span key={tag.id} style={{ marginRight: 8 }}>
                {showValue(tag.tag)}
              </span>
            ))
          )}
        </div>
      </div>


      {/* 图片展示 */}
    <div className="images-grid-container">
    {editableHotel.hotel_images.map((image, index) => (
        <div key={index} className="image-wrapper">
        {isEditing ? (
            <>
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
                handleArrayChange("hotel_images", index, "image_url", previewUrl);
                // 可选择保存 file 对象到 state 以便上传给后端
                handleArrayChange("hotel_images", index, "file", file);
                }}
            />
            {/* 删除按钮 */}
            <button onClick={() => handleArrayDelete("hotel_images", index)}>删除</button>
            {/* 图片预览 */}
            {image.image_url && (
                <img
                src={image.image_url}
                alt={`preview-${index}`}
                className="hotel-image"
                />
            )}
            </>
        ) : (
            <img
            src={image.image_url}
            alt={`hotel-${index}`}
            className="hotel-image"
            />
        )}
        </div>
    ))}
    {isEditing && (
        <button
        onClick={() =>
            handleArrayAdd("hotel_images", { image_url: "", file: null })
        }
        >
        添加图片
        </button>
    )}
    </div>

      {/* 房间信息 */}
      <div className="rooms">
        <h2>房间信息</h2>
        {editableHotel.rooms.map((room, index) => (
          <div className="room-card" key={room.id}>
            {isEditing ? (
              <div style={{ width: '90%' }}>
                <input
                  value={room.name || ""}
                  onChange={(e) => handleArrayChange("rooms", index, "name", e.target.value)}
                  placeholder="房型"
                />
                <input
                  value={room.capacity || ""}
                  onChange={(e) => handleArrayChange("rooms", index, "capacity", e.target.value)}
                  placeholder="容量"
                />
                <input
                  value={room.base_price || ""}
                  onChange={(e) => handleArrayChange("rooms", index, "base_price", e.target.value)}
                  placeholder="价格"
                />
                <select
                  value={room.refundable != null ? (room.refundable ? "是" : "否") : ""}
                  onChange={(e) => handleArrayChange("rooms", index, "refundable", e.target.value === "是")}
                >
                  <option value="">暂无</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
                <select
                  value={room.breakfast != null ? (room.breakfast ? "是" : "否") : ""}
                  onChange={(e) => handleArrayChange("rooms", index, "breakfast", e.target.value === "是")}
                >
                  <option value="">暂无</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
                <button onClick={() => handleArrayDelete("rooms", index)}>删除</button>
              </div>
            ) : (
              <>
                <div>房型：{showValue(room.name)}</div>
                <div>容量：{showValue(room.capacity)}</div>
                <div>价格：{showValue(room.base_price)}</div>
                <div>是否可退还：{room.refundable != null ? (room.refundable ? "是" : "否") : "暂无"}</div>
                <div>是否包含早餐：{room.breakfast != null ? (room.breakfast ? "是" : "否") : "暂无"}</div>
              </>
            )}
          </div>
        ))}
        {isEditing && (
          <button
            onClick={() =>
              handleArrayAdd("rooms", { id: Date.now(), name: "", capacity: "", base_price: "", refundable: null, breakfast: null })
            }
          >
            添加房间
          </button>
        )}

        {/* 房间信息 */}
      <div className="rooms">
        <h2>附近情况</h2>
        {editableHotel.nearby_points.map((nearby, index) => (
          <div className="room-card" key={nearby.id}>
            {isEditing ? (
              <div style={{ width: '90%' }}>
                <input
                  value={nearby.name || ""}
                  onChange={(e) => handleArrayChange("nearby_points", index, "name", e.target.value)}
                  placeholder="附近名称"
                />
                <input
                  value={nearby.type || ""}
                  onChange={(e) => handleArrayChange("nearby_points", index, "type", e.target.value)}
                  placeholder="附近类型"
                />
                <input
                  value={nearby.distance_km || ""}
                  onChange={(e) => handleArrayChange("nearby_points", index, "distance_km", e.target.value)}
                  placeholder="距离"
                />
                <button onClick={() => handleArrayDelete("rooms", index)}>删除</button>
              </div>
            ) : (
              <>
                <div>附近名称：{showValue(nearby.name)}</div>
                <div>附近类型：{showValue(nearby.type)}</div>
                <div>距离：{showValue(nearby.distance_km)}</div>
              </>
            )}
          </div>
        ))}
        {isEditing && (
          <button
            onClick={() =>
              handleArrayAdd("nearby_points", { id: Date.now(), name: "", type: "", distance_km: "" })
            }
          >
            添加附近情况
          </button>
        )}
    </div>

      {/* 编辑按钮浮动右下角 */}
      <div className="fixed-edit-button">
        {isEditing ? (
          <>
            <button onClick={handleSave}>保存</button>
            <button onClick={() => setIsEditing(false)}>取消</button>
          </>
        ) : (
          <button onClick={() => setIsEditing(true)}>编辑</button>
        )}
      </div>

      </div>
    </div>
  );
}
