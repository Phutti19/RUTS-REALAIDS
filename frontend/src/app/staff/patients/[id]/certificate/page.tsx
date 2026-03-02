"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Loader2, Save, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { Certificate } from "@/types";

export default function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const printRef = useRef<HTMLDivElement>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Create form
  const [restDays, setRestDays] = useState(1);
  const [restStartDate, setRestStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [recommendation, setRecommendation] = useState("");
  const [diagnosisText, setDiagnosisText] = useState("");

  useEffect(() => {
    api.get<Certificate>(`/visits/${id}/certificate`).then((res) => {
      if (res.success && res.data) {
        setCertificate(res.data);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [id]);

  const createCertificate = async () => {
    setCreating(true);
    setError("");
    const endDate = new Date(restStartDate);
    endDate.setDate(endDate.getDate() + restDays - 1);
    const res = await api.post<Certificate>(`/visits/${id}/certificate`, {
      diagnosisText,
      restDays,
      restStartDate,
      restEndDate: endDate.toISOString().split("T")[0],
      recommendation: recommendation.trim() || null,
    });
    setCreating(false);
    if (res.success && res.data) {
      setCertificate(res.data);
      setNotFound(false);
    } else {
      setError(res.message ?? "เกิดข้อผิดพลาด");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3 print:hidden">
        <Link href={`/staff/patients/${id}`} className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">ใบรับรองแพทย์</h1>
        {certificate && (
          <button
            onClick={handlePrint}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"
          >
            <Printer size={15} /> พิมพ์
          </button>
        )}
      </div>

      {/* Create form if not exists */}
      {notFound && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 print:hidden">
          <h2 className="font-semibold text-gray-800">ออกใบรับรองแพทย์</h2>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">การวินิจฉัย *</label>
            <textarea
              value={diagnosisText}
              onChange={(e) => setDiagnosisText(e.target.value)}
              rows={2}
              placeholder="ระบุการวินิจฉัย..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">วันเริ่มพัก</label>
              <input
                type="date"
                value={restStartDate}
                onChange={(e) => setRestStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">จำนวนวันพัก</label>
              <input
                type="number"
                min={1}
                max={30}
                value={restDays}
                onChange={(e) => setRestDays(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">คำแนะนำเพิ่มเติม</label>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={2}
              placeholder="คำแนะนำสำหรับผู้ป่วย..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <button
            onClick={createCertificate}
            disabled={creating || !diagnosisText.trim()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            ออกใบรับรอง
          </button>
        </div>
      )}

      {/* Certificate preview */}
      {certificate && (
        <div
          ref={printRef}
          className="bg-white shadow-sm rounded-2xl p-8 print:shadow-none print:rounded-none print:p-0"
          style={{ fontFamily: "Sarabun, Arial, sans-serif" }}
        >
          {/* Header */}
          <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">ใบรับรองแพทย์</h1>
            <p className="text-sm text-gray-600 mt-1">MEDICAL CERTIFICATE</p>
            <p className="text-sm font-semibold mt-2">ห้องพยาบาล มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย</p>
            <p className="text-xs text-gray-500">Rajamangala University of Technology Srivijaya Infirmary</p>
          </div>

          {/* Certificate number */}
          <div className="flex justify-between mb-6">
            <p className="text-sm">
              <span className="text-gray-500">เลขที่: </span>
              <span className="font-semibold">{certificate.certificateNumber}</span>
            </p>
            <p className="text-sm">
              <span className="text-gray-500">วันที่ออก: </span>
              <span className="font-semibold">{formatDate(certificate.issuedAt)}</span>
            </p>
          </div>

          {/* Patient info */}
          <div className="mb-6 space-y-2">
            <p className="text-sm">
              ข้าพเจ้า{" "}
              <span className="font-bold border-b border-dotted border-gray-500 px-8">
                {certificate.issuedByName}
              </span>
              {" "}ได้ทำการตรวจโรคให้แก่
            </p>
            <p className="text-sm">
              <span className="text-gray-500">ชื่อ-นามสกุล: </span>
              <span className="font-bold">{certificate.patientName}</span>
              {certificate.studentId && (
                <span className="ml-4 text-gray-500">รหัสนักศึกษา: <span className="font-bold text-gray-800">{certificate.studentId}</span></span>
              )}
            </p>
          </div>

          {/* Diagnosis */}
          <div className="mb-4 bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">การวินิจฉัย / Diagnosis</p>
            <p className="text-sm text-gray-800">{certificate.diagnosisText}</p>
          </div>

          {/* Rest period */}
          <div className="mb-4 bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-600 mb-1 font-semibold uppercase tracking-wide">ระยะเวลาพักฟื้น / Rest Period</p>
            <p className="text-base font-bold text-blue-900">
              {certificate.restDays} วัน
            </p>
            {certificate.restStartDate && certificate.restEndDate && (
              <p className="text-sm text-blue-700 mt-0.5">
                ตั้งแต่ {formatDate(certificate.restStartDate)} ถึง {formatDate(certificate.restEndDate)}
              </p>
            )}
          </div>

          {/* Recommendation */}
          {certificate.recommendation && (
            <div className="mb-6 bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1 font-semibold uppercase tracking-wide">คำแนะนำ / Recommendation</p>
              <p className="text-sm text-gray-800">{certificate.recommendation}</p>
            </div>
          )}

          {/* Signature */}
          <div className="mt-10 flex justify-end">
            <div className="text-center w-48">
              <div className="border-t border-gray-800 pt-2">
                <p className="text-sm font-semibold">{certificate.issuedByName}</p>
                <p className="text-xs text-gray-500">ผู้ออกใบรับรอง</p>
                <p className="text-xs text-gray-500">{formatDate(certificate.issuedAt)}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-400">
              เลขที่ใบรับรอง {certificate.certificateNumber} · ออกโดยระบบ RUTS REALAIDS
            </p>
          </div>
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
          .print\\:shadow-none { position: absolute; top: 0; left: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
