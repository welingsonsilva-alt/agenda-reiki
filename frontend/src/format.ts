import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

export { dayjs };

export const formatPrice = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
export const formatLongDate = (d: string) => {
  const s = dayjs(d).format("dddd, D [de] MMMM");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const modalityLabel = (m: string) => (m === "distancia" ? "À distância" : "Presencial");
export const statusLabel: Record<string, string> = {
  pending: "Aguardando confirmação",
  confirmed: "Confirmada",
  cancelled: "Cancelada",
};
