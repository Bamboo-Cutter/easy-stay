import { useState, useEffect, useMemo, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./CalendarEdit.css";
import { AuthContext } from "@/auth/AuthContext.jsx";

export default function CalendarEdit() {
  const { user } = useContext(AuthContext);
  const merchantId = user?.sub;

  const { roomId } = useParams();
  const navigate = useNavigate();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [priceCalendar, setPriceCalendar] = useState([]);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const res = await axios.get(`/api/hotels/rooms/${roomId}/prices`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPriceCalendar(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const priceMap = useMemo(() => {
    const map = new Map();
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

  const handlePriceChange = (dateKey, newPrice) => {
    setPriceCalendar(prev => {
      const existing = prev.find(
        item => new Date(item.date).toISOString().split("T")[0] === dateKey
      );

      if (existing) {
        return prev.map(item =>
          new Date(item.date).toISOString().split("T")[0] === dateKey
            ? { ...item, price: newPrice }
            : item
        );
      } else {
        return [
          ...prev,
          {
            room_id: roomId,
            date: dateKey,
            price: newPrice
          }
        ];
      }
    });
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");

      // 过滤掉无效数据
      const validPrices = priceCalendar.filter(
        item =>
          item.date &&
          Number.isInteger(item.price) &&
          item.price >= 0
      );
      console.log(validPrices);

      // 逐条提交
      await Promise.all(
        validPrices.map(item =>
          axios.post(
            `/api/merchant/rooms/${roomId}/prices`,
            {
              date: new Date(item.date).toISOString(), // 确保是 ISO 格式
              price: Number(item.price) // 确保是整数
            },
            {
              params: { merchant_id: merchantId },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
        )
      );

      alert("保存成功");
      window.history.back(); 

    } catch (err) {
      console.error(err);
      alert("保存失败");
    }
  };


  return (
    <div className="ce-wrapper">
      <div className="ce-card">

        <div className="ce-header">
          <h2 className="ce-title">价格日历编辑</h2>
          <div className="ce-month-switch">
            <button onClick={() => changeMonth(-1)}>‹</button>
            <span>{year}年 {month + 1}月</span>
            <button onClick={() => changeMonth(1)}>›</button>
          </div>
        </div>

        <div className="ce-grid">
          {["日","一","二","三","四","五","六"].map(d => (
            <div key={d} className="ce-week">{d}</div>
          ))}

          {days.map((day, index) => {
            if (!day) return <div key={index} className="ce-cell empty" />;
            
            const dateObj = new Date(year, month, day);
            const dateKey = `${dateObj.getFullYear()}-${String(
              dateObj.getMonth() + 1
            ).padStart(2, "0")}-${String(
              dateObj.getDate()
            ).padStart(2, "0")}`;

            const price = priceMap.get(dateKey);
            console.log(day, dateKey, price);

            return (
              <div key={index} className="ce-cell">
                <div className="ce-day">{day}</div>

                <input
                  className="ce-input"
                  type="number"
                  value={price/100 || ""}
                  placeholder="暂无价格"
                  onChange={(e) =>
                    handlePriceChange(dateKey, Number(e.target.value*100))
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="ce-footer">
          <button className="ce-save-btn" style={{background: '#ef994dff' }} onClick={() => window.history.back()}>
            返回
          </button>
          <button className="ce-save-btn" onClick={handleSave}>
            保存全部价格
          </button>
        </div>

      </div>
    </div>
  );
}
