export const toDisplayText = (value, fallback = "") => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => toDisplayText(item))
      .filter(Boolean)
      .join("\n");
    return text || fallback;
  }

  if (typeof value === "object") {
    if (value.msg) return toDisplayText(value.msg, fallback);
    if (value.message) return toDisplayText(value.message, fallback);
    if (value.detail) return toDisplayText(value.detail, fallback);
    if (value.error) return toDisplayText(value.error, fallback);

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export const getApiErrorMessage = (
  apiError,
  fallback = "Beklenmeyen bir hata oluştu.",
) => {
  const responseData = apiError?.response?.data;
  return toDisplayText(
    responseData?.detail || responseData?.error || responseData || apiError?.message,
    fallback,
  );
};
