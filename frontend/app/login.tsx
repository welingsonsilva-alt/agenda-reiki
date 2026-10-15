import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth";
import { Button, Field } from "@/src/components/ui";
import { fonts, images, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function Login() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Redirect href="/" />;

  const submit = async () => {
    setError("");
    if (!email.trim() || !password || (mode === "register" && !name.trim())) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }
    if (mode === "register" && password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={{ uri: images.login }} style={styles.bg} contentFit="cover" transition={400} />
      <LinearGradient colors={["transparent", colors.scrim, colors.surfaceInverse]} locations={[0, 0.45, 1]} style={styles.bg} />
      <KeyboardAwareScrollView
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
      >
        <Animated.View entering={FadeInDown.duration(600)} style={styles.brandBox}>
          <Text style={styles.logo} testID="brand-logo">
            ORUN
          </Text>
          <Text style={styles.tagline}>Reiki · Equilíbrio · Presença</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.card}>
          <Text style={styles.title}>{mode === "login" ? "Bem-vindo de volta" : "Comece sua jornada"}</Text>
          <Text style={styles.subtitle}>
            {mode === "login" ? "Entre para agendar seu momento de paz." : "Crie sua conta em poucos segundos."}
          </Text>
          <View style={styles.form}>
            {mode === "register" ? (
              <>
                <Field label="Nome" testID="register-name-input" value={name} onChangeText={setName} placeholder="Seu nome" />
                <Field
                  label="Telefone / WhatsApp"
                  testID="register-phone-input"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="(11) 99999-9999"
                />
              </>
            ) : null}
            <Field
              label="E-mail"
              testID="auth-email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="voce@email.com"
            />
            <Field
              label="Senha"
              testID="auth-password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••"
              onSubmitEditing={submit}
            />
            {error ? (
              <Text style={styles.error} testID="auth-error-text">
                {error}
              </Text>
            ) : null}
            <Button
              testID="auth-submit-button"
              label={mode === "login" ? "Entrar" : "Criar conta"}
              loading={loading}
              onPress={submit}
            />
            <Pressable
              testID="auth-toggle-mode-button"
              onPress={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
              style={styles.toggle}
            >
              <Text style={styles.toggleText}>
                {mode === "login" ? "Ainda não tem conta? " : "Já tem conta? "}
                <Text style={styles.toggleLink}>{mode === "login" ? "Cadastre-se" : "Entrar"}</Text>
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surfaceInverse },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  scroll: { flexGrow: 1, justifyContent: "space-between", paddingHorizontal: spacing.xl, gap: spacing.xxl },
  brandBox: { alignItems: "center", marginTop: spacing.xxl },
  logo: { fontFamily: fonts.display, fontSize: 56, color: c.onSurfaceInverse, letterSpacing: 8 },
  tagline: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceInverse, opacity: 0.9, letterSpacing: 1 },
  card: { backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.xl },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.onSurface },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginTop: spacing.xs },
  form: { gap: spacing.lg, marginTop: spacing.xl },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: c.error },
  toggle: { alignItems: "center", paddingVertical: spacing.sm, minHeight: 44, justifyContent: "center" },
  toggleText: { fontFamily: fonts.regular, fontSize: 14, color: c.onSurfaceSecondary },
  toggleLink: { fontFamily: fonts.bold, color: c.brandPrimary },
}));
