import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, Booking } from "@/src/api";
import { BookingCard } from "@/src/components/BookingCard";
import { Sheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, EmptyState, ErrorState } from "@/src/components/ui";
import { dayjs, formatLongDate } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function MyBookings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const toast = useToast();
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [toCancel, setToCancel] = useState<Booking | null>(null);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const q = useQuery({ queryKey: ["my-bookings"], queryFn: () => api<Booking[]>("/bookings/me") });

  const cancel = useMutation({
    mutationFn: (id: string) => api(`/bookings/${id}/cancel`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
      toast("Agendamento cancelado.");
      setToCancel(null);
    },
    onError: (e: Error) => toast(e.message, "error"),
  });

  const today = dayjs().format("YYYY-MM-DD");
  const all = q.data ?? [];
  const upcoming = all.filter((b) => b.date >= today && b.status !== "cancelled");
  const past = all.filter((b) => b.date < today || b.status === "cancelled").reverse();
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Minha agenda</Text>
        <View style={styles.segment}>
          {(["upcoming", "past"] as const).map((k) => (
            <Pressable
              key={k}
              testID={`bookings-filter-${k}`}
              onPress={() => setTab(k)}
              style={[styles.segBtn, tab === k && styles.segActive]}
            >
              <Text style={[styles.segText, tab === k && styles.segTextActive]}>
                {k === "upcoming" ? `Próximas (${upcoming.length})` : "Histórico"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + spacing.xl }]}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.brandPrimary} />}
      >
        {q.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
        ) : q.isError ? (
          <ErrorState testID="bookings-error" message={(q.error as Error).message} onRetry={() => q.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            testID="bookings-empty"
            title={tab === "upcoming" ? "Nenhuma sessão agendada" : "Sem histórico ainda"}
            subtitle="Encontre seu momento de paz."
            action={
              tab === "upcoming" ? (
                <Button testID="empty-book-now-button" label="Agendar agora" onPress={() => router.push("/(tabs)/home")} />
              ) : undefined
            }
          />
        ) : (
          list.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              actions={
                tab === "upcoming" ? (
                  <Button
                    small
                    variant="ghost"
                    testID={`cancel-booking-${b.id}`}
                    label="Cancelar"
                    onPress={() => setToCancel(b)}
                  />
                ) : null
              }
            />
          ))
        )}
      </ScrollView>

      <Sheet visible={!!toCancel} onClose={() => setToCancel(null)} title="Cancelar sessão?" testID="cancel-sheet">
        <View style={styles.sheetBody}>
          <Text style={styles.sheetText}>
            {toCancel ? `${toCancel.session_name} · ${formatLongDate(toCancel.date)} às ${toCancel.time}` : ""}
          </Text>
          <Text style={styles.sheetSub}>O horário será liberado para outra pessoa.</Text>
          <Button
            testID="confirm-cancel-button"
            label="Sim, cancelar"
            variant="danger"
            loading={cancel.isPending}
            onPress={() => toCancel && cancel.mutate(toCancel.id)}
          />
          <Button testID="keep-booking-button" label="Manter sessão" variant="secondary" onPress={() => setToCancel(null)} />
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, gap: spacing.lg, backgroundColor: c.surface },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface },
  segment: { flexDirection: "row", backgroundColor: c.surfaceSecondary, borderRadius: radius.pill, padding: spacing.xs },
  segBtn: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segActive: { backgroundColor: c.brandPrimary },
  segText: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceSecondary },
  segTextActive: { color: c.onBrandPrimary },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingTop: spacing.sm },
  loader: { marginVertical: spacing.xxl },
  sheetBody: { paddingHorizontal: spacing.xl, gap: spacing.md },
  sheetText: { fontFamily: fonts.semibold, fontSize: 15, color: c.onSurface },
  sheetSub: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginBottom: spacing.md },
}));
