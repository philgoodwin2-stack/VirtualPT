import { useCallback } from "react";
import axios from "axios";
import { useAuth } from "@clerk/react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const todayIndex = () => (new Date().getDay() + 6) % 7;

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(
    async (method, path, data, extra = {}) => {
      const token = await getToken();
      const res = await axios({ method, url: `${API}${path}`, data, headers: { Authorization: `Bearer ${token}` }, ...extra });
      return res.data;
    },
    [getToken],
  );
}

export function errorMessage(e) {
  if (!navigator.onLine) return "You're offline. Try again when connected.";
  return e?.response?.data?.detail && typeof e.response.data.detail === "string" ? e.response.data.detail : "Something went wrong. Please try again.";
}

export async function compressImage(file, max = 1600, quality = 0.8) {
  const bitmap = await loadImage(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Older iOS Safari lacks createImageBitmap for some files; fall back to an <img>.
async function loadImage(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
