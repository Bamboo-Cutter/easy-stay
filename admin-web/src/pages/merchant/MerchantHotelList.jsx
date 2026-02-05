import { useState, useContext, useEffect, useNavigate } from "react";
import "./MerchantHotelList.css";
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from 'axios';

export default function MerchantHotelList() {
  // const [hotels, setHotels] = useState([
  //   {
  //     id: 1,
  //     nameCn: "易宿·北京店",
  //     nameEn: "Yisu Beijing Hotel",
  //     address: "北京市朝阳区",
  //     star: "五星级",
  //     roomType: "大床房 / 双床房",
  //     price: "￥599 / 晚",
  //     openTime: "2018-06-01",
  //     status: "已上线",
  //     image: "https://via.placeholder.com/400x200"
  //   },
  //   {
  //     id: 2,
  //     nameCn: "易宿·上海店",
  //     nameEn: "Yisu Shanghai Hotel",
  //     address: "上海市浦东新区",
  //     star: "四星级",
  //     roomType: "商务房",
  //     price: "￥499 / 晚",
  //     openTime: "2020-09-15",
  //     status: "审核中",
  //     image: "https://via.placeholder.com/400x200"
  //   }
  // ]);

  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  // console.log(user,"111111");
  // console.log(user?.sub);
  useEffect(() => {
    if (!merchantId) return;
    const fetchHotels = async () => {
      console.log(merchantId);
      try {
        console.log(merchantId,'1111');
        const res = await axios.get(`/api/hotel`, {
          params: { merchant_id: merchantId },
        });
        // console.log(res,'22222');
        // console.log(res.data);
        console.log(res.data.data);
        setHotels(res.data.data);
      } catch (err) {
        console.error("获取酒店列表失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHotels();
  }, [merchantId]);
  
  console.log(hotels,'3333');

  const [currentHotel, setCurrentHotel] = useState(null);
  const [isEdit, setIsEdit] = useState(false);

  const handleStatusChange = (id, newStatus) => {
    setHotels(hotels.map(h =>
      h.id === id ? { ...h, status: newStatus } : h
    ));
  };

  const handleEditChange = (key, value) => {
    setCurrentHotel({ ...currentHotel, [key]: value });
  };

  const handleSave = () => {
    setHotels(hotels.map(h =>
      h.id === currentHotel.id ? currentHotel : h
    ));
    setIsEdit(false);
  };
  
  if (loading) return <div>加载中...</div>;

  return (
    <div className="hotel-list">
      <h2>我的酒店列表</h2>

      <table className="hotel-table">
        <thead>
          <tr>
            <th>酒店名</th>
            <th>地址</th>
            <th>星级</th>
            <th>房型</th>
            <th>价格</th>
            <th>开业时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>

        <tbody>
          {hotels.map(hotel => (
            <tr key={hotel.id}>
              <td>
                <div className="hotel-name">
                  <strong>{hotel.name_cn}</strong>
                  <div className="hotel-en">{hotel.name_en}</div>
                  <span
                    className="detail-link"
                    // 点击重定向页面
                    onClick={() => {
                      //navigate(`/hotel-detail/${hotel.id}/edit`);
                      window.open(`/hotel-detail/${hotel.id}/edit`, '_blank');
                    }}
                  >
                    酒店详情
                  </span>
                </div>
              </td>
              <td>{hotel.address}</td>
              <td>{hotel.star}</td>
              <td>{hotel.type}</td>
              <td>{100}</td>
              <td>{hotel.open_year}</td>
              <td>{hotel.status}</td>
              <td>
                <select
                  value={hotel.status}
                  onChange={e =>
                    handleStatusChange(hotel.id, e.target.value)
                  }
                >
                  <option value="已上线">上线</option>
                  <option value="已下线">下线</option>
                  <option value="审核中">审核中</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 详情弹窗 */}
      {currentHotel && (
        <div className="modal-mask">
          <div className="modal">
            <span
              className="close-btn"
              onClick={() => setCurrentHotel(null)}
            >
              ×
            </span>

            {/* 🔥 新增滚动容器 */}
            <div className="modal-body">
                <img src={currentHotel.image} alt="hotel" />

                {["nameCn","nameEn","address","star","roomType","price","openTime"].map(key => (
                <p key={key}>
                    <strong>{key}：</strong>
                    {isEdit ? (
                    <input
                        value={currentHotel[key]}
                        onChange={e =>
                        handleEditChange(key, e.target.value)
                        }
                    />
                    ) : (
                    currentHotel[key]
                    )}
                </p>
                ))}

                <div className="modal-footer">
                {isEdit ? (
                    <button onClick={handleSave}>保存</button>
                ) : (
                    <button onClick={() => setIsEdit(true)}>编辑</button>
                )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
