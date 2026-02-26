export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_POLICY_TEXT = "密码需8-64位，包含大小写字母、数字和特殊字符";
export const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S+$/;

export const normalizeEmail = (value) =>
  String(value ?? "").trim().toLowerCase().slice(0, 100);

export const normalizePassword = (value) =>
  String(value ?? "").slice(0, PASSWORD_MAX_LENGTH);
