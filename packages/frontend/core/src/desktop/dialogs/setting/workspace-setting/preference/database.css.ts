import { style } from '@vanilla-extract/css';

export const databasePanel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  width: '100%',
  marginTop: '12px',
});

export const statusBar = style({
  padding: '12px',
  background: 'var(--affine-background-primary-color)',
  borderRadius: '6px',
  border: '1px solid var(--affine-border-color)',
});

export const statusIndicator = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
});

export const statusDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: 'var(--affine-success-color)',
  flexShrink: 0,
});

export const statusDotOffline = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: 'var(--affine-error-color)',
  flexShrink: 0,
});

export const statusText = style({
  fontSize: '14px',
  color: 'var(--affine-text-primary-color)',
});

export const formGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const label = style({
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--affine-text-secondary-color)',
});

export const input = style({
  width: '100%',
  height: '36px',
});

export const checkboxLabel = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: 'var(--affine-text-primary-color)',
  cursor: 'pointer',
  selectors: {
    'input[type="checkbox"]': {
      width: '16px',
      height: '16px',
      cursor: 'pointer',
    },
  },
});

export const successMessage = style({
  padding: '12px',
  background: 'var(--affine-background-success-color)',
  border: '1px solid var(--affine-success-color)',
  borderRadius: '6px',
  color: 'var(--affine-success-color)',
  fontSize: '14px',
});

export const errorMessage = style({
  padding: '12px',
  background: 'var(--affine-background-error-color)',
  border: '1px solid var(--affine-error-color)',
  borderRadius: '6px',
  color: 'var(--affine-error-color)',
  fontSize: '14px',
});

export const details = style({
  marginTop: '8px',
  fontSize: '12px',
  color: 'var(--affine-text-secondary-color)',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
});

export const troubleshooting = style({
  marginTop: '8px',
  fontSize: '12px',
  color: 'var(--affine-text-secondary-color)',
  selectors: {
    'ul': {
      marginTop: '4px',
      paddingLeft: '20px',
    },
    'li': {
      marginTop: '2px',
    },
  },
});

export const actions = style({
  display: 'flex',
  gap: '12px',
  marginTop: '8px',
});

export const presets = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  paddingTop: '12px',
  borderTop: '1px solid var(--affine-border-color)',
});

export const presetsLabel = style({
  fontSize: '13px',
  color: 'var(--affine-text-secondary-color)',
  fontWeight: 500,
});
