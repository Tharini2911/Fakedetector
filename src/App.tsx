import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "./lib/auth";
import AuthPage from "./pages/AuthPage";
import DetectorPage from "./pages/DetectorPage";

function Gate() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
      </div>
    );
  }

  return session ? <DetectorPage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
