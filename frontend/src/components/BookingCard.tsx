import React from "react";
import { Text, View } from "react-native";
import Feather from "@react-native-vector-icons/feather";

import { Booking } from "@/src/api";
import { Badge } from "@/src/components/ui";
import { formatLongDate, formatPrice, modalityLabel, statusLabel } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function BookingCard({
  booking,
  showClient,
  actions,
}: {
  booking: Booking;
  showClient?: boolean;
  actions?: React.ReactNode;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const cancelled = booking.status === "cancelled";
  return (
    <View style={[styles.card, cancelled && styles.cardMuted]} testID={`booking-card-${booking.id}`}>
      <View style={styles.top}>
        <View style={styles.timeBox}>
          <Text style={styles.time}>{booking.time}</Text>
          <Text style={styles.duration}>{booking.duration_min} min</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{booking.session_name}</Text>
          <Text style={styles.date}>{formatLongDate(booking.date)}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Feather name={booking.modality === "distancia" ? "wifi" : "map-pin"} size={14} color={colors.muted} />
        <Text style={styles.meta}>
          {modalityLabel(booking.modality)} · {formatPrice(booking.price)}
        </Text>
      </View>
      {showClient ? (
        <View style={styles.metaRow}>
          <Feather name="user" size={14} color={colors.muted} />
          <Text style={styles.meta} testID={`booking-client-${booking.id}`}>
            {booking.user_name}
            {booking.user_phone ? ` · ${booking.user_phone}` : ""} · {booking.user_email}
          </Text>
        </View>
      ) : null}
      {booking.notes ? <Text style={styles.notes}>“{booking.notes}”</Text> : null}
      <View style={styles.bottom}>
        <Badge label={statusLabel[booking.status]} tone={booking.status} />
        <View style={styles.actions}>{actions}</View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardMuted: { opacity: 0.6 },
  top: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  timeBox: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: c.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  time: { fontFamily: fonts.display, fontSize: 18, color: c.onBrandTertiary },
  duration: { fontFamily: fonts.semibold, fontSize: 11, color: c.onBrandTertiary },
  flex: { flex: 1 },
  title: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  date: { fontFamily: fonts.semibold, fontSize: 13, color: c.muted, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  meta: { flex: 1, fontFamily: fonts.regular, fontSize: 13, color: c.onSurfaceSecondary },
  notes: { fontFamily: fonts.regular, fontStyle: "italic", fontSize: 13, color: c.muted },
  bottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs, gap: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
}));
