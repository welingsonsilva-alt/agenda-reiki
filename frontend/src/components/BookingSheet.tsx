import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

import { api, Booking, SessionType } from "@/src/api";
import { Button } from "@/src/components/ui";
import { Sheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { dayjs, formatLongDate, formatPrice, modalityLabel } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Slot = { time: string; available: boolean };

export function BookingSheet({ session, onClose }: { session: SessionType | null; onClose: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const days = useMemo(
    () =>
      Array.from({ length: 21 }, (_, i) => dayjs().add(i, "day")).filter((d) => d.day() !== 0),
    [],
  );
  const [date, setDate] = useState(days[0].format("YYYY-MM-DD"));
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const slotsQ = useQuery({
    queryKey: ["availability", date],
    queryFn: () => api<{ slots: Slot[] }>(`/availability?date=${date}`),
    enabled: !!session,
  });

  const book = useMutation({
    mutationFn: () =>
      api<Booking>("/bookings", { method: "POST", body: { session_type_id: session!.id, date, time, notes } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-bookings"] });
      qc.invalidateQueries({ queryKey: ["availability"] });
      toast("Sessão agendada! Aguarde a confirmação.");
      close();
      router.push("/(tabs)/bookings");
    },
    onError: (e: Error) => {
      toast(e.message, "error");
      qc.invalidateQueries({ queryKey: ["availability", date] });
      setTime(null);
    },
  });

  const close = () => {
    setTime(null);
    setNotes("");
    onClose();
  };

  const slots = slotsQ.data?.slots ?? [];

  return (
    <Sheet visible={!!session} onClose={close} title={session?.name ?? ""} testID="booking-sheet">
      {session ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.meta}>
            {modalityLabel(session.modality)} · {session.duration_min} min · {formatPrice(session.price)}
          </Text>

          <Text style={styles.label}>Escolha o dia</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
            style={styles.rowScroll}
          >
            {days.map((d) => {
              const key = d.format("YYYY-MM-DD");
              const active = key === date;
              return (
                <Pressable
                  key={key}
                  testID={`date-pill-${key}`}
                  onPress={() => {
                    setDate(key);
                    setTime(null);
                  }}
                  style={[styles.datePill, active && styles.pillActive]}
                >
                  <Text style={[styles.dateWeek, active && styles.textActive]}>{d.format("ddd").replace(".", "")}</Text>
                  <Text style={[styles.dateNum, active && styles.textActive]}>{d.format("D")}</Text>
                  <Text style={[styles.dateWeek, active && styles.textActive]}>{d.format("MMM").replace(".", "")}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Horários em {formatLongDate(date)}</Text>
          {slotsQ.isLoading ? (
            <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
          ) : slots.length === 0 ? (
            <Text style={styles.noSlots} testID="no-slots-text">
              Sem horários neste dia. Que tal escolher outra data?
            </Text>
          ) : (
            <View style={styles.grid}>
              {slots.map((s) => {
                const active = s.time === time;
                return (
                  <Pressable
                    key={s.time}
                    testID={`time-slot-${s.time}`}
                    disabled={!s.available}
                    onPress={() => setTime(s.time)}
                    style={[styles.timePill, active && styles.pillActive, !s.available && styles.pillDisabled]}
                  >
                    <Text
                      style={[styles.timeText, active && styles.textActive, !s.available && styles.textDisabled]}
                    >
                      {s.time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={styles.label}>Intenção ou observação (opcional)</Text>
          <TextInput
            testID="booking-notes-input"
            value={notes}
            onChangeText={setNotes}
            placeholder="Conte o que você deseja harmonizar..."
            placeholderTextColor={colors.muted}
            multiline
            style={styles.notes}
          />

          <Button
            testID="confirm-booking-button"
            label={time ? `Reservar às ${time}` : "Escolha um horário"}
            disabled={!time}
            loading={book.isPending}
            onPress={() => book.mutate()}
            style={styles.cta}
          />
        </ScrollView>
      ) : null}
    </Sheet>
  );
}

const useStyles = makeStyles((c) => ({
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  meta: { fontFamily: fonts.semibold, fontSize: 14, color: c.muted, marginBottom: spacing.lg },
  label: { fontFamily: fonts.bold, fontSize: 15, color: c.onSurface, marginBottom: spacing.md, marginTop: spacing.sm },
  rowScroll: { marginHorizontal: -spacing.xl, marginBottom: spacing.lg, flexGrow: 0 },
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  datePill: {
    flexShrink: 0,
    width: 64,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    gap: 2,
  },
  pillActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  pillDisabled: { backgroundColor: c.surface, borderColor: c.border },
  dateWeek: { fontFamily: fonts.semibold, fontSize: 12, color: c.muted, textTransform: "capitalize" },
  dateNum: { fontFamily: fonts.display, fontSize: 22, color: c.onSurface },
  textActive: { color: c.onBrandPrimary },
  textDisabled: { color: c.borderStrong, textDecorationLine: "line-through" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  timePill: {
    width: "22.5%",
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: { fontFamily: fonts.bold, fontSize: 14, color: c.onSurface },
  loader: { marginVertical: spacing.xl },
  noSlots: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginBottom: spacing.lg },
  notes: {
    minHeight: 80,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: c.onSurface,
    textAlignVertical: "top",
  },
  cta: { marginTop: spacing.xl },
}));
