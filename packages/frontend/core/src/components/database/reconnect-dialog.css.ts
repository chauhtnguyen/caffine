import { style } from '@vanilla-extract/css';

export const dialogContent = style({
  maxWidth: '500px',
  padding: '24px',
});

export const dialogHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '20px',
});

export const warningIcon = style({
  fontSize: '32px',
  lineHeight: 1,
});

export const dialogTitle = style({
  margin: 0,
  fontSize: '20px',
  fontWeight: 600,
  color: 'var(--affine-text-primary-color)',
});

export const dialogBody = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
});

export const message = style({
  fontSize: '15px',
  color: 'var(--affine-text-primary-color)',
  margin: 0,
});

export const connectionInfo = style({
  padding: '12px',
  background: 'var(--affine-background-secondary-color)',
  borderRadius: '6px',
  fontSize: '13px',
  color: 'var(--affine-text-secondary-color)',
});

export const connectionDetails = style({
  marginTop: '4px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: 'var(--affine-text-primary-color)',
});

export const errorBox = style({
  padding: '12px',
  background: 'var(--affine-background-error-color)',
  border: '1px solid var(--affine-error-color)',
  borderRadius: '6px',
  fontSize: '13px',
  color: 'var(--affine-error-color)',
});

export const retryInfo = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px',
  background: 'var(--affine-background-secondary-color)',
  borderRadius: '6px',
});

export const countdown = style({
  fontSize: '14px',
  color: 'var(--affine-text-primary-color)',
  fontWeight: 500,
});

export const attemptCount = style({
  fontSize: '13px',
  color: 'var(--affine-text-secondary-color)',
});

export const options = style({
  marginTop: '8px',
});

export const optionTitle = style({
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--affine-text-secondary-color)',
  marginBottom: '8px',
});

export const optionsList = style({
  margin: 0,
  paddingLeft: '20px',
  fontSize: '13px',
  color: 'var(--affine-text-secondary-color)',
  selectors: {
    'li': {
      marginTop: '4px',
    },
  },
});

export const dialogActions = style({
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '12px',
  marginTop: '24px',
});
