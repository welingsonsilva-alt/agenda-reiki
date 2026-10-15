import React from "react";
import { ScrollView, Text, View } from "react-native";
import Feather from "@react-native-vector-icons/feather";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { Button } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function ProfileView() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  if (!user) return null;
  const rows: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; value: string }[] = [
    { icon: "mail", label: "E-mail", value: user.email },
    { icon: "phone", label: "Telefone", value: user.phone || "Não informado" },
    { icon: "map-pin", label: "Espaço", value: "ORUN · Terapias Integrativas" },
  ];
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl, paddingBottom: bottomChrome + spacing.xl }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name} testID="profile-name">
          {user.name}
        </Text>
        <Text style={styles.role}>{user.role === "admin" ? "Terapeuta" : "Cliente ORUN"}</Text>
        <View style={styles.card}>
          {rows.map((r, i) => (
            <View key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Feather name={r.icon} size={18} color={colors.brandPrimary} />
              <View style={styles.flex}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.quote}>“A energia flui para onde a atenção vai.”</Text>
        <Button testID="logout-button" label="Sair" variant="danger" icon="log-out" onPress={logout} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  avatarText: { fontFamily: fonts.display, fontSize: 36, color: c.onBrandTertiary },
  name: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface, textAlign: "center" },
  role: { fontFamily: fonts.semibold, fontSize: 14, color: c.muted, textAlign: "center", marginBottom: spacing.md },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  rowBorder: { borderTopWidth: 1, borderTopColor: c.divider },
  flex: { flex: 1 },
  rowLabel: { fontFamily: fonts.semibold, fontSize: 12, color: c.muted },
  rowValue: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurface },
  quote: { fontFamily: fonts.display, fontSize: 16, color: c.brandPrimary, textAlign: "center", marginVertical: spacing.xl },
}));
