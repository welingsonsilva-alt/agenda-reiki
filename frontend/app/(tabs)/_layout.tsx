import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth";
import { AppTabs } from "@/src/components/AppTabs";

export default function ClientTabsLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/admin" />;
  return (
    <AppTabs
      tabs={[
        { name: "home", label: "Início", icon: "sun", sf: "leaf.fill" },
        { name: "bookings", label: "Agenda", icon: "calendar", sf: "calendar" },
        { name: "profile", label: "Perfil", icon: "user", sf: "person.fill" },
      ]}
    />
  );
}
