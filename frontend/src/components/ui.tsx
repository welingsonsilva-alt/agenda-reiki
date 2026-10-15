import React from "react";
import { ActivityIndicator, Pressable, StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Feather from "@react-native-vector-icons/feather";
import { Image } from "expo-image";

import { fonts, images, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type BtnProps = {
  label: string;
  onPress: () => void;
  testID: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  style?: StyleProp<ViewStyle>;
  small?: boolean;
};

export function Button({ label, onPress, testID, variant = "primary", loading, disabled, icon, style, small }: BtnProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const bg = {
    primary: colors.brandPrimary,
    secondary: colors.brandTertiary,
    ghost: "transparent",
    danger: "transparent",
  }[variant];
  const fg = {
    primary: colors.onBrandPrimary,
    secondary: colors.onBrandTertiary,
    ghost: colors.brandPrimary,
    danger: colors.error,
  }[variant];
  return (
    <Animated.View style={[anim, style]}>
      <Pressable
        testID={testID}
        onPress={onPress}
        disabled={disabled || loading}
        onPressIn={() => (scale.value = withSpring(0.97))}
        onPressOut={() => (scale.value = withSpring(1))}
        style={[
          styles.btn,
          small && styles.btnSmall,
          { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
          variant === "danger" && { borderWidth: 1, borderColor: colors.error },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Feather name={icon} size={small ? 16 : 18} color={fg} /> : null}
            <Text style={[styles.btnText, small && styles.btnTextSmall, { color: fg }]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Field(props: TextInputProps & { label: string; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { label, style, ...rest } = props;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  action,
  testID,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  testID: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.empty} testID={testID}>
      <Image source={{ uri: images.zen }} style={styles.emptyImg} contentFit="cover" transition={300} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action}
    </View>
  );
}

export function ErrorState({ message, onRetry, testID }: { message: string; onRetry: () => void; testID: string }) {
  const styles = useStyles();
  return (
    <View style={styles.empty} testID={testID}>
      <Text style={styles.emptyTitle}>Algo saiu do equilíbrio</Text>
      <Text style={styles.emptySub}>{message}</Text>
      <Button testID={`${testID}-retry`} label="Tentar novamente" variant="secondary" onPress={onRetry} />
    </View>
  );
}

export function Badge({ label, tone }: { label: string; tone: "pending" | "confirmed" | "cancelled" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = { pending: colors.warning, confirmed: colors.success, cancelled: colors.surfaceTertiary }[tone];
  const fg = { pending: colors.onWarning, confirmed: colors.onSuccess, cancelled: colors.onSurfaceTertiary }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  btn: {
    minHeight: 52,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  btnSmall: { minHeight: 44, paddingHorizontal: spacing.lg },
  btnText: { fontFamily: fonts.bold, fontSize: 16 },
  btnTextSmall: { fontSize: 14 },
  fieldWrap: { gap: spacing.xs },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 13, color: c.onSurfaceSecondary },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.lg,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: c.onSurface,
  },
  empty: { alignItems: "center", paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyImg: { width: 140, height: 140, borderRadius: 70, marginBottom: spacing.sm },
  emptyTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onSurface, textAlign: "center" },
  emptySub: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, textAlign: "center", lineHeight: 20 },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, alignSelf: "flex-start" },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
}));
