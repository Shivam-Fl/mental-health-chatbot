import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, BrainCircuit, Clock, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

const POSTS: Record<string, any> = {
  "understanding-anxiety-disorders": {
    title: "Understanding Anxiety Disorders: Types, Causes & Treatment",
    author: "Dr. Priya Sharma", role: "Clinical Psychologist",
    category: "Mental Health", readTime: "6 min", date: "Apr 22, 2026",
    image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1200&q=80",
    content: `
Anxiety is the most common mental health condition worldwide, affecting over 280 million people. Yet it remains widely misunderstood. This article breaks down what anxiety disorders are, how they differ from everyday stress, and what evidence-based treatments can help.

## What is an Anxiety Disorder?

Unlike the normal nervousness you feel before a presentation or a job interview, anxiety disorders involve **persistent, excessive worry** that interferes with daily activities. This fear doesn't go away and can get worse over time.

## Types of Anxiety Disorders

**Generalised Anxiety Disorder (GAD)** involves chronic, exaggerated worry about everyday events — health, money, family, work — even when there is little reason to worry.

**Social Anxiety Disorder** goes beyond shyness. It's an intense fear of social situations where you might be judged, embarrassed, or humiliated. This can prevent people from going to work, school, or even leaving home.

**Panic Disorder** involves recurrent unexpected panic attacks — sudden surges of overwhelming fear that reach a peak within minutes. Physical symptoms like racing heart, chest pain, and shortness of breath are common.

**Specific Phobias** are intense fears of specific objects or situations (heights, spiders, flying) that are out of proportion to the actual danger.

## What Causes Anxiety?

Anxiety disorders are caused by a complex mix of factors:
- **Genetics** — anxiety tends to run in families
- **Brain chemistry** — imbalances in serotonin and dopamine
- **Life events** — trauma, abuse, or major life stressors
- **Medical conditions** — thyroid disorders, heart arrhythmias

## Evidence-Based Treatments

**Cognitive Behavioural Therapy (CBT)** is the gold standard. It helps you identify and change negative thought patterns that fuel anxiety.

**Medication** — SSRIs and SNRIs are first-line medications. Benzodiazepines may be used short-term.

**Exposure Therapy** — gradually and systematically confronting feared situations under guidance from a therapist.

**Lifestyle** — regular exercise, sleep hygiene, and reducing caffeine and alcohol can make a meaningful difference.

## When to Seek Help

If anxiety is interfering with your relationships, work, or quality of life — it's time to speak to a professional. Anxiety disorders are **highly treatable**, and most people see significant improvement with the right support.
    `,
  },
  "cognitive-behavioral-therapy-explained": {
    title: "Cognitive Behavioural Therapy (CBT): How It Actually Works",
    author: "Dr. Arjun Mehta", role: "Psychiatrist",
    category: "Therapy", readTime: "5 min", date: "Apr 18, 2026",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&q=80",
    content: `
Cognitive Behavioural Therapy — or CBT — is one of the most researched and effective forms of psychotherapy in the world. It's been proven to work for depression, anxiety, OCD, PTSD, eating disorders, and more. But what actually happens in a CBT session?

## The Core Idea

CBT is based on the concept that our **thoughts, feelings, and behaviours are all connected**. When we think negatively about a situation, we feel bad — and when we feel bad, we behave in ways that reinforce those negative thoughts.

CBT aims to **break this cycle** by teaching you to identify distorted thoughts and replace them with more balanced, realistic ones.

## What a Session Looks Like

A typical CBT session involves:

1. **Setting an agenda** — deciding what to focus on that session
2. **Reviewing homework** — checking practice exercises from the previous week  
3. **Identifying automatic thoughts** — exploring the thoughts that came up in difficult moments
4. **Challenging those thoughts** — using Socratic questioning to examine evidence for and against
5. **Behavioural experiments** — trying new behaviours to test predictions

## Common Techniques

- **Thought records** — writing down the situation, thought, emotion, and a balanced alternative
- **Behavioural activation** — scheduling activities that improve mood
- **Exposure** — gradually facing feared situations
- **Problem-solving** — breaking down problems into manageable steps

## How Long Does It Take?

Most CBT courses run for 12–20 sessions, though some people see improvement in fewer. It's a **skills-based therapy**, which means you're learning tools you can use long after therapy ends.

## Is CBT Right for You?

CBT works best if you're motivated to work between sessions and willing to be an active participant. It's not for everyone, but for many it's the most effective tool available.
    `,
  },
  "sleep-and-mental-health": {
    title: "The Sleep-Mental Health Connection: Why Rest Is Non-Negotiable",
    author: "Dr. Neha Kapoor", role: "Psychologist",
    category: "Wellness", readTime: "4 min", date: "Apr 14, 2026",
    image: "https://images.unsplash.com/photo-1520206183501-b80df61043c2?w=1200&q=80",
    content: `
Sleep and mental health are deeply intertwined. Poor sleep can trigger or worsen mental health problems, and mental health problems can make it harder to sleep. Understanding this cycle is the first step to breaking it.

## How Sleep Affects the Brain

During sleep, the brain consolidates memories, processes emotions, and clears metabolic waste. When we don't get enough sleep, the prefrontal cortex — responsible for rational thinking and emotional regulation — becomes impaired.

This is why after a bad night's sleep, small problems feel catastrophic. Your emotional brain (the amygdala) becomes hypersensitive.

## The Bidirectional Relationship

**Mental health affects sleep:**
- Depression often causes early waking or hypersomnia
- Anxiety triggers a racing mind at night
- PTSD causes nightmares and hypervigilance

**Sleep affects mental health:**
- Sleep deprivation increases cortisol (the stress hormone)
- Poor sleep increases the risk of depression by 2–3x
- Insomnia is one of the strongest predictors of suicidal ideation

## Practical Strategies

1. **Keep a consistent schedule** — same wake time every day, including weekends
2. **No screens 60 minutes before bed** — blue light suppresses melatonin
3. **Cool, dark, quiet room** — ideal sleep temperature is 18–19°C
4. **Limit caffeine after 2pm** — caffeine has a half-life of ~6 hours
5. **Progressive muscle relaxation** before bed can reduce anxiety

## When to See a Professional

If you've struggled with sleep for more than 3 weeks, speak to a doctor. Cognitive Behavioural Therapy for Insomnia (CBT-I) is more effective than medication for long-term insomnia.
    `,
  },
  "when-to-see-psychiatrist-vs-psychologist": {
    title: "Psychiatrist vs Psychologist: Which One Do You Need?",
    author: "Dr. Rahul Gupta", role: "Psychiatrist",
    category: "Guidance", readTime: "4 min", date: "Apr 10, 2026",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80",
    content: `
One of the most common questions people have when seeking mental health support is: "Who should I see — a psychiatrist or a psychologist?" The answer depends on your specific needs.

## The Key Differences

**Psychiatrists** are medical doctors (MBBS + MD Psychiatry) who specialise in mental health. Because of their medical training, they can **prescribe medication** and also provide therapy.

**Psychologists** have advanced degrees in psychology (M.Phil or PhD) and specialise in **psychological assessment and therapy**. In India, they cannot prescribe medication.

## When to See a Psychiatrist

Consider a psychiatrist if:
- You think medication might be needed (for depression, bipolar disorder, schizophrenia)
- Your symptoms are severe or you're unable to function
- You've tried therapy without improvement
- You have a co-occurring medical condition

## When to See a Psychologist

Consider a psychologist if:
- You want to understand your thought patterns and behaviours
- You're dealing with anxiety, relationship issues, grief, or life transitions
- You want CBT, DBT, or other talk therapies
- Your symptoms are moderate and don't require medication

## Can You See Both?

Absolutely — and for many conditions, **combined treatment** (medication + therapy) is the most effective approach. Many people work with a psychiatrist for medication management and a psychologist for regular therapy sessions.

## The Bottom Line

When in doubt, start with a psychologist. They can assess your needs and refer you to a psychiatrist if medication is appropriate. On Psyspace, all professionals are verified and can guide you on the right path.
    `,
  },
  "mindfulness-for-beginners": {
    title: "Mindfulness for Beginners: A Practical 10-Day Starter Plan",
    author: "Dr. Sunita Patel", role: "Clinical Psychologist",
    category: "Wellness", readTime: "7 min", date: "Apr 5, 2026",
    image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&q=80",
    content: `
Mindfulness is everywhere — and for good reason. Hundreds of studies show it reduces anxiety, depression, and stress. But many beginners give up because they misunderstand what it is. Let's fix that.

## What Mindfulness Actually Is

Mindfulness is **paying attention to the present moment, without judgement**. That's it. You're not trying to empty your mind. You're not trying to relax (though that may happen). You're just observing what's here, right now.

When your mind wanders (and it will — constantly), that's not failure. Noticing the wandering and gently returning your attention IS the practice.

## Your 10-Day Starter Plan

**Days 1–3: Breath Awareness (5 minutes)**
Sit comfortably. Focus on the physical sensation of breathing — air entering your nostrils, your chest rising, your belly expanding. When you get distracted, return. That's the whole practice.

**Days 4–5: Body Scan (10 minutes)**
Lie down. Slowly move your attention from your feet to your head, noticing sensations without trying to change them.

**Days 6–7: Mindful Walking (10 minutes)**
Walk slowly. Feel each step — the heel hitting the ground, the transfer of weight, the toes pushing off. Do this without your phone.

**Days 8–9: Mindful Eating (one meal)**
Eat one meal without screens. Notice colours, smells, textures, and flavours. Put the fork down between bites.

**Day 10: Review**
Reflect: Which practice felt most natural? That's likely your anchor going forward.

## Tips for Consistency

- Same time every day (morning works best for most people)
- Use an app like Insight Timer for guided sessions
- Don't judge the quality of your session — 5 mediocre minutes beats 0 perfect minutes

## The Science

Regular mindfulness practice literally changes the brain. Studies show increased grey matter in the prefrontal cortex (rational thinking) and decreased amygdala reactivity (emotional response) after just 8 weeks of practice.
    `,
  },
  "depression-myths-facts": {
    title: "10 Common Myths About Depression — Debunked",
    author: "Dr. Anjali Singh", role: "Psychiatrist",
    category: "Mental Health", readTime: "5 min", date: "Mar 28, 2026",
    image: "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=1200&q=80",
    content: `
Myths about depression are everywhere — and they stop millions of people from seeking help they desperately need. Let's debunk the most harmful ones.

**Myth 1: "It's just sadness — you can snap out of it"**
Depression is a medical condition involving changes in brain chemistry. You can't "snap out of it" any more than you can snap out of diabetes.

**Myth 2: "Depression means you're weak"**
Depression affects CEOs, athletes, and high achievers. Seeking help is a sign of strength, not weakness.

**Myth 3: "You have nothing to be depressed about"**
Depression doesn't require a reason. It can occur even when life appears fine from the outside. Biology, not circumstances, drives it.

**Myth 4: "Antidepressants are addictive"**
SSRIs (the most common antidepressants) are not addictive. Some people experience discontinuation symptoms when stopping, which is why doses are tapered gradually.

**Myth 5: "Therapy is just talking — it doesn't do anything"**
Therapy changes the brain. CBT, in particular, has been shown in neuroimaging studies to alter brain activity in ways similar to medication.

**Myth 6: "Depression is a permanent condition"**
Most episodes of depression are time-limited, especially with treatment. Many people fully recover and go on to live fulfilling lives.

**Myth 7: "Exercise doesn't help"**
Wrong. Exercise is one of the most evidence-backed interventions for mild to moderate depression, comparable to antidepressants in some studies.

**Myth 8: "Children and teenagers can't have depression"**
Depression can occur at any age, including in childhood. Untreated childhood depression increases the risk of recurring episodes in adulthood.

**Myth 9: "You'd know if someone close to you was depressed"**
Many people hide depression well. The person who seems "fine" may be struggling silently. Check in with people you care about.

**Myth 10: "Seeking help means you'll be on medication forever"**
Treatment plans are individualised. Many people use therapy alone. Those who take medication often do so for a defined period, then successfully taper off.

## The Bottom Line

If you or someone you know is struggling, please reach out. Psyspace connects you with verified professionals who can help.
    `,
  },
}

