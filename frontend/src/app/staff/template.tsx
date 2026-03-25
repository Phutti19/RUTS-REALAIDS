"use client";

export default function StaffTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-page-in w-full h-full">
      {children}
    </div>
  );
}
