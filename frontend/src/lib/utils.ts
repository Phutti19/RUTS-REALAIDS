import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  );
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    low: "text-green-600 bg-green-100",
    medium: "text-yellow-600 bg-yellow-100",
    high: "text-orange-600 bg-orange-100",
    critical: "text-red-600 bg-red-100",
  };
  return map[severity] ?? "text-gray-600 bg-gray-100";
}

export function severityLabel(severity: string): string {
  const map: Record<string, string> = {
    low: "ต่ำ",
    medium: "ปานกลาง",
    high: "สูง",
    critical: "วิกฤต",
  };
  return map[severity] ?? severity;
}

export function incidentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    injury: "บาดเจ็บ",
    illness: "ป่วย",
    accident: "อุบัติเหตุ",
    fainting: "หมดสติ",
    other: "อื่นๆ",
  };
  return map[type] ?? type;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "รอรับเรื่อง",
    accepted: "รับเรื่องแล้ว",
    in_progress: "กำลังดำเนินการ",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
    waiting: "รอรับบริการ",
    in_treatment: "กำลังรักษา",
    referred: "ส่งต่อ",
    scheduled: "นัดหมายแล้ว",
    checked_in: "เช็คอินแล้ว",
    no_show: "ไม่มา",
  };
  return map[status] ?? status;
}
