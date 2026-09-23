/**
 * Tokens como variables CSS (modo claro/oscuro). Mismos nombres de clave → cero
 * cambios en componentes. Valores dark en index.css (:root) y light en html.light.
 * El modo oscuro es pixel-idéntico al hex anterior: :root replica exactamente
 * los valores previos en formato "R G B".
 *
 * ponytail: tokens de doble rol resueltos por compromiso en light — primary y
 * primary-container colapsan a #059669 (texto verde legible Y fills/barras);
 * error a #dc2626 (texto de amenaza y bg de badge); ink cubre TopBar/barras
 * terminal/tabla con UN valor (#f5f2eb) donde light.html usa 3. Upgrade path:
 * tokens dedicados (ej. --c-green-text) si la fidelidad a light.html exige.
 */
const COLOR_TOKENS = [
  'surface', 'surface-dim', 'surface-bright',
  'surface-container-lowest', 'surface-container-low', 'surface-container',
  'surface-container-high', 'surface-container-highest', 'surface-variant',
  'on-surface', 'on-surface-variant', 'inverse-surface', 'inverse-on-surface',
  'outline', 'outline-variant', 'surface-tint',
  'primary', 'on-primary', 'primary-container', 'on-primary-container', 'inverse-primary',
  'secondary', 'on-secondary', 'secondary-container', 'on-secondary-container',
  'tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container',
  'error', 'on-error', 'error-container', 'on-error-container',
  'primary-fixed', 'primary-fixed-dim', 'on-primary-fixed', 'on-primary-fixed-variant',
  'secondary-fixed', 'secondary-fixed-dim', 'on-secondary-fixed', 'on-secondary-fixed-variant',
  'tertiary-fixed', 'tertiary-fixed-dim', 'on-tertiary-fixed', 'on-tertiary-fixed-variant',
  'background', 'on-background', 'hairline', 'hairline-strong', 'ink', 'edge-soft'
];

const colors = Object.fromEntries(
  COLOR_TOKENS.map((t) => [t, `rgb(var(--c-${t}) / <alpha-value>)`])
);

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors,
      borderRadius: {
        'DEFAULT': '0.25rem',
        'sm': '0.25rem',
        'md': '0.375rem',
        'lg': '0.5rem',
        'xl': '0.75rem',
        'full': '9999px',
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '0.75rem',
        'space-lg': '1rem',
        'space-xl': '1.5rem',
        'gutter': '1.5rem',
        'gutter-desktop': '1.5rem',
        'margin': '2rem',
        'margin-desktop': '2rem',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'body': ['Manrope', 'sans-serif'],
        'mono': ['Source Code Pro', 'monospace'],
        'display': ['Inter'],
        'headline-sm': ['Inter'],
        'label-code': ['Source Code Pro'],
        'caption': ['Manrope'],
        'body-md': ['Manrope'],
        'body-lg': ['Manrope'],
        'body-sm': ['Manrope'],
        'headline-xl-mobile': ['Inter'],
        'headline-lg': ['Inter'],
        'headline-xl': ['Inter'],
        'headline-md': ['Inter'],
        'title-md': ['Inter'],
        'title-lg': ['Inter'],
        'mono-sm': ['Source Code Pro'],
        'mono-md': ['Source Code Pro'],
        'mono-lg': ['Source Code Pro'],
        'label-caps': ['Source Code Pro'],
      },
      fontSize: {
        'display': ['28px', { lineHeight: '34px', letterSpacing: '-0.42px', fontWeight: '500' }],
        'headline-sm': ['18px', { lineHeight: '25px', fontWeight: '500' }],
        'label-code': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '19px', fontWeight: '400' }],
        'headline-xl': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-xl-mobile': ['28px', { lineHeight: '32px', letterSpacing: '-0.025em', fontWeight: '600' }],
        'headline-lg': ['36px', { lineHeight: '40px', letterSpacing: '-0.035em', fontWeight: '600' }],
        'headline-md': ['24px', { lineHeight: '28px', letterSpacing: '-0.025em', fontWeight: '600' }],
        'title-lg': ['18px', { lineHeight: '24px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'title-md': ['16px', { lineHeight: '24px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', letterSpacing: '-0.005em', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'mono-lg': ['14px', { lineHeight: '20px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'mono-md': ['12px', { lineHeight: '18px', letterSpacing: '0.02em', fontWeight: '500' }],
        'mono-sm': ['11px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '400' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.06em', fontWeight: '500' }],
      }
    }
  },
  plugins: []
};
