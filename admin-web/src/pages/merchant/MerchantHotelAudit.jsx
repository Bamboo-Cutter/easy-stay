import { useState, useEffect, useContext } from "react";
import "./MerchantHotelList.css";
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from 'axios';

export default function MerchantAuditHotel() {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [currentHotel, setCurrentHotel] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [editHotel, setEditHotel] = useState(null);
  
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const filteredHotels = hotels.filter(h => h.status === activeTab);

  useEffect(() => {
    if (!merchantId) return;
    const fetchHotels = async () => {
      console.log(merchantId);
      try {
        console.log(merchantId,'1111');
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

  // const hotels = [
  //   {
  //     id: 1,
  //     nameCn: "易宿·北京店",
  //     nameEn: "Yisu Beijing",
  //     address: "北京市朝阳区",
  //     star: "四星",
  //     roomType: "大床房",
  //     price: "¥399",
  //     openTime: "2021-06",
  //     status: "审核中",
  //   },
  //   {
  //     id: 2,
  //     nameCn: "易宿·上海店",
  //     nameEn: "Yisu Shanghai",
  //     address: "上海市浦东新区",
  //     star: "五星",
  //     roomType: "套房",
  //     price: "¥699",
  //     openTime: "2020-08",
  //     status: "未通过",
  //     rejectReason: "酒店资质文件不完整",
  //   },
  // ];
  
  if (loading) return <div>加载中...</div>;
 

  return (
    <div className="hotel-list">
      <h2>审核中酒店</h2>

      {/* Tab */}
      <div className="tab-bar">
        {["PENDING", "REJECTED"].map(tab => (
          <div
            key={tab}
            className={`tab-item ${activeTab === tab ? "active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </div>
        ))}
      </div>

      {/* 表格 */}
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
            <th>{activeTab === "PENDING" ? "审核状态" : "理由"}</th>
          </tr>
        </thead>

        <tbody>
          {filteredHotels.map(hotel => (
            <tr key={hotel.id}>
              <td>
                <strong>{hotel.name_cn}</strong>
                <div className="hotel-en">{hotel.name_en}</div>
                <span
                  className="detail-link"
                  // onClick={() => {
                  //   setCurrentHotel(hotel);
                  //   setEditHotel({ ...hotel }); // 🔥 复制一份用于编辑
                  //   setIsEdit(false);
                  // }}
                  // 点击重定向页面
                  onClick={() => {
                    //navigate(`/hotel-detail/${hotel.id}/edit`);
                    activeTab === "REJECTED" ? window.open(`/hotel-detail/${hotel.id}/edit`, '_blank') : window.open(`/hotel-detail/${hotel.id}`, '_blank');
                  }}
                >
                  {activeTab === "REJECTED" ? "修改" : "酒店详情"}
                </span>
              </td>
              <td>{hotel.address}</td>
              <td>{hotel.star}</td>
              <td>{hotel.type}</td>
              <td>{200}</td>
              <td>{hotel.open_year}</td>
              <td>
                <span className={`status ${hotel.status}`}>
                  {hotel.status}
                </span>
              </td>

              {/* 最后一列区分 */}
              <td>
                {activeTab === "PENDING" ? (
                  <span style={{ color: "#999" }}>等待审核</span>
                ) : (
                  <span style={{ color: "#ff4d4f" }}>
                    {hotel.reject_reason || "—"}
                  </span>
                )}
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

                {["name_cn","name_en","address","star","type","price","open_year"].map(key => (
                <p key={key}>
                    <strong>{key}：</strong>
                    {isEdit ? (
                      <input
                        value={editHotel[key]}
                        onChange={e =>
                          setEditHotel({
                            ...editHotel,
                            [key]: e.target.value,
                          })
                        }
                      />
                    ) : (
                      currentHotel[key]
                    )}
                </p>
                ))}
            </div>

            {activeTab === "REJECTED" && (
              <div className="modal-footer">
                {isEdit ? (
                  <button
                    //className="primary-btn"
                    onClick={() => {
                      setCurrentHotel(editHotel); // 保存修改
                      setIsEdit(false);
                    }}
                  >
                    保存
                  </button>
                ) : (
                  <button
                    //className="primary-btn"
                    onClick={() => setIsEdit(true)}
                  >
                    编辑
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
    </div>
  );
}
