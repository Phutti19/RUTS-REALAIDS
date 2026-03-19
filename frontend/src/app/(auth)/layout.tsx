export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-layout min-h-screen bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
