import { useState, useContext, useEffect } from "react";
import "./adminHotelList.css";
import { AuthContext } from "@/auth/AuthContext.jsx";
import axios from 'axios';

export default function AdminHotelList() {
  const [activeTab, setActiveTab] = useState("PENDING");
  const [modalVisible, setModalVisible] = useState(false);
  const [currentHotel, setCurrentHotel] = useState(null);
  const [auditVisible, setAuditVisible] = useState(false);
  const [auditHotel, setAuditHotel] = useState(null);
  const [auditResult, setAuditResult] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  
  const { user } = useContext(AuthContext);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);

  //useEffect(() => {
    //if (!merchantId) return;
    const fetchHotels = async () => {
      //console.log(merchantId);
      try {
        //console.log(merchantId,'1111');
        //console.log(merchantId,'1111');
        const res = await axios.get(`/api/hotel`);
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
  //}//, //"123333");

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
  //   },
  //   {
  //     id: 3,
  //     nameCn: "易宿·广州店",
  //     nameEn: "Yisu Guangzhou Hotel",
  //     address: "广州市天河区",
  //     star: "三星级",
  //     roomType: "标准间",
  //     price: "￥399 / 晚",
  //     openTime: "2019-03-20",
  //     status: "已下线",
  //     image: "https://via.placeholder.com/400x200"
  //   }
  // ]);

  const filteredHotels = hotels.filter(h => h.status === activeTab);

  const changeStatus = (id, status) => {
    setHotels(
      hotels.map(h =>
        h.id === id ? { ...h, status } : h
      )
    );
  };

  const openDetail = hotel => {
    setCurrentHotel(hotel);
    setModalVisible(true);
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div className="admin-hotel">
      <h2>酒店管理列表</h2>

      {/* Tab 选择栏 */}
      <div className="tab-bar">
        {["PENDING", "REJECTED", "OFFLINE"].map(tab => (
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
            <th>操作</th>
          </tr>
        </thead>

        <tbody>
          {filteredHotels.map(hotel => (
            <tr key={hotel.id}>
              <td>
                <strong>{hotel.name_cn}</strong>
                <div className="hotel-en">{hotel.name_en}</div>

                {activeTab !== "PENDING" && (
                  <div
                    className="detail-link"
                    onClick={() => openDetail(hotel)}
                  >
                    酒店详情
                  </div>
                )}
              </td>
              <td>{hotel.address}</td>
              <td>{hotel.star}</td>
              <td>{hotel.type}</td>
              <td>{300}</td>
              <td>{hotel.open_year}</td>
              <td>
                <span className={`status ${hotel.status}`}>
                  {hotel.status}
                </span>
              </td>
              <td>
                {activeTab === "PENDING" ? (
                  <span
                    className="audit-link"
                    onClick={() => {
                      setAuditHotel(hotel);
                      setAuditVisible(true);
                      setAuditResult("");
                      setRejectReason("");
                    }}
                  >
                    进行审核
                  </span>
                ) : (
                  <select
                    value={hotel.status}
                    onChange={e =>
                      changeStatus(hotel.id, e.target.value)
                    }
                  >
                    <option value="已上线">上线</option>
                    <option value="已下线">下线</option>
                  </select>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 酒店详情弹窗 */}
      {modalVisible && currentHotel && (
        <div className="modal-mask">
          <div className="modal">
            <span
              className="modal-close"
              onClick={() => setModalVisible(false)}
            >
              ×
            </span>


            {/* 🔥 新增滚动容器 */}
              <div className="modal-body">
                <img
                src={currentHotel.image}
                alt=""
                className="modal-img"
              />
              <h3>
                {currentHotel.name_cn}
                <div className="hotel-en">{currentHotel.name_en}</div>
              </h3>

              <p>地址：{currentHotel.address}</p>
              <p>星级：{currentHotel.star}</p>
              <p>房型：{currentHotel.type}</p>
              <p>价格：{400}</p>
              <p>开业时间：{currentHotel.open_year}</p>
            </div>
          </div>
        </div>
      )}

      {auditVisible && auditHotel && (
        <div className="modal-mask">
          <div className="modal">
            <span
              className="modal-close"
              onClick={() => setAuditVisible(false)}
            >
              ×
            </span>

            {/* 🔥 可滚动内容区 */}
            <div className="modal-body">
              <img
                src={auditHotel.image}
                alt=""
                className="modal-img"
              />

              <h3>
                {auditHotel.name_cn}
                <div className="hotel-en">{auditHotel.name_en}</div>
              </h3>

              <p>地址：{auditHotel.address}</p>
              <p>星级：{auditHotel.star}</p>
              <p>房型：{auditHotel.type}</p>
              <p>价格：{400}</p>
              <p>开业时间：{auditHotel.open_year}</p>

              <hr />

              {/* 审核选项 */}
              <div className="audit-section">
                <label>
                  <input
                    type="radio"
                    value="pass"
                    checked={auditResult === "pass"}
                    onChange={() => setAuditResult("pass")}
                  />
                  通过
                </label>

                <label>
                  <input
                    type="radio"
                    value="reject"
                    checked={auditResult === "reject"}
                    onChange={() => setAuditResult("reject")}
                  />
                  不通过
                </label>

                {auditResult === "reject" && (
                  <textarea
                    placeholder="请输入不通过原因"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                )}
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="modal-footer">
              <button
                disabled={
                  // 1️⃣ 没有选择通过 / 不通过
                  !auditResult ||
                  // 2️⃣ 选择了不通过，但没填原因
                  (auditResult === "reject" && !rejectReason.trim())
                }
                onClick={() => {
                  if (!auditResult) {
                    alert("请选择审核结果");
                    return;
                  }

                  changeStatus(
                    auditHotel.id,
                    auditResult === "pass" ? "已上线" : "已下线"
                  );
                  setAuditVisible(false);
                }}
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