function renderMarkdown(content: string) {
  const lines = content.trim().split("\n")
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(<h2 key={key++} className="text-xl font-bold mt-8 mb-3">{line.slice(3)}</h2>)
    } else if (line.startsWith("**") && line.endsWith("**") && !line.slice(2, -2).includes("**")) {
      elements.push(<p key={key++} className="font-semibold mt-3">{line.slice(2, -2)}</p>)
    } else if (line.startsWith("- ")) {
      elements.push(<li key={key++} className="ml-5 list-disc text-muted-foreground">{line.slice(2)}</li>)
    } else if (line.match(/^\d+\. /)) {
      elements.push(<li key={key++} className="ml-5 list-decimal text-muted-foreground">{line.replace(/^\d+\. /, "")}</li>)
    } else if (line.trim() === "") {
      elements.push(<div key={key++} className="h-2" />)
    } else {
      // Handle inline **bold**
      const parts = line.split(/\*\*(.*?)\*\*/)
      elements.push(
        <p key={key++} className="text-muted-foreground leading-relaxed">
          {parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{part}</strong> : part)}
        </p>
      )
    }
  }
  return elements
}

export function generateStaticParams() {
  return Object.keys(POSTS).map((slug) => ({ slug }))
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = POSTS[slug]
  if (!post) notFound()

  const categoryColors: Record<string, string> = {
    "Mental Health": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Therapy: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    Wellness: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    Guidance: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BrainCircuit className="size-5" />
            </div>
            <span className="font-bold text-base">Psyspace</span>
          </Link>
          <Button asChild size="sm">
            <Link href="/auth/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Image */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 rounded-xl">
          <Link href="/blog"><ArrowLeft className="size-4 mr-1.5" /> All Articles</Link>
        </Button>

        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-4 ${categoryColors[post.category] ?? ""}`}>
          {post.category}
        </span>
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6 mb-8">
          <span className="flex items-center gap-1.5"><User className="size-4" /> {post.author} · {post.role}</span>
          <span className="flex items-center gap-1.5"><Clock className="size-4" /> {post.readTime} read</span>
          <span>{post.date}</span>
        </div>

        <div className="prose-container space-y-2">
          {renderMarkdown(post.content)}
        </div>

        <div className="mt-12 rounded-2xl bg-primary/10 border border-primary/20 p-6 text-center">
          <h2 className="text-xl font-bold">Need personalised support?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Connect with verified mental health professionals on Psyspace.</p>
          <Button asChild className="mt-4 rounded-xl">
            <Link href="/auth/signup">Book a Session</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
