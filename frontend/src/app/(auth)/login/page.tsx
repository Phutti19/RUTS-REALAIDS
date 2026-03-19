"use client";

import { useState, useEffect, useRef, type FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Stethoscope,
  Loader2,
  Siren,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

type UserType = "student" | "staff";
type Step = "select" | "login";

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, logout, user, isLoading } = useAuthContext();

  const roleParam = searchParams.get("role") as UserType | null;
  const [step, setStep] = useState<Step>(roleParam === "student" || roleParam === "staff" ? "login" : "select");
  const [stepDir, setStepDir] = useState<"forward" | "back">("forward");
  const [userType, setUserType] = useState<UserType>(roleParam === "staff" ? "staff" : "student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shakeKey, setShakeKey] = useState(0);

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (!isLoading && user && !isSubmittingRef.current) {
      router.replace(user.role === "student" ? "/student/dashboard" : "/staff/dashboard");
    }
  }, [isLoading, user, router]);

  const selectRole = (type: UserType) => {
    setStepDir("forward");
    setUserType(type);
    setError("");
    setStep("login");
  };

  const handleBack = () => {
    setStepDir("back");
    setStep("select");
    setError("");
    setEmail("");
    setPassword("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    isSubmittingRef.current = true;

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      isSubmittingRef.current = false;
      setError(result.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      setShakeKey((k) => k + 1);
      return;
    }

    const isStudent = result.role === "student";
    const selectedStudent = userType === "student";
    if (isStudent !== selectedStudent) {
      await logout();
      isSubmittingRef.current = false;
      setError(
        selectedStudent
          ? "บัญชีนี้ไม่ใช่บัญชีนักศึกษา กรุณาเลือกประเภท \"บุคลากร\""
          : "บัญชีนี้ไม่ใช่บัญชีบุคลากร กรุณาเลือกประเภท \"นักศึกษา\""
      );
      setShakeKey((k) => k + 1);
      return;
    }

    if (result.role === "student") {
      router.push("/student/dashboard");
    } else {
      router.push("/staff/dashboard");
    }
  };

  const isStaff = userType === "staff";
  const stepAnim = stepDir === "forward"
    ? "animate-[slideInRight_0.3s_ease-out]"
    : "animate-[slideInLeft_0.3s_ease-out]";

  return (
    <>
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0);   }
          15%     { transform: translateX(-6px); }
          35%     { transform: translateX(6px);  }
          55%     { transform: translateX(-4px); }
          75%     { transform: translateX(4px);  }
        }
        @keyframes floatLogo {
          0%,100% { transform: translateY(0);   }
          50%     { transform: translateY(-5px); }
        }
        .card-enter  { animation: cardEnter 0.45s cubic-bezier(0.16,1,0.3,1) both; }
        .shake-anim  { animation: shake 0.45s ease-out; }
        .logo-float  { animation: floatLogo 3s ease-in-out infinite; }
      `}</style>

      <div className="w-full max-w-md card-enter">
        <div className="bg-gray-50 rounded-2xl shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-br from-blue-800 to-blue-950 px-8 py-10 text-white text-center relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />

            {step === "login" && (
              <button
                onClick={handleBack}
                className="absolute left-4 top-4 p-2 rounded-xl hover:bg-white/15 transition-all duration-200 hover:scale-110 active:scale-95"
                aria-label="ย้อนกลับ"
              >
                <ArrowLeft size={22} />
              </button>
            )}

            <div className="flex justify-center mb-4 relative z-10">
              <div className="w-[72px] h-[72px] bg-red-700 rounded-2xl flex items-center justify-center logo-float shadow-lg shadow-red-600/40">
                <Siren size={36} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold relative z-10">RUTS REALAIDS</h1>
            <p className="text-blue-200 text-base mt-1.5 relative z-10">ระบบแจ้งเหตุฉุกเฉินและห้องพยาบาล</p>
            <p className="text-blue-300/80 text-sm mt-1 relative z-10">มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย</p>
          </div>

          {/* Step 1 — Role selection */}
          {step === "select" && (
            <div key="select" className={`px-6 py-8 bg-slate-100 ${stepAnim}`}>
              <p className="text-center text-gray-600 text-base mb-6 font-medium">
                เลือกประเภทผู้ใช้งาน
              </p>
              <div className="grid grid-cols-2 gap-4">
                {/* Student */}
                <button
                  onClick={() => selectRole("student")}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-100 hover:-translate-y-1 transition-all duration-200 active:scale-95"
                >
                  <div className="w-16 h-16 bg-blue-100 group-hover:bg-blue-600 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md">
                    <GraduationCap size={30} className="text-blue-700 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800 text-base">นักศึกษา</p>
                    <p className="text-sm text-gray-500 mt-0.5">Student</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-200" />
                </button>

                {/* Staff */}
                <button
                  onClick={() => selectRole("staff")}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-teal-200 hover:border-teal-500 hover:bg-teal-50 hover:shadow-lg hover:shadow-teal-100 hover:-translate-y-1 transition-all duration-200 active:scale-95"
                >
                  <div className="w-16 h-16 bg-teal-100 group-hover:bg-teal-600 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md">
                    <Stethoscope size={30} className="text-teal-700 group-hover:text-white transition-colors duration-200" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-800 text-base">บุคลากร</p>
                    <p className="text-sm text-gray-500 mt-0.5">Staff / Admin</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all duration-200" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — Login form */}
          {step === "login" && (
            <div key="login" className={`px-8 py-7 ${stepAnim}`}>
              {/* Role badge */}
              <div className={`flex items-center gap-2.5 mb-5 px-4 py-3 rounded-xl transition-colors ${
                isStaff ? "bg-teal-50 border border-teal-200" : "bg-blue-50 border border-blue-200"
              }`}>
                {isStaff
                  ? <Stethoscope size={20} className="text-teal-700" />
                  : <GraduationCap size={20} className="text-blue-700" />
                }
                <span className={`text-base font-medium ${isStaff ? "text-teal-800" : "text-blue-800"}`}>
                  {isStaff ? "เข้าสู่ระบบในฐานะ บุคลากร" : "เข้าสู่ระบบในฐานะ นักศึกษา"}
                </span>
              </div>

              <form
                key={shakeKey}
                onSubmit={handleSubmit}
                className={`space-y-5 ${error ? "shake-anim" : ""}`}
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    {isStaff ? "อีเมล" : "รหัสนักศึกษา หรือ อีเมล"}
                  </label>
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isStaff ? "example@rmutsv.ac.th" : "รหัสนักศึกษา 12 หลัก หรือ อีเมล"}
                    required
                    autoFocus
                    autoComplete="username"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-shadow duration-200 hover:border-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่าน</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isStaff ? "รหัสผ่าน" : "รหัสผ่าน (เริ่มต้น = รหัสนักศึกษา)"}
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base transition-shadow duration-200 hover:border-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors hover:scale-110 active:scale-95"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-300 text-red-700 text-sm font-medium rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 text-white rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] hover:shadow-lg ${
                    isStaff
                      ? "bg-teal-700 hover:bg-teal-800 hover:shadow-teal-200"
                      : "bg-blue-800 hover:bg-blue-900 hover:shadow-blue-200"
                  }`}
                >
                  {loading ? (
                    <><Loader2 size={20} className="animate-spin" />กำลังเข้าสู่ระบบ...</>
                  ) : (
                    "เข้าสู่ระบบ"
                  )}
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-4 text-sm">
                <a
                  href="/forgot-password"
                  className="text-blue-700 hover:text-blue-900 hover:underline transition-colors font-medium"
                >
                  ลืมรหัสผ่าน?
                </a>
                {!isStaff && (
                  <>
                    <span className="text-gray-300">|</span>
                    <a
                      href="/register"
                      className="text-blue-700 hover:text-blue-900 hover:underline transition-colors font-medium"
                    >
                      เปลี่ยนรหัสผ่าน
                    </a>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-blue-200 text-xs mt-6 opacity-80">
          © 2026 มหาวิทยาลัยเทคโนโลยีราชมงคลศรีวิชัย
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
