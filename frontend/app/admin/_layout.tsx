import { Redirect } from "expo-router";

import { useAuth } from "@/src/auth";
import { AppTabs } from "@/src/components/AppTabs";

export default function AdminTabsLayout() {
  const { user } = useAuth();
  if (!user) return <Redirect href="/login" />;
  if (user.role !== "admin") return <Redirect href="/(tabs)/home" />;
  return (
    <AppTabs
      tabs={[
        { name: "index", label: "Agenda", icon: "calendar", sf: "calendar" },
        { name: "sessions", label: "Sessões", icon: "feather", sf: "leaf.fill" },
        { name: "profile", label: "Perfil", icon: "user", sf: "person.fill" },
      ]}
    />
  );
}
