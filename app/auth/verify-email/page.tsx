import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background to-card">
      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-balance">Check Your Email</CardTitle>
            <CardDescription className="text-muted-foreground">We&apos;ve sent you a verification link</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              Please check your email and click the verification link to activate your account. Once verified, you can
              start your mental health journey with our AI support.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
