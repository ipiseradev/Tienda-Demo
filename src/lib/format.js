export const formatARS = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCompactNumber = (value) => {
  const amount = Number(value) || 0;
  return new Intl.NumberFormat("es-AR", { notation: "compact" }).format(amount);
};

