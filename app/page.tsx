import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Shield, MessageCircle, Brain, Lock, Sparkles } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/chat")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-8 h-8 text-primary" />
              <span className="text-xl font-semibold">Aura</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="default">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="default" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 md:py-28">
        <div className="text-center max-w-4xl mx-auto mb-24">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-accent/10 border border-accent/20 rounded-full">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">AI-Powered Mental Health Support</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Your Journey to
            <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
              Better Mental Health
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
            Connect with an empathetic AI companion designed to listen, understand, and support you 
            through every step of your wellness journey.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap mb-8">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all">
                Start Your Journey
                <Sparkles className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl border-2">
                Sign In
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Private, secure, and available 24/7
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-24 max-w-6xl mx-auto">
          <Card className="border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-card">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Empathetic Conversations</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Natural, judgment-free conversations powered by advanced AI trained in mental health support.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-lg bg-card">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-xl">Emotion Analysis</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                AI-powered emotion detection through text, voice, and facial expressions for personalized support.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-card">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Crisis Support</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Immediate access to crisis resources and emergency hotlines when you need urgent help.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-lg bg-card">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-xl">Private & Secure</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                End-to-end encrypted conversations with strict privacy policies to keep your data safe.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg bg-card">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Multi-Modal Support</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Choose between text, voice, or video chat based on your comfort and preferences.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border border-border/50 hover:border-accent/30 transition-all duration-300 hover:shadow-lg bg-card">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-xl">Progress Insights</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Track your emotional journey with personalized insights and progress visualization.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-4xl mx-auto">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 shadow-xl">
            <CardHeader className="space-y-6 py-12">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Heart className="w-8 h-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-3xl md:text-4xl font-bold">Ready to Begin?</CardTitle>
              <CardDescription className="text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Join thousands who have found comfort and support through Aura. 
                Your mental health journey starts here, and we&apos;re here every step of the way.
              </CardDescription>
              <div className="flex gap-4 justify-center pt-4">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-6 text-lg rounded-xl shadow-lg">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-20 pt-12 border-t border-border/50">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Your Privacy Matters</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Aura provides emotional support and wellness guidance. This AI assistant is designed to complement, 
            not replace, professional mental health care.
            <br />
            <strong className="text-foreground">In crisis?</strong> Call 988 (US Suicide & Crisis Lifeline) or contact your local emergency services immediately.
          </p>
        </div>
      </div>
    </div>
  )
}
