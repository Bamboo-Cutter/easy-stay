import { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./MerchantHotelAdd.css";
import { AuthContext } from "@/auth/AuthContext.jsx";

export default function MerchantHotelAdd() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;
  const { hotelId } = useParams();
  const [hotel, setHotel] = useState({
    name_cn: "",
    name_en: "",
    address: "",
    city: "",
    type: "",
    star: "2",
    open_year: "",
    status: "DRAFT",
    merchant_id: merchantId,
    reject_reason: null,
    hotel_tags: [
      {
          "tag": ""
      }],
    hotel_images: [{
      "url": "",
      "sort": null
    }],
    rooms: [
      {
          "name": "",
          "max_occupancy": "",
          "total_rooms": "",
          "base_price": "",
          "refundable": null,
          "breakfast": null
      }],
    nearby_points: [
      {
          "type": "",
          "name": "",
          "distance_km": null
      }],
      review_summary: null
  });

  
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

  //修改普通字段
  const handleChange = (e) => {
    setHotel({
      ...hotel,
      [e.target.name]: e.target.value
    });
  };

  // 修改数组字段
  const handleArrayChange = (arrayField, index, key, value) => {
    const newArray = [...hotel[arrayField]];
    newArray[index][key] = value;
    setHotel({
      ...hotel,
      [arrayField]: newArray,
    });
  };

  // 删除数组项
  const handleArrayDelete = (arrayField, index) => {
    const newArray = [...hotel[arrayField]];
    newArray.splice(index, 1);
    setHotel({
      ...hotel,
      [arrayField]: newArray,
    });
  };

  // 添加数组项
  const handleArrayAdd = (arrayField, newItem) => {
    console.log("1111")
    setHotel({
      ...hotel,
      [arrayField]: [...hotel[arrayField], newItem],
    });
  };

  //保存提交
  const saveHotel = async (status_str) => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("请先登录");
      return;
    }

    // 构造干净 DTO
    const submitData = {
      name_cn: hotel.name_cn,
      name_en: hotel.name_en,
      address: hotel.address,
      city: hotel.city,
      star: parseInt(hotel.star),
      type: hotel.type,
      open_year: toISOString(hotel.open_year),
      status: status_str,

      // images// ✅ 过滤非法图片
      images: hotel.hotel_images
        ?.filter(img => typeof img.url === "string" && img.url.trim() !== "")
        .map((img, index) => ({
          url: img.url.trim(),
          sort: Number.isInteger(img.sort) ? img.sort : index
        })),

      tags: hotel.hotel_tags?.map(tag =>
        typeof tag === "string" ? tag : tag.tag
      ),

      // ✅ 强制数字转换 + 过滤非法房型
      rooms: hotel.rooms
        ?.filter(room =>
          room.name &&
          parseInt(room.max_occupancy, 10) >= 1 &&
          parseInt(room.total_rooms, 10) >= 1
        )
        .map(room => ({
          name: room.name.trim(),
          max_occupancy: parseInt(room.max_occupancy, 10),
          total_rooms: parseInt(room.total_rooms, 10),
          base_price: parseInt(room.base_price*100, 10) || 0,
          refundable: !!room.refundable,
          breakfast: !!room.breakfast
        })),

      nearby_points: hotel.nearby_points?.map(point => ({
        type: point.type,
        name: point.name.trim(),
        distance_km: Number(point.distance_km)
      }))
    };

    console.log(submitData);
    if (
      !submitData.name_cn ||
      !submitData.name_en ||
      !submitData.address ||
      !submitData.city ||
      !submitData.type ||
      submitData.star === undefined ||
      !submitData.open_year ||
      !submitData.tags?.length ||
      !submitData.images?.length ||
      !submitData.rooms?.length ||
      !submitData.nearby_points?.length
    ) {
      alert("请填写正确完整的酒店信息");
      return;
    }

    console.log("最终提交数据:", submitData);

    // ✅ 正确接口
    const purl = user.role?.toLowerCase() === 'merchant'
      ? '/api/merchant/hotels'
      : '/api/admin/hotels';

    await axios.post(purl, submitData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  
  //提交函数
  const handleSubmitDraft = async () => {
    try {
      await saveHotel("DRAFT");
      alert("酒店信息已保存为草稿");

      // const naurldr = user.role?.toLowerCase() === 'merchant'
      //   ? '/merchant-hotelList'
      //   : '/admin-hotelList';
      // navigate(naurldr);
      window.location.reload(); 

    } catch (err) {
      alert(err.response?.data?.message || "保存失败");
    }
  };

  //提交函数
  const handleSubmit = async () => {
    try {
      await saveHotel("PENDING");
      alert("酒店信息已提交，等待管理员审核");

      // const naurl = user.role?.toLowerCase() === 'merchant'
      //   ? '/merchant-hotelList'
      //   : '/admin-hotelList';
      // navigate(naurl);
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "提交失败");
    }
  };


  return (
    <div className="merchant-page">
      <h2 className="page-title">酒店信息管理</h2>

      <div className="form">
        <div className="form-item">
          <label>酒店名称（中文）</label>
          <input
            name="name_cn"
            value={hotel.name_cn}
            onChange={handleChange}
            placeholder="请输入酒店中文名"
          />
        </div>

        <div className="form-item">
          <label>酒店名称（英文）</label>
          <input
            name="name_en"
            value={hotel.name_en}
            onChange={handleChange}
            placeholder="请输入酒店英文名"
          />
        </div>

        <div className="form-item">
          <label>酒店地址</label>
          <input
            name="address"
            value={hotel.address}
            onChange={handleChange}
            placeholder="请输入酒店地址"
          />
        </div>

        <div className="form-item">
          <label>所在城市</label>
          <input
            type="text"
            name="city"
            value={hotel.city}
            onChange={handleChange}
            placeholder="请输入所在城市"
          />
        </div>

        <div className="form-item">
          <label>酒店类型</label>
          <input
            name="type"
            value={hotel.type}
            onChange={handleChange}
            placeholder="如：商务型 / 度假型"
          />
        </div>

        <div className="form-item">
          <label>酒店星级</label>
          <select name="star" value={hotel.star} onChange={handleChange}>
            <option value="2">经济</option>
            <option value="3">三星</option>
            <option value="4">四星</option>
            <option value="5">五星</option>
          </select>
        </div>

        <div className="form-item">
          <label>开业时间</label>
          <input
            type="date"
            name="open_year"
            value={hotel.open_year}
            onChange={handleChange}
          />
        </div>

        
        <div className="form-item">
          <label>酒店标签</label>
          {hotel.hotel_tags.map((tag, index) => (
            <span key={tag.id} style={{ marginRight: 8, padding:"3px" }}>
              <input
                value={tag.tag || ""}
                onChange={(e) => handleArrayChange("hotel_tags", index, "tag", e.target.value)}
              />
              <button onClick={() => handleArrayDelete("hotel_tags", index)}>删除</button>
              <br />
            </span>
          ))}
          <button
            onClick={() =>
              handleArrayAdd("hotel_tags", {tag: "" })
            }
          >
            添加
          </button>
        </div>

        <div className="form-item">
          <label>酒店图片</label>
          <div className="imagesAdd-grid-container">
          {hotel.hotel_images.map((image, index) => (
            <div key={index} className="imageAdd-wrapper">
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
                {image.url && (
                    <img
                    src={image.url}
                    alt={`preview-${index}`}
                    className="hotelAdd-image"
                    />
                  )}
               </div>
            ))}
            </div>
          <button
            onClick={() =>
                handleArrayAdd("hotel_images", {url: "", file: null })
            }
            >
            添加
            </button>
          </div>

          <div className="form-item">
            <label>房间信息</label>
            {hotel.rooms.map((room, index) => (
              <div className="roomAdd-card" key={room.id}>
                  <div style={{ width: '90%' }}>
                    房间类型：
                    <input
                      value={room.name || ""}
                      onChange={(e) => handleArrayChange("rooms", index, "name", e.target.value)}
                      placeholder="房型"
                    />
                    <br />
                    房型可居住最大人数：
                    <input
                      value={room.max_occupancy || ""}
                      onChange={(e) => handleArrayChange("rooms", index, "max_occupancy", e.target.value)}
                      placeholder="房间可居住最大人数"
                    />
                    <br />
                    房型总数量：
                    <input
                      value={room.total_rooms || ""}
                      onChange={(e) => handleArrayChange("rooms", index, "total_rooms", e.target.value)}
                      placeholder="房间数量"
                    />
                    <br />
                    房型基础价格（元）：
                    <input
                      value={room.base_price || ""}
                      onChange={(e) => handleArrayChange("rooms", index, "base_price", e.target.value)}
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
                    <button onClick={() => handleArrayDelete("rooms", index)}>删除</button>
                  </div>
              </div>
            ))}
              <button
                onClick={() =>
                  handleArrayAdd("rooms", {name: "", max_occupancy: "", total_rooms: "", base_price: "", refundable: null, breakfast: null })
                }
              >
                添加
              </button>
          </div>

        
          <div className="form-item">
            <label>附近情况</label>
            {hotel.nearby_points.map((point, index) => (
              <div className="roomAdd-card" key={point.id}>
                  <div style={{ width: '90%' }}>
                    附近名称：
                    <input
                      value={point.name || ""}
                      onChange={(e) => handleArrayChange("nearby_points", index, "name", e.target.value)}
                      placeholder="名称"
                    />
                    <br />
                    附近类型：
                    <input
                      value={point.type || ""}
                      onChange={(e) => handleArrayChange("nearby_points", index, "type", e.target.value)}
                      placeholder="类型"
                    />
                    <br />
                    距离（km）：
                    <input
                      value={point.distance_km || ""}
                      onChange={(e) => handleArrayChange("nearby_points", index, "distance_km", e.target.value)}
                      placeholder="距离"
                    />
                    <button onClick={() => handleArrayDelete("nearby_points", index)}>删除</button>
                  </div>
              </div>
            ))}
              <button
                onClick={() =>
                  handleArrayAdd("nearby_points", {name: "", type: "", distance_km: "" })
                }
              >
                添加
              </button>
          </div>


        <div className="button-group">
        <button className="btn-draft" onClick={handleSubmitDraft}>
          保存为草稿
        </button>
        <button className="btn-submit" onClick={handleSubmit}>
          保存并提交审核
        </button>
        </div>
      </div>
    </div>
  );
}
