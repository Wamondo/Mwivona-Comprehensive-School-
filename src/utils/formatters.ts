/**
 * Currency & Formatting Utilities for Kenyan ElimuPulse System
 */

export function formatKshs(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Kshs 0';
  }
  return `Kshs ${Number(amount).toLocaleString('en-KE')}`;
}

export function formatCurrencyValue(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0';
  }
  return Number(amount).toLocaleString('en-KE');
}

export function formatKenyanDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
