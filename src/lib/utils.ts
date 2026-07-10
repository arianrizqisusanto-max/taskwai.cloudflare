export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatIndoDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
  
  return dateObj.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

// Utility function for merging tailwind classes (usually used by shadcn style systems, keep simple)
export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
