import { useState } from "react";
import "./login.css";
import { login } from "@/api/auth";
import { useNavigate } from "react-router-dom";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_POLICY_REGEX,
  PASSWORD_POLICY_TEXT,
  normalizeEmail,
  normalizePassword,
} from "@/auth/passwordPolicy";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const nextEmail = normalizeEmail(email);
    const nextPassword = normalizePassword(password);

    if (!nextEmail) {
      setError("请输入邮箱");
      return;
    }
    if (nextPassword.length < PASSWORD_MIN_LENGTH || nextPassword.length > PASSWORD_MAX_LENGTH) {
      setError(PASSWORD_POLICY_TEXT);
      return;
    }
    if (!PASSWORD_POLICY_REGEX.test(nextPassword)) {
      setError(PASSWORD_POLICY_TEXT);
      return;
    }

    try {
      setLoading(true);
      const res = await login({
        email: nextEmail,
        password: nextPassword,
      });
      /*** ① 拿到后端返回的数据* res.data = { access_token: "xxx" }*/
      const token = res.data.access_token;
      /*** ② 保存 token（关键！）* 页面刷新不丢登录态，全靠它*/
      localStorage.setItem("token", token);
      /**③ 登录成功，跳转到首页,首页会自动走 /auth/me 判断角色*/
      if (token == null) {
        setError("登录失败");
        return;
      }
      window.location.href = "/";
    } catch (err) {
      setError(err?.response?.data?.message || "邮箱或密码错误");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div className="login-container">
      <h2>酒店管理系统登录</h2>
      <form onSubmit={handleLogin}>
      <input
        type="text"
        placeholder="邮箱"
        value={email}
        autoComplete="username"
        maxLength={100}
        onChange={(e) => setEmail(normalizeEmail(e.target.value))}
      />

      <input
        type="password"
        placeholder="密码"
        value={password}
        autoComplete="current-password"
        maxLength={PASSWORD_MAX_LENGTH}
        onChange={(e) => setPassword(normalizePassword(e.target.value))}
      />
      <div style={{ color: "#667085", fontSize: 12, marginTop: 6 }}>{PASSWORD_POLICY_TEXT}</div>
      <button type="submit" disabled={loading}>{loading ? "登录中..." : "登录"}</button>
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
