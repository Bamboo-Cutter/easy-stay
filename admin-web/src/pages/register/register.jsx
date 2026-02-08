import { useState } from "react";
import "./register.css";
import { useNavigate } from "react-router-dom";
import { register } from "@/api/auth";

// export default function Register() {
//   const [form, setForm] = useState({
//     username: "",
//     password: "",
//     role: "merchant"
//   });

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("merchant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("请输入邮箱和密码");
      return;
    }

    try {
      setLoading(true);

      await register({
        email,
        password,
        role,
      });

      alert("注册成功，请登录");
      navigate("/login");
    } catch (err) {
      setError(
        err?.response?.data?.message || "注册失败，请检查邮箱是否已存在"
      );
    } finally {
      setLoading(false);
    }
  };

  // const handleChange = (e) => {
  //   setForm({
  //     ...form,
  //     [e.target.name]: e.target.value
  //   });
  // };

  // const handleRegister = () => {
  //   if (!form.username || !form.password) {
  //     alert("请填写完整信息");
  //     return;
  //   }

  //   console.log("注册信息：", form);
  //   alert("注册成功（模拟）");
  // };

  return (
    <div className="register-container">
      <div className="register-box">
        <h2 className="title">账号注册</h2>

        <form onSubmit={handleSubmit}>
        <input
          className="input"
          name="email"
          placeholder="请输入邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          type="password"
          name="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="role-group">
          <label>
            <input
              type="radio"
              name="role"
              value="MERCHANT"
              checked={role === "MERCHANT"}
              onChange={(e) => setRole(e.target.value)}
            />
            商户
          </label>

          <label>
            <input
              type="radio"
              name="role"
              value="ADMIN"
              onChange={(e) => setRole(e.target.value)}
            />
            管理员
          </label>
        </div>

        {error && (
          <div style={{ color: "red", marginTop: 10 }}>{error}</div>
        )}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "注册中..." : "注册"}
        </button>
        </form>

        <div className="footer">
          <a href="/login">返回登录</a>
        </div>
      </div>
    </div>
  );
}
