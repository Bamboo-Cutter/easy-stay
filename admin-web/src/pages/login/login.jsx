import { useState } from "react";
import "./login.css";
import { login } from "@/api/auth";
import { useNavigate } from "react-router-dom";
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();


  // const handleLogin1 = () => {
  //   if (account === "19822765021" && password === "12060711") {
  //     localStorage.setItem("role", "merchant");
  //     localStorage.setItem("account", account);
  //     navigate("/home-merchant");
  //     return;
  //   }

  //   if (account === "admin123" && password === "123") {
  //     localStorage.setItem("role", "admin");
  //     localStorage.setItem("account", account);
  //     navigate("/home-admin");
  //     return;
  //   }
  //   alert("账号或密码错误！");
  // };

// 点击登录
  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('1. 表单数据:', { email, password });
    try {
      const res = await axios.post('http://localhost:3000/auth/login', {
        email,
        password
      });
      console.log('2. 登录成功:', res.data);
      
    } catch (error) {
      console.error('3. 错误状态:', error.response?.status);      // 401
      console.error('4. 错误信息:', error.response?.data);        // 后端返回的具体错误
      console.error('5. 完整错误:', error.message);
      
      alert(error.response?.data?.message || '登录失败，请检查用户名密码');
    }

    setError("");

    try {
      const res = await axios.post(
        "http://localhost:3000/auth/login",
        {
          email,
          password,
        }
      );
      /*** ① 拿到后端返回的数据* res.data = { access_token: "xxx" }*/
      const token = res.data.access_token;
      /*** ② 保存 token（关键！）* 页面刷新不丢登录态，全靠它*/
      localStorage.setItem("token", token);
      /**③ 登录成功，跳转到首页,首页会自动走 /auth/me 判断角色*/
      console.log(token)
      if(token==null) {
        setError("登录失败");
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError("邮箱或密码错误");
    }
  };
  

  return (
    <div className="login-container">
      <h2>酒店管理系统登录</h2>
      <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="账号"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">登录</button>
      </form>
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* ✅ 新增：去注册 */}
      <div className="register-tip">
        还没有账号？
        <span onClick={() => navigate("/register")}>去注册</span>
      </div>
    </div>
  );
}
