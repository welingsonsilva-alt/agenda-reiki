import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import Feather from "@react-native-vector-icons/feather";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, SessionType } from "@/src/api";
import { useAuth } from "@/src/auth";
import { BookingSheet } from "@/src/components/BookingSheet";
import { ErrorState } from "@/src/components/ui";
import { formatPrice, modalityLabel } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, images, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const cardImages = [images.reiki, images.nature, images.zen];

export default function Home() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selected, setSelected] = useState<SessionType | null>(null);
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const q = useQuery({ queryKey: ["session-types"], queryFn: () => api<SessionType[]>("/session-types") });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.hello} testID="home-greeting">
          Olá, {user?.name.split(" ")[0]}
        </Text>
        <Text style={styles.headline}>Continue sua jornada</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + spacing.xl }]}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.brandPrimary} />}
      >
        <View style={styles.hero}>
          <Image source={{ uri: images.nature }} style={styles.heroImg} contentFit="cover" transition={300} />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroTitle}>Espaço ORUN</Text>
            <Text style={styles.heroText}>Seg a Sáb · 9h às 19h · Sessões presenciais e à distância</Text>
          </View>
        </View>

        <Text style={styles.section}>Escolha sua sessão</Text>

        {q.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} style={styles.loader} testID="sessions-loading" />
        ) : q.isError ? (
          <ErrorState testID="sessions-error" message={(q.error as Error).message} onRetry={() => q.refetch()} />
        ) : (
          q.data?.map((s, i) => (
            <Animated.View key={s.id} entering={FadeInDown.delay(i * 90).duration(450)}>
              <Pressable
                testID={`session-type-card-${s.id}`}
                onPress={() => setSelected(s)}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <Image source={{ uri: cardImages[i % cardImages.length] }} style={styles.cardImg} contentFit="cover" transition={300} />
                <View style={styles.cardBody}>
                  <View style={styles.tag}>
                    <Feather name={s.modality === "distancia" ? "wifi" : "map-pin"} size={12} color={colors.onBrandTertiary} />
                    <Text style={styles.tagText}>{modalityLabel(s.modality)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {s.description}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardMeta}>
                      {s.duration_min} min · {formatPrice(s.price)}
                    </Text>
                    <View style={styles.arrow}>
                      <Feather name="arrow-right" size={18} color={colors.onBrandPrimary} />
                    </View>
                  </View>
                </View>
              </Pressable>
            </Animated.View>
          ))
        )}
      </ScrollView>
      <BookingSheet session={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: c.surface },
  hello: { fontFamily: fonts.semibold, fontSize: 15, color: c.muted },
  headline: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface, marginTop: 2 },
  content: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingTop: spacing.sm },
  hero: { height: 150, borderRadius: radius.lg, overflow: "hidden", backgroundColor: c.surfaceTertiary },
  heroImg: { ...{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } },
  heroOverlay: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, backgroundColor: "rgba(45,55,43,0.35)" },
  heroTitle: { fontFamily: fonts.display, fontSize: 22, color: c.onSurfaceInverse },
  heroText: { fontFamily: fonts.semibold, fontSize: 13, color: c.onSurfaceInverse, marginTop: 2 },
  section: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface, marginTop: spacing.md },
  loader: { marginVertical: spacing.xxl },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1, borderColor: c.border },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  cardImg: { height: 140, width: "100%" },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: c.brandTertiary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: { fontFamily: fonts.bold, fontSize: 12, color: c.onBrandTertiary },
  cardTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface },
  cardDesc: { fontFamily: fonts.regular, fontSize: 14, color: c.onSurfaceSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  cardMeta: { fontFamily: fonts.bold, fontSize: 14, color: c.brandPrimary },
  arrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
}));
