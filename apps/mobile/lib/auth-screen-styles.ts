import { StyleSheet } from 'react-native';

export const AUTH_BG = '#F7F4EF';
export const AUTH_SURFACE = '#FFFFFF';
export const AUTH_TEXT_PRIMARY = '#1C1917';
export const AUTH_TEXT_MUTED = '#78716C';
export const AUTH_BORDER = '#E7E5E4';
export const AUTH_ACCENT = '#C4713B';
export const AUTH_PLACEHOLDER = '#A8A29E';

export const authScreenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AUTH_BG,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: AUTH_BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  hero: {
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: AUTH_TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: AUTH_TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
  },
  description: {
    fontSize: 15,
    color: AUTH_TEXT_MUTED,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 10,
    paddingHorizontal: 8,
  },
  form: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: 20,
  },
  errorContainer: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: AUTH_TEXT_PRIMARY,
  },
  forgotButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '500',
    color: AUTH_ACCENT,
  },
  input: {
    backgroundColor: AUTH_SURFACE,
    borderWidth: 1,
    borderColor: AUTH_BORDER,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: AUTH_TEXT_PRIMARY,
  },
  primaryButton: {
    backgroundColor: AUTH_ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerLinkButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerLinkText: {
    fontSize: 15,
    color: AUTH_TEXT_MUTED,
    textAlign: 'center',
  },
  footerLinkBold: {
    fontWeight: '600',
    color: AUTH_TEXT_PRIMARY,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.85,
  },
});
