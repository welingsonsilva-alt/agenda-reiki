import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Feather from "@react-native-vector-icons/feather";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api, SessionType } from "@/src/api";
import { Sheet } from "@/src/components/sheet";
import { useToast } from "@/src/components/toast";
import { Button, ErrorState, Field } from "@/src/components/ui";
import { formatPrice, modalityLabel } from "@/src/format";
import { usesNativeTabs } from "@/src/navigation";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Form = { id?: string; name: string; description: string; duration: string; price: string; modality: "presencial" | "distancia"; active: boolean };
const empty: Form = { name: "", description: "", duration: "60", price: "150", modality: "presencial", active: true };

export default function AdminSessions() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const toast = useToast();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [form, setForm] = useState<Form | null>(null);
  const [err, setErr] = useState("");
  const q = useQuery({ queryKey: ["session-types", "all"], queryFn: () => api<SessionType[]>("/session-types?all=true") });

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ["session-types"] });
    toast(msg);
    setForm(null);
  };

  const save = useMutation({
    mutationFn: (f: Form) =>
      api(f.id ? `/session-types/${f.id}` : "/session-types", {
        method: f.id ? "PUT" : "POST",
        body: {
          name: f.name.trim(),
          description: f.description.trim(),
          duration_min: parseInt(f.duration, 10),
          price: parseFloat(f.price.replace(",", ".")),
          modality: f.modality,
          active: f.active,
        },
      }),
    onSuccess: () => done("Tipo de sessão salvo."),
    onError: (e: Error) => setErr(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/session-types/${id}`, { method: "DELETE" }),
    onSuccess: () => done("Tipo de sessão removido."),
    onError: (e: Error) => setErr(e.message),
  });

  const submit = () => {
    if (!form) return;
    setErr("");
    const d = parseInt(form.duration, 10);
    const p = parseFloat(form.price.replace(",", "."));
    if (form.name.trim().length < 2 || isNaN(d) || d < 10 || isNaN(p) || p < 0) {
      setErr("Preencha nome, duração (mín. 10 min) e preço válidos.");
      return;
    }
    save.mutate(form);
  };

  const open = (s?: SessionType) => {
    setErr("");
    setForm(
      s
        ? { id: s.id, name: s.name, description: s.description, duration: String(s.duration_min), price: String(s.price), modality: s.modality, active: s.active }
        : { ...empty },
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.title}>Tipos de sessão</Text>
        <Text style={styles.sub}>Defina o que seus clientes podem agendar.</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomChrome + 96 }]}>
        {q.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} style={styles.loader} />
        ) : q.isError ? (
          <ErrorState testID="admin-sessions-error" message={(q.error as Error).message} onRetry={() => q.refetch()} />
        ) : (
          q.data?.map((s) => (
            <Pressable
              key={s.id}
              testID={`admin-session-${s.id}`}
              onPress={() => open(s)}
              style={({ pressed }) => [styles.card, !s.active && styles.inactive, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{s.name}</Text>
                <Text style={styles.cardMeta}>
                  {modalityLabel(s.modality)} · {s.duration_min} min · {formatPrice(s.price)}
                  {!s.active ? " · Inativa" : ""}
                </Text>
              </View>
              <Feather name="edit-2" size={18} color={colors.brandPrimary} />
            </Pressable>
          ))
        )}
      </ScrollView>

      <Pressable
        testID="add-session-type-fab"
        onPress={() => open()}
        style={[styles.fab, { bottom: bottomChrome + spacing.lg }]}
      >
        <Feather name="plus" size={20} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>Nova sessão</Text>
      </Pressable>

      <Sheet visible={!!form} onClose={() => setForm(null)} title={form?.id ? "Editar sessão" : "Nova sessão"} testID="session-form-sheet">
        {form ? (
          <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.form}>
            <Field label="Nome" testID="session-name-input" value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Ex.: Reiki Presencial" />
            <Field
              label="Descrição"
              testID="session-description-input"
              value={form.description}
              onChangeText={(v) => setForm({ ...form, description: v })}
              placeholder="Breve descrição"
              multiline
            />
            <View style={styles.twoCol}>
              <View style={styles.flex}>
                <Field label="Duração (min)" testID="session-duration-input" value={form.duration} keyboardType="number-pad" onChangeText={(v) => setForm({ ...form, duration: v })} />
              </View>
              <View style={styles.flex}>
                <Field label="Preço (R$)" testID="session-price-input" value={form.price} keyboardType="decimal-pad" onChangeText={(v) => setForm({ ...form, price: v })} />
              </View>
            </View>
            <View style={styles.segment}>
              {(["presencial", "distancia"] as const).map((m) => (
                <Pressable key={m} testID={`session-modality-${m}`} onPress={() => setForm({ ...form, modality: m })} style={[styles.segBtn, form.modality === m && styles.segActive]}>
                  <Text style={[styles.segText, form.modality === m && styles.segTextActive]}>{modalityLabel(m)}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Disponível para agendamento</Text>
              <Switch
                testID="session-active-switch"
                value={form.active}
                onValueChange={(v) => setForm({ ...form, active: v })}
                trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }}
              />
            </View>
            {err ? (
              <Text style={styles.error} testID="session-form-error">
                {err}
              </Text>
            ) : null}
            <Button testID="save-session-type-button" label="Salvar" loading={save.isPending} onPress={submit} />
            {form.id ? (
              <Button
                testID="delete-session-type-button"
                label="Excluir"
                variant="danger"
                icon="trash-2"
                loading={remove.isPending}
                onPress={() => remove.mutate(form.id!)}
              />
            ) : null}
          </KeyboardAwareScrollView>
        ) : null}
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: c.surface },
  title: { fontFamily: fonts.display, fontSize: 30, color: c.onSurface },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: c.muted, marginTop: spacing.xs },
  content: { paddingHorizontal: spacing.xl, gap: spacing.md, paddingTop: spacing.sm },
  loader: { marginVertical: spacing.xxl },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  inactive: { opacity: 0.55 },
  pressed: { opacity: 0.85 },
  flex: { flex: 1 },
  cardTitle: { fontFamily: fonts.display, fontSize: 18, color: c.onSurface },
  cardMeta: { fontFamily: fonts.semibold, fontSize: 13, color: c.muted, marginTop: 2 },
  fab: {
    position: "absolute",
    right: spacing.xl,
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: c.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fabText: { fontFamily: fonts.bold, fontSize: 15, color: c.onBrandPrimary },
  form: { paddingHorizontal: spacing.xl, gap: spacing.lg, paddingBottom: spacing.sm },
  twoCol: { flexDirection: "row", gap: spacing.md },
  segment: { flexDirection: "row", backgroundColor: c.surfaceSecondary, borderRadius: radius.pill, padding: spacing.xs },
  segBtn: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segActive: { backgroundColor: c.brandPrimary },
  segText: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurfaceSecondary },
  segTextActive: { color: c.onBrandPrimary },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switchLabel: { fontFamily: fonts.semibold, fontSize: 14, color: c.onSurface },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: c.error },
}));
