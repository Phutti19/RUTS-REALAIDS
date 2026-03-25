"use client";

export default function StudentTemplate({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-page-in w-full h-full">
      {children}
    </div>
  );
}
