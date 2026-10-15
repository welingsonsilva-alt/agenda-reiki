import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Booking } from "@/src/api";
import { BookingCard } from "@/src/components/BookingCard";
import { useToast } from "@/src/components/toast";
import { Button, EmptyState, ErrorState } from "@/src/components/ui";
import { dayjs, formatLongDate } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Stats = { today: number; pending: number; upcoming: number; clients: number };

export default function AdminAgenda() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => dayjs().add(i, "day")), []);
  const [date, setDate] = useState<string | null>(dayjs().format("YYYY-MM-DD"));

  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => api<Stats>("/admin/stats") });
  const q = useQuery({
    queryKey: ["admin-bookings", date],
    queryFn: () => api<Booking[]>(`/admin/bookings${date ? `?date=${date}` : ""}`),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const action = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: "confirm" | "cancel" }) =>
      api(kind === "confirm" ? `/admin/bookings/${id}/confirm` : `/bookings/${id}/cancel`, { method: "POST" }),
    onSuccess: (_d, v) => {
      refresh();
      toast(v.kind === "confirm" ? "Sessão confirmada." : "Sessão cancelada.");
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const list = q.data ?? [];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.kicker}>Painel do terapeuta</Text>
        <View style={styles.statsRow}>
          <Text style={styles.bigNum} testID="admin-stat-today">
            {stats.data?.today ?? "–"}
          </Text>
          <Text style={styles.bigLabel}>sessões{"\n"}hoje</Text>
          <View style={styles.statPills}>
            <Text style={styles.statPill} testID="admin-stat-pending">
              {stats.data?.pending ?? 0} pendentes
            </Text>
            <Text style={styles.statPill} testID="admin-stat-upcoming">
              {stats.data?.upcoming ?? 0} próximas
            </Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
          <Pressable testID="admin-date-all" onPress={() => setDate(null)} style={[styles.chip, date === null && styles.chipActive]}>
            <Text style={[styles.chipText, date === null && styles.chipTextActive]}>Todas</Text>
          </Pressable>
          {days.map((d) => {
            const key = d.format("YYYY-MM-DD");
            const active = key === date;
            const label = d.isSame(dayjs(), "day") ? "Hoje" : d.format("ddd D").replace(".", "");
            return (
              <Pressable key={key} testID={`admin-date-${key}`} onPress={() => setDate(key)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + spacing.xl }]}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={refresh} tintColor={colors.brandPrimary} />}
      >
        {date ? <Text style={styles.dayTitle}>{formatLongDate(date)}</Text> : <Text style={styles.dayTitle}>Próximas sessões</Text>}
        {q.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
        ) : q.isError ? (
          <ErrorState testID="admin-bookings-error" message={(q.error as Error).message} onRetry={() => q.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState testID="admin-bookings-empty" title="Dia livre" subtitle="Nenhuma sessão agendada para este período." />
        ) : (
          list.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              showClient
              actions={
                b.status !== "cancelled" ? (
                  <>
                    <Button
                      small
                      variant="ghost"
                      testID={`admin-cancel-${b.id}`}
                      label="Cancelar"
                      onPress={() => action.mutate({ id: b.id, kind: "cancel" })}
                    />
                    {b.status === "pending" ? (
                      <Button
                        small
                        testID={`admin-confirm-${b.id}`}
                        label="Confirmar"
                        onPress={() => action.mutate({ id: b.id, kind: "confirm" })}
                      />
                    ) : null}
                  </>
                ) : null
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.xl, backgroundColor: c.surface },
  kicker: { fontFamily: fonts.semibold, fontSize: 14, color: c.muted },
  statsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs },
  bigNum: { fontFamily: fonts.display, fontSize: 56, color: c.brandPrimary, lineHeight: 64 },
  bigLabel: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurface, lineHeight: 18 },
  statPills: { flex: 1, alignItems: "flex-end", gap: spacing.xs },
  statPill: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: c.onBrandTertiary,
    backgroundColor: c.brandTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  chipRow: { height: 56, flexGrow: 0, marginHorizontal: -spacing.xl },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.xl, alignItems: "center" },
  chip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    justifyContent: "center",
  },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: c.onSurfaceSecondary, textTransform: "capitalize" },
  chipTextActive: { color: c.onBrandPrimary },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingTop: spacing.md },
  dayTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  loader: { marginVertical: spacing.xxl },
}));
