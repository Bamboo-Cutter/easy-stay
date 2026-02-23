import { useState } from "react";
import "./register.css";
import { useNavigate } from "react-router-dom";
import { register } from "@/api/auth";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;
const PASSWORD_POLICY_TEXT = "密码需8-64位，包含大小写字母、数字和特殊字符";
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S+$/;

const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase().slice(0, 100);
const normalizePassword = (value) => String(value ?? "").slice(0, PASSWORD_MAX_LENGTH);

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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("MERCHANT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const nextEmail = normalizeEmail(email);
    const nextPassword = normalizePassword(password);
    const nextConfirm = normalizePassword(confirmPassword);

    if (!nextEmail || !nextPassword) {
      setError("请输入邮箱和密码");
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
    if (nextPassword !== nextConfirm) {
      setError("两次输入的密码不一致");
      return;
    }

    try {
      setLoading(true);

      await register({
        email: nextEmail,
        password: nextPassword,
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
          autoComplete="username"
          maxLength={100}
          onChange={(e) => setEmail(normalizeEmail(e.target.value))}
        />

        <input
          className="input"
          type="password"
          name="password"
          placeholder="密码"
          value={password}
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          onChange={(e) => setPassword(normalizePassword(e.target.value))}
        />
        <input
          className="input"
          type="password"
          name="confirmPassword"
          placeholder="确认密码"
          value={confirmPassword}
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          onChange={(e) => setConfirmPassword(normalizePassword(e.target.value))}
        />
        <div style={{ color: "#667085", marginTop: 8, fontSize: 12 }}>
          {PASSWORD_POLICY_TEXT}
        </div>

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
        </div>
        <div style={{ color: "#667085", marginTop: 8, fontSize: 12 }}>
          管理员账号请由系统内部创建，不支持公开注册。
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
