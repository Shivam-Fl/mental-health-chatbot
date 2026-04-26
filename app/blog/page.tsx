import Link from "next/link"
import { BrainCircuit, ArrowLeft, Clock, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Static blog posts — extend by connecting to Supabase later
const POSTS = [
  {
    slug: "understanding-anxiety-disorders",
    title: "Understanding Anxiety Disorders: Types, Causes & Treatment",
    excerpt: "Anxiety affects over 280 million people globally. Learn the difference between GAD, social anxiety, panic disorder, and how evidence-based treatment can help you reclaim your life.",
    author: "Dr. Priya Sharma", role: "Clinical Psychologist",
    category: "Mental Health", readTime: "6 min", date: "Apr 22, 2026",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80",
    featured: true,
  },
  {
    slug: "cognitive-behavioral-therapy-explained",
    title: "Cognitive Behavioural Therapy (CBT): How It Actually Works",
    excerpt: "CBT is one of the most researched therapies in the world. This article breaks down the core principles, what a session looks like, and which conditions it's best suited for.",
    author: "Dr. Arjun Mehta", role: "Psychiatrist",
    category: "Therapy", readTime: "5 min", date: "Apr 18, 2026",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80",
    featured: true,
  },
  {
    slug: "sleep-and-mental-health",
    title: "The Sleep-Mental Health Connection: Why Rest Is Non-Negotiable",
    excerpt: "Poor sleep and mental health problems feed each other in a vicious cycle. Here's what the science says and practical strategies to break it.",
    author: "Dr. Neha Kapoor", role: "Psychologist",
    category: "Wellness", readTime: "4 min", date: "Apr 14, 2026",
    image: "https://images.unsplash.com/photo-1520206183501-b80df61043c2?w=600&q=80",
    featured: false,
  },
  {
    slug: "when-to-see-psychiatrist-vs-psychologist",
    title: "Psychiatrist vs Psychologist: Which One Do You Need?",
    excerpt: "Many people are unsure who to see first. This guide explains the key differences, who prescribes medication, and how to choose based on your specific needs.",
    author: "Dr. Rahul Gupta", role: "Psychiatrist",
    category: "Guidance", readTime: "4 min", date: "Apr 10, 2026",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80",
    featured: false,
  },
  {
    slug: "mindfulness-for-beginners",
    title: "Mindfulness for Beginners: A Practical 10-Day Starter Plan",
    excerpt: "Mindfulness isn't about emptying your mind. It's about changing your relationship with your thoughts. Here's a structured plan anyone can follow.",
    author: "Dr. Sunita Patel", role: "Clinical Psychologist",
    category: "Wellness", readTime: "7 min", date: "Apr 5, 2026",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80",
    featured: false,
  },
  {
    slug: "depression-myths-facts",
    title: "10 Common Myths About Depression — Debunked",
    excerpt: "'Just think positive' and 'it's all in your head' are just two of the dangerous myths that stop people from seeking help. Let's set the record straight.",
    author: "Dr. Anjali Singh", role: "Psychiatrist",
    category: "Mental Health", readTime: "5 min", date: "Mar 28, 2026",
    image: "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=600&q=80",
    featured: false,
  },
]

const CATEGORIES = ["All", "Mental Health", "Therapy", "Wellness", "Guidance"]

const categoryColors: Record<string, string> = {
  "Mental Health": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Therapy: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Wellness: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Guidance: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
}

export default function BlogPage() {
  const featured = POSTS.filter((p) => p.featured)
  const regular = POSTS.filter((p) => !p.featured)

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BrainCircuit className="size-5" />
            </div>
            <span className="font-bold text-base">Psyspace</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {/* Header */}
        <div className="mb-10">
          <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 rounded-xl">
            <Link href="/">
              <ArrowLeft className="size-4 mr-1.5" /> Back to Home
            </Link>
          </Button>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Mental Health Insights</h1>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl">
            Evidence-based articles written by verified psychiatrists and psychologists to help you understand, navigate, and improve your mental health.
          </p>
        </div>

        {/* Featured */}
        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-5">Featured Articles</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {featured.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <Card className="overflow-hidden rounded-2xl h-full hover:shadow-lg transition-shadow border-border/60">
                  <div className="relative h-48 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className={`absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[post.category] ?? ""}`}>
                      {post.category}
                    </span>
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors leading-snug">
                      {post.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="size-3" /> {post.author}</span>
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {post.readTime} read</span>
                      <span>{post.date}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* All Articles */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-5">All Articles</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {regular.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                <Card className="overflow-hidden rounded-2xl h-full hover:shadow-md transition-shadow border-border/60">
                  <div className="relative h-36 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[post.category] ?? ""}`}>
                      {post.category}
                    </span>
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                      <span className="flex items-center gap-1"><Clock className="size-3" /> {post.readTime}</span>
                      <span>{post.date}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-2xl bg-primary/10 border border-primary/20 p-8 text-center">
          <h2 className="text-2xl font-bold">Ready to talk to a professional?</h2>
          <p className="mt-2 text-muted-foreground">Connect with a verified psychiatrist or psychologist on Psyspace.</p>
          <Button asChild className="mt-5 rounded-xl" size="lg">
            <Link href="/auth/signup">Find a Professional</Link>
          </Button>
        </section>
      </div>
    </main>
  )
}
