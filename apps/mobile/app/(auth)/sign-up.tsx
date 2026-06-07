import { AuthScreenLayout } from '@/components/auth-screen-layout';
import { SignUpForm } from '@/components/sign-up-form';

export default function SignUpScreen() {
  return (
    <AuthScreenLayout
      compact
      subtitle="Create your account"
      description="Welcome! Please fill in the details to get started."
    >
      <SignUpForm />
    </AuthScreenLayout>
  );
}
