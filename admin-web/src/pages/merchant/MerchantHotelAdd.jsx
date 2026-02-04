import { useState } from "react";
import "./MerchantHotelAdd.css";

export default function MerchantHotelAdd() {
  const [hotel, setHotel] = useState({
    nameCn: "",
    nameEn: "",
    address: "",
    star: "3",
    openTime: "",
    roomType: "",
    price: "",
    status: "审核中"
  });

  const handleChange = (e) => {
    setHotel({
      ...hotel,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = () => {
    if (!hotel.nameCn || !hotel.address || !hotel.price) {
      alert("请填写完整的酒店信息");
      return;
    }

    console.log("提交酒店信息：", hotel);
    alert("酒店信息已提交，等待管理员审核");
  };

  return (
    <div className="merchant-page">
      <h2 className="page-title">酒店信息管理（商户）</h2>

      <div className="form">
        <div className="form-item">
          <label>酒店名称（中文）</label>
          <input
            name="nameCn"
            value={hotel.nameCn}
            onChange={handleChange}
            placeholder="请输入酒店中文名"
          />
        </div>

        <div className="form-item">
          <label>酒店名称（英文）</label>
          <input
            name="nameEn"
            value={hotel.nameEn}
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
          <label>酒店星级</label>
          <select name="star" value={hotel.star} onChange={handleChange}>
            <option value="3">三星</option>
            <option value="4">四星</option>
            <option value="5">五星</option>
          </select>
        </div>

        <div className="form-item">
          <label>开业时间</label>
          <input
            type="date"
            name="openTime"
            value={hotel.openTime}
            onChange={handleChange}
          />
        </div>

        <div className="form-item">
          <label>房型</label>
          <input
            name="roomType"
            value={hotel.roomType}
            onChange={handleChange}
            placeholder="如：大床房 / 双床房"
          />
        </div>

        <div className="form-item">
          <label>价格（元 / 晚）</label>
          <input
            type="number"
            name="price"
            value={hotel.price}
            onChange={handleChange}
            placeholder="请输入价格"
          />
        </div>

        <div className="form-item">
          <label>当前状态</label>
          <span className="status">{hotel.status}</span>
        </div>

        <button className="submit-btn" onClick={handleSubmit}>
          保存并提交审核
        </button>
      </div>
    </div>
  );
}
