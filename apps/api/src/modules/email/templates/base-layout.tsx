/**
 * Base Email Layout
 *
 * Premium email layout following Lingx design system.
 * Refined minimalism with warmth - restrained, precise, intentional.
 */
import { Body, Container, Head, Html, Preview, Section, Text } from '@react-email/components';
import type { ReactNode } from 'react';

interface BaseLayoutProps {
  preview: string;
  children: ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Accent bar */}
          <Section style={accentBar} />

          {/* Logo */}
          <Section style={header}>
            <table cellPadding="0" cellSpacing="0" style={{ margin: '0 auto' }}>
              <tr>
                <td style={logoMark}>L</td>
                <td style={logoType}>ingx</td>
              </tr>
            </table>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              &copy; {new Date().getFullYear()} Lingx &middot; Localization made simple
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ============================================================================
// Design Tokens (Lingx Design System)
// ============================================================================

export const colors = {
  // Brand
  primary: '#7C6EE6',
  primaryHover: '#6B5DD4',

  // Backgrounds
  pageBg: '#F5F4F8', // Subtle lavender tint
  cardBg: '#FFFFFF',
  mutedBg: '#F8F7FC',

  // Text
  foreground: '#242424',
  secondary: '#6B6B6B',
  muted: '#9A9A9A',

  // Borders
  border: '#E8E6EF',
  borderLight: '#F0EEF5',

  // Semantic
  success: '#5BB98B',
  successBg: '#E8F5EE',
  warning: '#E5A84B',
  warningBg: '#FDF6E8',
  error: '#E07070',
  errorBg: '#FDECEC',
};

// ============================================================================
// Base Styles
// ============================================================================

const main = {
  backgroundColor: colors.pageBg,
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '48px 0',
};

const container = {
  margin: '0 auto',
  maxWidth: '520px',
  padding: '0 24px',
};

const accentBar = {
  height: '3px',
  backgroundColor: colors.primary,
  borderRadius: '3px 3px 0 0',
};

const header = {
  backgroundColor: colors.cardBg,
  padding: '32px 32px 24px',
  textAlign: 'center' as const,
  borderLeft: `1px solid ${colors.border}`,
  borderRight: `1px solid ${colors.border}`,
};

const logoMark = {
  display: 'inline-block',
  width: '28px',
  height: '28px',
  backgroundColor: colors.primary,
  color: '#FFFFFF',
  fontSize: '16px',
  fontWeight: '600' as const,
  textAlign: 'center' as const,
  lineHeight: '28px',
  borderRadius: '6px',
  verticalAlign: 'middle',
};

const logoType = {
  color: colors.foreground,
  fontSize: '22px',
  fontWeight: '600' as const,
  letterSpacing: '-0.5px',
  paddingLeft: '6px',
  verticalAlign: 'middle',
};

const content = {
  backgroundColor: colors.cardBg,
  padding: '8px 32px 32px',
  borderLeft: `1px solid ${colors.border}`,
  borderRight: `1px solid ${colors.border}`,
  borderBottom: `1px solid ${colors.border}`,
  borderRadius: '0 0 12px 12px',
};

const footer = {
  textAlign: 'center' as const,
  padding: '24px 16px',
};

const footerText = {
  color: colors.muted,
  fontSize: '13px',
  margin: '0',
};

// ============================================================================
// Shared Component Styles (exported for templates)
// ============================================================================

export const styles = {
  // Typography
  heading: {
    fontSize: '24px',
    fontWeight: '600' as const,
    color: colors.foreground,
    letterSpacing: '-0.3px',
    lineHeight: '1.3',
    margin: '0 0 20px 0',
  },

  paragraph: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: colors.secondary,
    margin: '0 0 16px 0',
  },

  strong: {
    color: colors.foreground,
    fontWeight: '500' as const,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: '8px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: '500' as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '12px 24px',
    margin: '8px 0',
  },

  buttonSecondary: {
    backgroundColor: 'transparent',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    color: colors.foreground,
    fontSize: '14px',
    fontWeight: '500' as const,
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-block',
    padding: '11px 24px',
    margin: '8px 0',
  },

  // Dividers
  hr: {
    borderColor: colors.borderLight,
    borderWidth: '1px 0 0 0',
    borderStyle: 'solid',
    margin: '24px 0',
  },

  // Info box
  infoBox: {
    backgroundColor: colors.mutedBg,
    borderRadius: '8px',
    padding: '16px 20px',
    margin: '20px 0',
  },

  // Helper text
  mutedText: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: colors.muted,
    margin: '0',
  },

  // Links
  link: {
    color: colors.primary,
    textDecoration: 'none',
  },

  // Badge
  badge: {
    display: 'inline-block',
    backgroundColor: colors.mutedBg,
    color: colors.foreground,
    fontSize: '12px',
    fontWeight: '500' as const,
    padding: '4px 10px',
    borderRadius: '12px',
  },

  // Role display
  roleBox: {
    backgroundColor: colors.mutedBg,
    borderRadius: '8px',
    padding: '16px 20px',
    margin: '20px 0',
    textAlign: 'center' as const,
  },

  roleLabel: {
    fontSize: '11px',
    color: colors.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 4px 0',
  },

  roleValue: {
    fontSize: '16px',
    color: colors.foreground,
    fontWeight: '500' as const,
    margin: '0',
  },

  // List
  list: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: colors.secondary,
    paddingLeft: '20px',
    margin: '8px 0 16px 0',
  },

  // Footer note
  footerNote: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: colors.muted,
    margin: '0',
  },
};
