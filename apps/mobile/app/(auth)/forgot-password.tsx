import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function ForgotPasswordScreen() {
  return (
    <AuthScreenLayout
      subtitle="Reset your password"
      description="Enter your email and we’ll send you a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthScreenLayout>
  );
}
