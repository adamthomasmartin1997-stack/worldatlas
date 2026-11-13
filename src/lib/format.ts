const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });

export const fmtPeople = (v: number) => (v >= 1e6 ? `${(v / 1e6).toLocaleString('en-GB', { maximumFractionDigits: 1 })} million` : whole.format(v));
export const fmtUsd = (v: number) => `$${v >= 1e9 ? `${(v / 1e9).toLocaleString('en-GB', { maximumFractionDigits: 1 })} billion` : whole.format(v)}`;
export const fmtUsdAxis = (v: number) => `$${compact.format(v)}`;
export const fmtCompact = (v: number) => compact.format(v);
export const fmtYears = (v: number) => `${v.toFixed(1)} years`;
export const fmtYearsAxis = (v: number) => `${v}`;
