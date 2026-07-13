import AuthLayout from "@/components/auth/AuthLayout"
import SignUpForm from "@/components/auth/SignUpForm"

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create an account"
      subtitle="Get started with Linkify for free"
    >
      <SignUpForm />
    </AuthLayout>
  )
}
