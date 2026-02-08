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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-therapeutic/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-therapeutic/10 rounded-full">
            <Sparkles className="w-4 h-4 text-therapeutic" />
            <span className="text-sm font-medium text-therapeutic">Your Mental Health Companion</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-therapeutic bg-clip-text text-transparent">
            Welcome to Aura
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A safe, empathetic space for your mental health journey. Chat with our AI companion 
            designed to listen, understand, and support you 24/7.
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-therapeutic hover:bg-therapeutic/90 text-therapeutic-foreground">
                Get Started Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="border-border/50 hover:border-therapeutic/50 transition-colors">
            <CardHeader>
              <MessageCircle className="w-10 h-10 text-therapeutic mb-2" />
              <CardTitle>Empathetic Conversations</CardTitle>
              <CardDescription>
                Engage in natural, judgment-free conversations with our AI companion trained in mental health support
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-therapeutic/50 transition-colors">
            <CardHeader>
              <Brain className="w-10 h-10 text-therapeutic mb-2" />
              <CardTitle>Emotion Detection</CardTitle>
              <CardDescription>
                Advanced AI analyzes your emotional state through text, voice, and facial expressions to provide personalized support
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-therapeutic/50 transition-colors">
            <CardHeader>
              <Shield className="w-10 h-10 text-therapeutic mb-2" />
              <CardTitle>Crisis Support</CardTitle>
              <CardDescription>
                Immediate access to crisis resources and emergency hotlines when you need urgent help
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-therapeutic/50 transition-colors">
            <CardHeader>
              <Lock className="w-10 h-10 text-therapeutic mb-2" />
              <CardTitle>Private & Secure</CardTitle>
              <CardDescription>
                Your conversations are encrypted and confidential. We prioritize your privacy and data security
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-therapeutic/50 transition-colors">
            <CardHeader>
              <Heart className="w-10 h-10 text-therapeutic mb-2" />
              <CardTitle>Multi-Modal Support</CardTitle>
              <CardDescription>
                Choose between text, voice, or video chat based on your comfort level and preferences
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-therapeutic/50 transition-colors">
            <CardHeader>
              <Sparkles className="w-10 h-10 text-therapeutic mb-2" />
              <CardTitle>Insights & Analytics</CardTitle>
              <CardDescription>
                Track your emotional journey with personalized insights and progress visualization
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-3xl mx-auto">
          <Card className="border-therapeutic/30 bg-gradient-to-br from-therapeutic/5 to-therapeutic/10">
            <CardHeader>
              <CardTitle className="text-3xl mb-4">Ready to Start Your Journey?</CardTitle>
              <CardDescription className="text-base mb-6">
                Join thousands of users who have found comfort and support through Aura. 
                Your mental health matters, and we&apos;re here to help.
              </CardDescription>
              <div className="flex gap-4 justify-center">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-therapeutic hover:bg-therapeutic/90 text-therapeutic-foreground">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 pt-8 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Aura is designed to provide emotional support and is not a substitute for professional mental health care.
            <br />
            If you&apos;re in crisis, please call 988 (US) or contact your local emergency services.
          </p>
        </div>
      </div>
    </div>
  )
}
