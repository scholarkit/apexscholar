/**
 * Course Data Model
 * Add lessons by filling in the `content` field (supports markdown).
 * Leave content as an empty string for "coming soon" stubs.
 */

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string; // e.g. "12 min"
  content: string; // Markdown body — fill in per-lesson later
}

export interface Course {
  id: string;
  title: string;
  description: string;
  coverEmoji: string;
  accentColor: string; // Tailwind color class fragment e.g. "indigo"
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  lessons: Lesson[];
}

export const COURSES: Course[] = [
  {
    id: 'research-fundamentals',
    title: 'Research Fundamentals',
    description:
      'A structured, end-to-end journey through the research process — from choosing a topic to publishing your findings.',
    coverEmoji: 'microscope',
    accentColor: 'indigo',
    level: 'Beginner',
    tags: ['Introduction', 'Overview'],
    lessons: [
      {
        id: 'what-is-research',
        title: 'What is Research?',
        description: 'Understand the definition, purpose, and different types of research.',
        duration: '8 min',
        content: `## What is Research?

Research is a **systematic process** of investigating a question or problem in order to discover new knowledge or improve existing knowledge.

> **In simpler words:**
> Research = asking a question that is not fully answered yet and using a structured method to find a reliable answer.

---

## Key Elements of Research

For something to be called research, it must have these characteristics:

### 1. A Clear Question or Problem
Something that is **not already fully solved** — the question must be open and meaningful enough to investigate.

### 2. Systematic Investigation
You follow a **structured method** — experiments, analysis, surveys, algorithms, or other rigorous approaches.

### 3. Evidence-Based Results
Conclusions must be **supported by data**, experiments, or logical analysis — not guesswork or opinion.

### 4. New Knowledge or Improvement
The outcome should **add something new** or improve existing methods. Simply repeating what others have done is not research.

### 5. Reproducibility
Other researchers should be able to **repeat your process** and get similar results. This is what makes science trustworthy.

---

## A Simple Example

**Question:** Can machine learning improve railway document information extraction?

**Research process:**

1. Study existing methods
2. Propose a new approach
3. Test it on real data
4. Measure performance
5. Report findings

If the results provide a **new insight or measurable improvement**, that work qualifies as research.

---

## One-Line Definition

> **Research is the structured pursuit of new knowledge through systematic investigation and evidence.**
`,
      },
      {
        id: 'choosing-a-topic',
        title: 'Aspects of Research',
        description:
          'Research is a complete lifecycle — explore its 9 core aspects from problem to publication.',
        duration: '12 min',
        content: `## Aspects of Research

Research is not just "doing experiments" or "reading papers" — it is a **complete lifecycle of activities**.

The easiest way to understand it is to see research as **9 core aspects/stages**.

---

### 1. Problem Identification

This is the **starting point** of every research journey.

**Goal:** Find a meaningful problem that is not fully solved.

**Activities:**
- Observing real-world issues
- Reading existing literature
- Identifying limitations in current work
- Defining a clear research question

**Output:** Problem statement + Research objectives

> **Example:** *"Current railway gazette extraction systems fail when documents contain noisy OCR text."*

---

### 2. Literature Review

Understanding what has **already been done**.

**Activities:**
- Reading research papers
- Studying methods used by other researchers
- Identifying research gaps
- Understanding datasets, benchmarks, and metrics

**Common sources:** Google Scholar · arXiv · Conferences · Journals

**Output:** Literature review section + knowledge of existing approaches

---

### 3. Research Design / Methodology

Designing **how** you will solve the problem.

**Activities:**
- Selecting algorithms or theories
- Designing experiments
- Choosing datasets
- Defining evaluation metrics

**Output:** Methodology section

> **Example:** *Hybrid pipeline combining RegEx rules with BERT classification.*

---

### 4. Data Collection

Most research requires **data** to work with.

**Activities:**
- Creating or finding datasets
- Collecting documents or samples
- Scraping data from sources
- Annotation / labeling

**Output:** Dataset ready for experiments

---

### 5. Implementation / Experimentation

**Actually building and testing** the solution.

**Activities:**
- Writing code
- Training models
- Running experiments
- Trying different configurations

**Output:** Experimental results

---

### 6. Evaluation

Testing whether the solution **actually works**.

**Activities:**
- Measuring performance
- Comparing with baseline methods
- Statistical analysis

**Common metrics:** Accuracy · Precision · Recall · F1 Score

**Output:** Performance tables and graphs

---

### 7. Analysis & Discussion

**Interpreting** the results.

**Activities:**
- Explaining why results happened
- Discussing strengths and weaknesses
- Error analysis

**Output:** Insights and understanding

---

### 8. Publication

**Communicating** the research to the world.

**Activities:**
- Writing a research paper
- Submitting to conferences or journals
- Going through peer review

**Output:** Published paper

---

### 9. Future Work

Every research has **limitations** — and that's perfectly fine.

**Activities:**
- Identifying what could be improved
- Suggesting next research directions

**Output:** Future work section

---

## The Research Lifecycle at a Glance

| Stage | Focus |
|---|---|
| 🔍 Problem | What needs solving? |
| 📚 Literature | What exists already? |
| 🧪 Method | How will you solve it? |
| 📦 Data | What data do you need? |
| ⚙️ Experiment | Build and test it |
| 📊 Evaluation | Does it work? |
| 💬 Analysis | Why does it work (or not)? |
| 📝 Publication | Share it with the world |
| 🔮 Future Work | What comes next? |

> **Remember:** Problem → Literature → Method → Data → Experiment → Evaluation → Analysis → Publication → Future Work
`,
      },
    ],
  },
];

export const COURSES_2: Course[] = [
  ...COURSES,
  {
    id: 'problem-identification',
    title: 'Problem Identification in Research',
    description:
      'Learn to identify, evaluate, and formulate research problems — the most critical skill every researcher must master before starting any project.',
    coverEmoji: 'search',
    accentColor: 'violet',
    level: 'Intermediate',
    tags: ['Problem Formulation', 'Research Gaps', 'Critical Thinking'],
    lessons: [
      // ── Module 1: Foundations ──────────────────────────────────────────
      {
        id: 'what-is-a-research-problem',
        title: 'What is a Research Problem?',
        description:
          'Understand the meaning and role of a research problem — where every project begins.',
        duration: '8 min',
        content: `## What is a Research Problem?

A **research problem** is not simply a topic you are interested in — it is a clearly defined question arising from a **gap in existing knowledge**.

> **Key idea:** Research begins not with answers, but with a problem that does not yet have a satisfying answer.

---

## Topic vs. Problem

These are not the same thing. A topic is broad; a problem is precise and actionable.

| | Example |
|---|---|
| **Topic** | Climate change |
| **Research Problem** | How accurately can satellite data predict regional drought patterns? |

The topic gives a direction. The problem gives a *reason to do research*.

---

## Why Research Begins With a Problem

Without a well-defined problem:
- You don't know what to measure
- You can't decide what methods to use
- You can't evaluate whether your work is successful
- Reviewers and supervisors will reject your proposal

A sharp problem statement is the **foundation** of every strong research project.

---

## Definition

> **A research problem is a clearly defined question or challenge arising from a gap in existing knowledge, whose investigation will produce new and useful insight.**

---

## Exercise

Convert these broad topics into research problems:

1. **Artificial Intelligence**
2. **Online Education**
3. **Renewable Energy**

*Hint: Ask yourself — what specifically is unknown, insufficient, or broken in each area?*
`,
      },
      {
        id: 'components-of-a-research-problem',
        title: 'Components of a Research Problem',
        description: 'Learn the structure that every well-formed research problem follows.',
        duration: '10 min',
        content: `## Components of a Research Problem

A well-formed research problem is not a single sentence — it is built from **three connected components**.

---

## The Structure

\`\`\`
Context → Gap → Question
\`\`\`

| Component | What it answers |
|---|---|
| **Context** | What area is this research in? |
| **Gap / Limitation** | What is missing or broken? |
| **Research Question** | What exactly needs to be answered? |

---

## Breaking It Down

### Context
The background that makes the problem understandable.

*It tells the reader: "Here is the world we are working in."*

### Gap or Limitation
Something that is **missing**, **understudied**, or **ineffective** in the current state of knowledge.

*It tells the reader: "Here is what we don't know yet."*

### Research Question
A precise, answerable question that your research will address.

*It tells the reader: "Here is exactly what we are going to investigate."*

---

## Full Example

**Context:**
Social media platforms use recommendation algorithms to show personalised content.

**Gap:**
These systems sometimes amplify misinformation by prioritising engagement over accuracy.

**Research Question:**
How can recommendation algorithms reduce misinformation spread while maintaining user engagement?

---

## Why This Structure Matters

When you have all three components clearly defined, you can:
- Write a strong problem statement
- Justify your research to reviewers
- Stay focused throughout the project

---

## Exercise

Read any research paper abstract and try to extract:
1. The **context**
2. The **gap** the authors identified
3. The **question** they set out to answer
`,
      },

      // ── Module 2: Discovering Research Problems ────────────────────────
      {
        id: 'sources-of-research-problems',
        title: 'Sources of Research Problems',
        description: 'Discover the four major places where research problems originate.',
        duration: '10 min',
        content: `## Sources of Research Problems

Where do research problems come from? Researchers don't invent them from thin air — there are **four reliable sources** you can tap into.

---

## The Four Major Sources

### 1. Existing Literature
Papers you read often reveal gaps, contradictions, or limitations that open the door to new research.

*Look for phrases like: "our method struggles with…", "future work should explore…", "this dataset lacks…"*

### 2. Real-World Issues
Practical problems from industry, healthcare, government, or daily life that need better solutions.

*Example: Hospital staff manually extracting data from patient forms → research problem in document digitisation.*

### 3. Technological Developments
New tools, platforms, or capabilities create new possibilities — and new problems.

*New technology → Large Language Models*
*Possible problem → How can language models maintain factual accuracy when generating long responses?*

### 4. Contradictory Research Findings
When two credible papers reach opposite conclusions, that tension itself is a research problem.

*Example: Study A says social media improves academic performance; Study B says it harms it. → What conditions explain the difference?*

---

## Practical Tip

When you start a new research area, read **10–20 papers** and make a list of:
- Things the authors admit their method cannot do
- Questions they say are left open
- Results that seem inconsistent across papers

This list is your raw material for identifying research problems.

---

## Exercise

Pick any field you are interested in (AI, education, healthcare, sustainability…).

List **three possible research problems** — one from each of these sources:
1. A gap you spotted in a paper
2. A real-world issue in that field
3. A new technology that creates new challenges
`,
      },
      {
        id: 'finding-research-gaps',
        title: 'Finding Research Gaps in Literature',
        description:
          'Learn how researchers extract problems from existing papers using systematic gap analysis.',
        duration: '12 min',
        content: `## Finding Research Gaps in Literature

The most reliable source of research problems is **existing literature**. But reading papers is not enough — you need to know *where to look* for gaps.

---

## What is a Research Gap?

A research gap is something that:

- **Has not been studied** at all
- **Has been insufficiently studied** (small datasets, limited conditions, narrow scope)
- **Has conflicting results** across different studies

---

## Where Gaps Appear in Papers

Researchers deliberately signal gaps in specific sections. Train yourself to read these carefully:

| Section | What to look for |
|---|---|
| **Introduction** | Problems the paper mentions but does not solve |
| **Discussion** | Interpretation limitations and unexpected findings |
| **Limitations** | Explicit admissions of what the method cannot handle |
| **Future Work** | The authors' own suggestions for follow-up research |

---

## Reading for Gaps — A Practical Method

When you read a paper, ask yourself:

1. What assumptions does this work make that might not hold in other settings?
2. What dataset did they use, and does it represent the real world?
3. What did the method fail on?
4. What did the authors say they couldn't do in this paper?

---

## Example

**What the paper says:**
> *"The proposed method performs poorly on small datasets."*

**Potential research problem:**
> How can model performance be improved when only small datasets are available?

---

## Gap Types — Quick Reference

| Gap Type | Example |
|---|---|
| **Scope gap** | Method works for English only |
| **Dataset gap** | No benchmark exists for the domain |
| **Performance gap** | Accuracy drops in real-world conditions |
| **Approach gap** | Problem solved with one method family, alternatives unexplored |
| **Replication gap** | Findings not verified on different data |

---

## Exercise

Find a short paper (2–4 pages) in any area that interests you.

Read the **Limitations** and **Future Work** sections.

List every research gap you can identify and rewrite each one as a research problem statement.
`,
      },

      // ── Module 3: Evaluating Research Problems ─────────────────────────
      {
        id: 'characteristics-good-problem',
        title: 'Characteristics of a Good Research Problem',
        description:
          'Learn the six criteria that determine whether a problem is worth researching.',
        duration: '10 min',
        content: `## Characteristics of a Good Research Problem

Not every gap is worth researching. Before committing to a problem, you need to evaluate it rigorously.

---

## The Six Criteria

| Criterion | What it means |
|---|---|
| **Clear** | The problem can be stated in one or two precise sentences |
| **Specific** | It is narrow enough to be investigated in a defined scope |
| **Researchable** | It can be investigated with available methods and data |
| **Novel** | It has not already been definitively solved |
| **Significant** | Solving it would genuinely benefit the field or society |
| **Feasible** | You have the time, resources, and skills to study it |

---

## Weak vs. Strong Problems

**Weak:**
> Improve healthcare systems.

*Why it fails: Too broad, not specific, not measurable.*

**Strong:**
> How can machine learning predict hospital readmission risk within 30 days using electronic health records?

*Why it works: Clear scope, specific outcome, measurable, feasible with existing data.*

---

## Applying the Criteria — A Quick Checklist

Before finalising your research problem, ask:

- [ ] Can I state the problem in two sentences or fewer?
- [ ] Is the scope narrow enough to complete in my allotted time?
- [ ] Does data or a method exist to investigate this?
- [ ] Has this exact question been answered before?
- [ ] Would solving this matter to anyone outside my project?
- [ ] Can I realistically do this with my current skills and resources?

If you answer **No** to any of these, revise the problem before proceeding.

---

## Exercise

Evaluate the following research problems against the six criteria above and give each a score (0–6):

1. *Study the impact of technology.*
2. *How does background noise affect the accuracy of automatic speech recognition in customer service calls?*
3. *Improve artificial intelligence.*
4. *Can transformer-based models outperform CNN architectures in histopathology image classification?*
`,
      },
      {
        id: 'narrowing-broad-topic',
        title: 'Narrowing a Broad Topic',
        description:
          'Learn to transform vague, broad topics into precise and researchable problems step by step.',
        duration: '10 min',
        content: `## Narrowing a Broad Topic

One of the most common mistakes new researchers make is starting with a topic that is **far too broad** to research meaningfully. Narrowing is a skill — and it follows a clear process.

---

## The Narrowing Process

\`\`\`
Broad Topic
     ↓
Focused Area
     ↓
Specific Issue
     ↓
Research Problem
\`\`\`

Each step eliminates ambiguity and adds precision.

---

## Worked Example

| Stage | Content |
|---|---|
| **Broad Topic** | Artificial Intelligence |
| **Focused Area** | AI in medical diagnosis |
| **Specific Issue** | Detecting early-stage diseases |
| **Research Problem** | Can deep learning models detect early-stage lung cancer from CT scans more accurately than traditional methods? |

---

## Why Narrowing Matters

A broad topic cannot be:
- Fully reviewed (too many papers)
- Properly measured (no specific metric)
- Realistically completed (too much scope)

A narrowed problem can be studied, measured, and completed — which is what research requires.

---

## Common Narrowing Levers

Use these questions to narrow any topic:

| Lever | Example question |
|---|---|
| **Population** | Which specific group are you studying? |
| **Location / Domain** | In which setting or field? |
| **Time period** | Over what timeframe? |
| **Condition** | Under what specific circumstances? |
| **Intervention / Method** | Using what specific approach? |
| **Outcome** | What exactly are you measuring? |

---

## Exercise

Take one of these broad topics and narrow it to a specific research problem using the four-stage process:

1. **Social Media**
2. **Climate Change**
3. **Machine Learning**
4. **Education**

Document each narrowing step — don't skip straight to the final problem.
`,
      },

      // ── Module 4: Formulating the Problem ─────────────────────────────
      {
        id: 'writing-problem-statement',
        title: 'Writing a Problem Statement',
        description:
          'Learn how to clearly articulate your research problem in a structured, compelling statement.',
        duration: '12 min',
        content: `## Writing a Problem Statement

A **problem statement** is the formal written form of your research problem. It is usually the first substantive paragraph of a research paper or proposal — and it sets the tone for everything that follows.

---

## Structure of a Problem Statement

A strong problem statement covers four things in order:

| Part | Purpose |
|---|---|
| **Background / Context** | Set the scene — what field, what current situation? |
| **Statement of the Gap** | What is missing, broken, or unknown? |
| **Importance** | Why does solving this matter? |
| **Research Objective** | What will your research specifically do? |

---

## Full Example

> Image recognition systems have achieved high accuracy in controlled lab environments. However, their performance drops significantly under low-light conditions, with error rates increasing by up to 40% in darkness. Improving recognition accuracy in such environments is essential for safety-critical applications such as autonomous vehicles and security surveillance. This research aims to develop and evaluate methods that improve image recognition reliability in low-light conditions.

Breaking it down:
- **Context:** Image recognition performance in controlled settings
- **Gap:** Performance collapses in low-light conditions
- **Importance:** Autonomous vehicles and security systems depend on this
- **Objective:** Develop methods to fix the low-light problem

---

## Writing Tips

- Write in **present tense** for context and gap ("current systems fail to…")
- Write in **future or aim tense** for the objective ("this research will…")
- Keep it to **3–5 sentences** — concise and direct
- Avoid jargon that hasn't been introduced yet
- Every sentence should add new information

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Starting with the objective before the gap | Establish context and gap first |
| Being too vague about the gap | Use specific evidence ("accuracy drops by X%") |
| Forgetting to state why it matters | Add the significance explicitly |
| Making the objective too broad | One clear, achievable objective only |

---

## Exercise

Write a short problem statement (3–5 sentences) for this scenario:

> *Medical imaging systems can detect tumours in MRI scans but require expert radiologists for review. There is a shortage of radiologists in rural hospitals, causing diagnostic delays. You are researching an automated system to assist.*
`,
      },

      // ── Module 5: Advanced Skills ──────────────────────────────────────
      {
        id: 'avoiding-common-mistakes',
        title: 'Avoiding Common Mistakes',
        description:
          'Understand the errors beginners most often make when choosing and framing research problems.',
        duration: '8 min',
        content: `## Avoiding Common Mistakes

Most early-stage researchers make the same set of mistakes when identifying research problems. Knowing what to avoid will save you weeks of wasted effort.

---

## The Five Common Mistakes

### 1. Choosing a Problem That is Too Broad
**Bad:** Study the effects of social media.
**Better:** How does daily social media usage (>3 hours) affect sleep quality among university students aged 18–25?

*A broad problem cannot be studied — it can only be toured.*

---

### 2. Choosing a Problem Already Solved
Before committing to a problem, search Google Scholar for related work. If the question has been definitively answered with strong evidence, choose a different angle or extension.

*Not knowing the existing literature is not an excuse — it is a gap in your preparation.*

---

### 3. Choosing Problems Without Measurable Outcomes
**Bad:** Understand how people use apps.
**Better:** How does notification frequency affect daily active usage duration in mobile productivity apps?

*Every research problem needs a metric. If you cannot measure it, you cannot research it.*

---

### 4. Choosing Problems Without Available Data
Even the best research problem fails if the data does not exist or cannot be collected.

Ask before you commit:
- Does this data exist?
- Can I access it?
- Do I have the tools to process it?

---

### 5. Choosing Problems That Are Not Significant
Research has a cost — your time, effort, and often funding. The problem must be worth that cost.

Ask: **"If I solve this, who benefits and how?"**

If the answer is "almost nobody" or "the benefit is trivial," reconsider the problem.

---

## Quick Self-Check Table

| Question | If No → |
|---|---|
| Is the problem specific enough to study in your timeframe? | Narrow it further |
| Has the question been answered already? | Find a different angle or extension |
| Can success be measured? | Reframe with a measurable outcome |
| Does the necessary data exist and can you access it? | Change the problem or find a dataset |
| Does solving this matter to anyone? | Reconsider the significance |
`,
      },
      {
        id: 'problem-to-research-question',
        title: 'From Problem to Research Question',
        description:
          'Learn how to translate a defined problem into clear, focused research questions that guide your study.',
        duration: '10 min',
        content: `## From Problem to Research Question

A research problem describes **what is wrong or unknown**. A research question translates that into a **specific, answerable question** that your study will investigate.

---

## Why Research Questions Matter

Research questions:
- Guide your methodology — they tell you what to measure
- Define the scope of your literature review
- Provide the structure for your results section
- Give reviewers something concrete to evaluate

---

## Types of Research Questions

| Type | Focus | Example |
|---|---|---|
| **Descriptive** | What is the current state? | How do universities currently use AI in admissions? |
| **Comparative** | Which is better? | Does Method A outperform Method B on Dataset X? |
| **Causal** | What causes what? | Does sleep deprivation cause lower exam performance? |
| **Exploratory** | What factors exist? | What factors influence open-source contribution rates? |

---

## Problem → Research Questions — Worked Example

**Problem:**
Speech recognition systems struggle with speakers who have heavy accents, leading to high error rates and poor user experience.

**Research Questions:**
1. How does accent variation affect word error rate in current speech recognition systems?
2. Can accent-adaptive training data reduce word error rate by more than 15%?
3. Which accent groups experience the largest performance gap in existing systems?

---

## Rules for Good Research Questions

- **One idea per question** — don't combine two questions with "and"
- **Answerable** — can be investigated with data and methods
- **Specific** — includes the population, setting, or condition
- **Open-ended** — not yes/no unless you have a specific hypothesis
- **Aligned** — each question maps directly to your problem statement

---

## Exercise

For each problem below, write **2–3 research questions**:

1. *Machine translation systems perform poorly on low-resource languages with limited training data.*
2. *Student engagement drops significantly in online courses compared to face-to-face learning.*
`,
      },

      // ── Final Lesson ───────────────────────────────────────────────────
      {
        id: 'problem-identification-workflow',
        title: 'The Research Problem Identification Workflow',
        description:
          'A practical, step-by-step workflow that ties together everything in this course.',
        duration: '15 min',
        content: `## The Research Problem Identification Workflow

This is the complete, practical workflow used by researchers to go from a general interest to a well-formed research problem — ready to become a proposal or a paper.

---

## The 6-Step Workflow

\`\`\`
1. Choose a field of interest
        ↓
2. Read existing literature
        ↓
3. Identify limitations and gaps
        ↓
4. Evaluate the significance of the gap
        ↓
5. Formulate a research problem
        ↓
6. Convert it into research questions
\`\`\`

---

## Step-by-Step Guide

### Step 1 — Choose a Field of Interest
Pick a broad area that aligns with your background, curiosity, or career goals.

*Example: Natural Language Processing (NLP)*

---

### Step 2 — Read Existing Literature
Read **10–20 recent papers** (last 3–5 years) from top venues in the field.

Focus on:
- What problems are being studied right now?
- What methods are state-of-the-art?
- What performance benchmarks exist?

---

### Step 3 — Identify Limitations and Gaps
For every paper, make notes on:
- What did the authors say their method cannot do?
- What did they suggest as future work?
- What assumptions did they make that might not hold?

---

### Step 4 — Evaluate the Significance of the Gap
Apply the six criteria: **Clear, Specific, Researchable, Novel, Significant, Feasible**

Discard gaps that are trivial, already solved, or not practically achievable.

---

### Step 5 — Formulate a Research Problem
Use the **Context → Gap → Question** structure.

Write a 3–5 sentence problem statement covering:
- Background
- Gap
- Importance
- Objective

---

### Step 6 — Convert to Research Questions
Break the problem into **2–4 specific, answerable research questions** that will each be addressed by your methodology.

---

## Course Summary

After completing this course, you can:

| Skill | ✓ |
|---|---|
| Explain what a research problem is | ✅ |
| Distinguish topic, gap, question, and problem | ✅ |
| Find research gaps in academic literature | ✅ |
| Evaluate whether a problem is worth researching | ✅ |
| Write a structured problem statement | ✅ |
| Formulate precise research questions | ✅ |

---

## Final Exercise

Read the literature summary below and complete all three tasks:

> *Several studies have proposed machine learning models to detect fake news in English social media posts. These models achieve high accuracy (85–92%) on English datasets. However, multilingual fake news detection remains understudied, and existing models degrade significantly when applied to non-English content. Cross-lingual transfer learning has been explored in other NLP tasks but rarely applied to misinformation detection.*

**Tasks:**
1. Identify **at least two research gaps**
2. Propose a **research problem** using the Context → Gap → Question structure
3. Write a **problem statement** (3–5 sentences)

---

> **You are now equipped to begin any research project with a solid, defensible, and meaningful problem. Good luck.**
`,
      },
    ],
  },
  {
    id: 'literature-review',
    title: 'Literature Review in Research',
    description:
      'Learn to locate, read, analyse, and synthesize academic literature — turning a sea of papers into a clear, compelling literature review.',
    coverEmoji: 'book-copy',
    accentColor: 'emerald',
    level: 'Intermediate',
    tags: ['Literature Review', 'Academic Reading', 'Research Gaps'],
    lessons: [
      // ── Module 1: Foundations ─────────────────────────────────────────
      {
        id: 'what-is-a-literature-review',
        title: 'What is a Literature Review?',
        description:
          'Understand what a literature review is and why it is an essential part of every research project.',
        duration: '8 min',
        content: `## What is a Literature Review?

A **literature review** is a systematic examination and synthesis of existing research related to a specific research problem.

It is not a simple list of summaries — it is an **analytical narrative** that shows you understand the current state of your field.

---

## Why Every Researcher Needs One

| Purpose | What It Does for Your Research |
|---|---|
| **Understand current knowledge** | Shows you what is already known |
| **Identify research gaps** | Reveals what still needs to be solved |
| **Avoid duplication** | Prevents you from repeating solved work |
| **Build theoretical background** | Grounds your work in established ideas |
| **Justify your problem** | Proves your research question is necessary |

---

## What It Is Not

- ❌ A list of paper summaries ("Smith (2020) did X. Lee (2021) did Y.")
- ❌ A random collection of vaguely related papers
- ❌ A copy of the abstract of each paper you read

---

## A Concrete Example

**Research problem:** Improving speech recognition for accented speech.

A literature review on this topic would analyse:
- Existing speech recognition models and their accuracy benchmarks
- Techniques researchers have tried for handling accent variation
- Datasets used and their limitations
- Where current approaches consistently fail

The review synthesises all of this to show *why* your proposed research is needed.

---

## Key Takeaway

> A literature review is the evidence that you have done your homework — and that there is genuinely something left to do.
`,
      },
      {
        id: 'types-of-literature-reviews',
        title: 'Types of Literature Reviews',
        description: 'Understand the four main types of literature reviews and when each is used.',
        duration: '8 min',
        content: `## Types of Literature Reviews

Not all literature reviews are built the same way. The type you use depends on your field, your research question, and the depth of analysis required.

---

## 1. Narrative Review

A **qualitative summary** of existing studies, written in a discursive, essay-like style.

- **Used for:** Getting a broad overview of a topic
- **Strength:** Flexible and accessible
- **Limitation:** Can be subjective; difficult to reproduce

*Common in: humanities, social sciences, introductory sections of papers*

---

## 2. Systematic Review

A **structured, reproducible review** using predefined search criteria and inclusion/exclusion rules.

- **Used for:** Evidence-based research questions requiring high rigour
- **Strength:** Transparent, replicable, comprehensive
- **Limitation:** Very time-consuming; requires strict protocol

*Common in: medicine, clinical research, public health*

---

## 3. Meta-Analysis

A **statistical combination** of results from multiple individual studies to compute an overall effect.

- **Used for:** Measuring aggregate evidence across many studies
- **Strength:** Produces quantitative conclusions with higher statistical power
- **Limitation:** Only possible when studies are sufficiently similar

*Common in: psychology, medicine, economics*

---

## 4. Scoping Review

Explores the **breadth of research** in a field — maps what has been done without deep quality appraisal.

- **Used for:** New or rapidly evolving fields where the landscape is unclear
- **Strength:** Covers wide territory quickly
- **Limitation:** Less depth than systematic reviews

*Common in: emerging tech areas, interdisciplinary fields*

---

## Choosing the Right Type

| You want to… | Use |
|---|---|
| Get a general overview | Narrative Review |
| Answer a clinical/evidence question rigorously | Systematic Review |
| Combine statistics across studies | Meta-Analysis |
| Map an emerging research landscape | Scoping Review |

For most academic research papers, a **narrative or structured narrative review** is used in the Related Work or Literature Review section.
`,
      },

      // ── Module 2: Finding Literature ──────────────────────────────────
      {
        id: 'sources-of-academic-literature',
        title: 'Sources of Academic Literature',
        description:
          'Learn where researchers find peer-reviewed academic work and how to access it.',
        duration: '8 min',
        content: `## Sources of Academic Literature

Knowing where to look is the first step. Researchers use a combination of search engines, databases, and repositories to find relevant work.

---

## Primary Search Platforms

| Platform | Best For |
|---|---|
| **Google Scholar** | Broadest coverage; free; good for starting a search |
| **arXiv** | Preprints in CS, physics, maths — often the first place new work appears |
| **Semantic Scholar** | AI-powered; finds related papers and citation context |
| **OpenAlex** | Free, open metadata; good for systematic searches |

---

## Other Important Sources

- **Academic Journals** — peer-reviewed publications in specific fields (e.g. *Nature*, *IEEE Transactions*, *ACL Anthology*)
- **Conference Proceedings** — particularly important in computer science (NeurIPS, CVPR, ACL, EMNLP, ICLR)
- **Theses and Dissertations** — often contain detailed literature reviews and novel research
- **Technical Reports** — industry or university reports not published in journals

---

## Evaluating Source Quality

Not all sources are equal. Prefer:

| ✅ Trustworthy | ❌ Avoid |
|---|---|
| Peer-reviewed journals | Random blog posts |
| Top-tier conference papers | Non-reviewed preprints without citation |
| Published dissertations | Wikipedia as a primary source |
| Established research groups | Predatory journals |

---

## Tip: Use Multiple Platforms Together

Start with **Google Scholar** or **Semantic Scholar** for discovery, then go to **arXiv** or the journal's official site for the full PDF. Use **OpenAlex** for bulk systematic searches.

---

## Checking Access

Many papers are behind paywalls. Free options:
- Look for a PDF link on the author's personal/university page
- Search on arXiv or Semantic Scholar
- Use **Unpaywall** or **Open Access Button** browser extensions
`,
      },
      {
        id: 'effective-literature-search',
        title: 'Effective Literature Search',
        description:
          'Learn keyword strategies, Boolean operators, and citation chasing to find all relevant papers efficiently.',
        duration: '12 min',
        content: `## Effective Literature Search

Searching broadly gives you too many irrelevant papers. Searching narrowly misses important work. Effective search is a skill — here is how to do it well.

---

## Technique 1: Keyword Search

Start with the core terms of your research problem and expand from there.

**Example — research on speech recognition with accents:**

\`\`\`
"speech recognition"
accent adaptation
ASR accent robustness
accented speech ASR
multilingual speech recognition
\`\`\`

**Tips:**
- Try synonyms (ASR = Automatic Speech Recognition)
- Use quotes for exact phrases: \`"accent adaptation"\`
- Search the title field for high-precision results

---

## Technique 2: Boolean Operators

Combine keywords logically to control what you find.

| Operator | Effect | Example |
|---|---|---|
| **AND** | Both terms must appear | \`speech recognition AND accent\` |
| **OR** | Either term can appear | \`speech recognition OR ASR\` |
| **NOT** | Exclude a term | \`ASR NOT music\` |
| **""** | Exact phrase | \`"low-resource language"\` |

---

## Technique 3: Citation Chasing

Once you find one relevant paper, use its references to find more.

**Backward search (references in the paper):**
→ Find older, foundational work that the authors built on

**Forward search (papers that cite this paper):**
→ Find newer work that has extended or challenged it
→ Use Google Scholar's "Cited by X" feature or Semantic Scholar

---

## Building a Search Strategy

1. Start with 2–3 core keywords
2. Run the search and note the most relevant 5–10 papers
3. Expand with synonyms and related terms
4. Use Boolean operators to narrow or broaden
5. Backward and forward chase from your best papers
6. Stop when you are seeing the same papers repeatedly

---

## Managing What You Find

Use a reference manager to organise papers as you find them:
- **Zotero** (free, open-source — recommended)
- **Mendeley**
- **Notion / spreadsheet** (simple but effective)

For each paper, record: title, year, authors, venue, key findings, and relevance to your work.
`,
      },

      // ── Module 3: Reading Research Papers ────────────────────────────
      {
        id: 'anatomy-of-a-research-paper',
        title: 'Anatomy of a Research Paper',
        description:
          'Understand the standard structure of a research paper so you always know where to look for what.',
        duration: '10 min',
        content: `## Anatomy of a Research Paper

Every research paper follows a recognisable structure. Once you know this map, you can navigate any paper quickly and extract the information you need.

---

## Standard Sections

| Section | Question It Answers |
|---|---|
| **Abstract** | What is this paper about in 150–250 words? |
| **Introduction** | What problem is addressed, and why does it matter? |
| **Related Work / Literature Review** | What has already been done? |
| **Methodology** | How was the problem approached? |
| **Experiments / Data** | What data and experimental setup were used? |
| **Results** | What were the findings? |
| **Discussion** | What do the results mean? What are the limitations? |
| **Conclusion** | What was accomplished and what comes next? |
| **References** | Which prior work was cited? |

---

## What Each Section Tells a Reviewer

### Abstract
A self-contained summary. If the abstract doesn't interest you, the paper may not be relevant — but always check the introduction before dismissing it.

### Introduction
Contains the **research problem**, **motivation**, and often a summary of contributions. This is where the gap is stated.

### Related Work
This is the **most important section for literature review**. It shows how this paper positions itself relative to prior work.

### Methodology
The technical core. Describes the algorithm, model, framework, or approach used.

### Results
Tables and graphs comparing the proposed method to baselines. Check whether the improvement is statistically significant.

### Discussion / Limitations
Often the most honest part of the paper. Authors admit what didn't work and why.

### Future Work
A direct roadmap for new research problems.

---

## Key Insight

> You do not have to read a paper front to back to understand it. Knowing where each piece of information lives lets you extract what you need efficiently.
`,
      },
      {
        id: 'efficient-paper-reading',
        title: 'Efficient Paper Reading Strategy',
        description:
          'Learn the three-pass reading method used by experienced researchers to process many papers quickly.',
        duration: '10 min',
        content: `## Efficient Paper Reading Strategy

Researchers often need to read dozens — sometimes hundreds — of papers during a literature review. Reading every paper fully is impossible. The **three-pass method** solves this problem.

---

## The Three-Pass Method

### Pass 1 — Overview (~5 minutes)

**Goal:** Decide if the paper is relevant enough to read further.

**Read:**
- Title
- Abstract
- Introduction (first and last paragraphs)
- Conclusion

**Output:** A yes/no decision on whether to continue, and a one-sentence summary of what the paper does.

---

### Pass 2 — Understanding (~15–30 minutes)

**Goal:** Understand the approach and results without getting lost in details.

**Read:**
- All figures, tables, and their captions
- Methodology section (skim — focus on the core idea)
- Results section

**Skip:** Mathematical proofs, detailed implementation, appendices

**Output:** You should be able to explain what the paper proposes and what it found.

---

### Pass 3 — Deep Analysis (~1–2 hours)

**Goal:** Critically evaluate the research.

**Focus on:**
- Are the assumptions valid?
- Are the experiments fair and complete?
- Are the baselines strong and up-to-date?
- Can the results be reproduced?
- What are the limitations?

**Output:** A critical assessment and notes on gaps for your literature review.

---

## Practical Reading Workflow

| Paper type | Passes needed |
|---|---|
| Potentially relevant | Pass 1 |
| Definitely relevant | Pass 1 + 2 |
| Core/foundational paper | All 3 passes |

---

## Note-Taking While Reading

For every paper you complete Pass 2 or 3 on, record:

1. **Problem:** What problem does it address?
2. **Method:** What approach does it use?
3. **Data:** What dataset was used?
4. **Results:** What were the key numbers?
5. **Limitations:** What does it fail at?
6. **Gap / Relevance:** What does this leave open for your research?
`,
      },

      // ── Module 4: Analysing Literature ───────────────────────────────
      {
        id: 'identifying-research-gaps',
        title: 'Identifying Research Gaps',
        description:
          'Learn the four types of research gaps and how to extract them systematically from literature.',
        duration: '12 min',
        content: `## Identifying Research Gaps

Reading papers is not the goal. The goal is to find **what is missing** — the gaps that justify your research.

---

## What Makes Something a Research Gap?

A research gap is an area where:
- A problem **has not been studied** at all
- A problem **has been insufficiently studied** (limited scope, small data, narrow conditions)
- Results across papers **conflict** and no explanation exists
- A method from one field **has not been applied** in another

---

## The Four Gap Types

### 1. Performance Gap
Existing methods are not accurate, fast, or robust enough.

> *Example: "Current ASR systems achieve 95% accuracy on clean speech but drop to 72% on accented speech."*

### 2. Data Gap
No suitable dataset exists for certain conditions or domains.

> *Example: "There is no publicly available dataset for railway English document OCR with noise."*

### 3. Methodological Gap
Existing techniques have theoretical or practical limitations.

> *Example: "Rule-based extraction systems fail to generalise across document formats."*

### 4. Application Gap
A proven method hasn't been applied to a relevant new domain.

> *Example: "Transformer models have improved NLP broadly but have not been applied to legal document analysis."*

---

## Where to Find Gaps in Papers

| Paper Section | What to Look For |
|---|---|
| **Introduction** | Problems the paper motivates but doesn't fully solve |
| **Related Work** | What prior work explicitly could not do |
| **Discussion** | Unexpected or unexplained results |
| **Limitations** | Direct admissions from the authors |
| **Future Work** | The authors' own suggested next steps |

---

## Building Your Gap List

As you read papers, maintain a running document:

\`\`\`
Paper: [Title, Year]
Gap type: [Performance / Data / Methodological / Application]
Gap description: [One sentence]
Evidence: [Quote or result that shows the gap]
\`\`\`

After reading 15–20 papers, patterns will emerge. The gaps that appear across multiple papers are the strongest candidates for your research problem.
`,
      },
      {
        id: 'synthesizing-literature',
        title: 'Synthesizing Literature',
        description:
          'Learn how to connect and compare multiple studies rather than listing them one by one.',
        duration: '12 min',
        content: `## Synthesizing Literature

The difference between a weak literature review and a strong one is **synthesis**.

---

## Summary vs. Synthesis

| Summary | Synthesis |
|---|---|
| Describes each paper individually | Connects papers to each other |
| "Smith (2020) did X. Lee (2022) did Y." | "Both Smith and Lee explored X, but differed in Y." |
| Passive, encyclopaedic | Analytical, argumentative |
| No conclusions drawn | Reveals patterns, trends, and gaps |

---

## How to Synthesize

### Step 1 — Group Studies by Theme
Instead of organising by paper, organise by approach, method type, or finding.

*Example groupings for speech recognition:*
- Rule-based approaches
- Classical ML approaches (HMM, GMM)
- Deep learning approaches (CNN, RNN, Transformer)
- Accent-specific approaches

### Step 2 — Compare Within Each Group
For each group, answer:
- What do these studies have in common?
- Where do they differ?
- Which performs best, and under what conditions?

### Step 3 — Discuss Limitations Across Groups
After comparing, identify what the entire body of work still cannot do.

---

## A Synthesized Paragraph (Example)

> Several studies have explored neural networks for speech recognition. Smith (2020) used CNN-based models and achieved 91% accuracy on standard benchmarks, while Lee (2022) applied transformer architectures and improved this to 94%. However, both studies trained exclusively on native-speaker data. When evaluated on accented speech, performance dropped to 71–74%, indicating that neither approach is robust to accent variation. This suggests a need for accent-adaptive training strategies.

**Notice:** This paragraph tells a story. It compares, contrasts, tracks improvement, and ends by identifying a gap.

---

## The Synthesis Formula

\`\`\`
[Group of studies] explored [approach].
[Author A] found [result]; [Author B] found [related/different result].
However, [all/most] of these studies [share a common limitation].
This indicates [the gap your research addresses].
\`\`\`

---

## Common Synthesis Moves

| Move | Language to use |
|---|---|
| Group similar work | "Several studies have…", "A number of researchers…" |
| Compare | "Unlike X, Y…", "While A found…, B showed…" |
| Identify tension | "These findings conflict because…" |
| Point to a gap | "However, none of these approaches…" |
`,
      },

      // ── Module 5: Writing the Review ──────────────────────────────────
      {
        id: 'structure-of-literature-review',
        title: 'Structure of a Literature Review',
        description:
          'Learn how to organise and write a complete literature review section for a research paper.',
        duration: '12 min',
        content: `## Structure of a Literature Review

A well-structured literature review guides the reader from general background to your specific research gap. It has a clear flow like any good argument.

---

## Typical Structure

\`\`\`
1. Introduction to the research area
         ↓
2. Thematic discussion of existing studies
         ↓
3. Comparison of methods and findings
         ↓
4. Identification of research gaps
\`\`\`

---

## Section by Section

### 1. Introduction to the Research Area
Begin with **broad context** — the field, its importance, and the general problem domain.

*Purpose: Orient the reader and establish why this area matters.*

> "Speech recognition has become a core technology in human-computer interaction, powering applications from virtual assistants to automated transcription services…"

---

### 2. Thematic Discussion
Organise the body of the review **by theme, not by paper**.

*Bad structure:*
- Section 2.1: Smith (2020)
- Section 2.2: Lee (2021)

*Good structure:*
- Section 2.1: Rule-Based Approaches
- Section 2.2: Statistical Machine Learning Approaches
- Section 2.3: Deep Learning Approaches

---

### 3. Comparison of Methods and Findings
Within each theme, **compare methods, datasets, and results** across papers.

Include a **comparison table** when reviewing multiple methods — it communicates clearly and saves space.

| Study | Method | Dataset | Accuracy |
|---|---|---|---|
| Smith (2020) | CNN | LibriSpeech | 91.2% |
| Lee (2022) | Transformer | CommonVoice | 94.1% |
| Park (2023) | Accent-adaptive | AccentDB | 87.6% |

---

### 4. Identification of Research Gaps
Close the review by **connecting the gaps to your research**.

This is the most important paragraph — it is your justification.

> "While deep learning approaches have significantly advanced speech recognition accuracy, they consistently underperform on accented speech. No existing work has proposed accent-adaptive fine-tuning using low-resource multilingual transfer. This gap motivates the present research."

---

## Writing Tips

- Use **headings and subheadings** to signal structure
- Each paragraph should make **one analytical point**, not summarise one paper
- Write in **present tense** for established facts, past tense for specific study findings
- Cite continuously — every claim should be backed by a reference
`,
      },
      {
        id: 'common-mistakes-literature-review',
        title: 'Common Mistakes in Literature Reviews',
        description:
          'Understand the four critical mistakes that weaken literature reviews and how to avoid each one.',
        duration: '8 min',
        content: `## Common Mistakes in Literature Reviews

Even experienced researchers make these mistakes. Knowing them in advance will help you write a much stronger review.

---

## Mistake 1 — Listing Papers Without Analysis

**What it looks like:**
> "Smith (2020) proposed a CNN model. Lee (2021) used an RNN. Park (2022) applied transformers."

**Why it fails:** This is a bibliography, not a review. It shows no understanding of how the work relates.

**Fix:** Compare and connect — explain how each paper relates to the others and to your research problem.

---

## Mistake 2 — Including Irrelevant Literature

**What it looks like:** A review with 30 papers, only 10 of which are actually related to the research problem.

**Why it fails:** Dilutes the review, confuses the reader, and suggests weak search skills.

**Fix:** Every paper you cite must be **directly relevant** to your research problem or methodology. If you can't explain why a paper is there, remove it.

---

## Mistake 3 — Failing to Identify Research Gaps

**What it looks like:** A review that describes existing work but never explains what is missing.

**Why it fails:** The entire purpose of a literature review is to **justify your research**. Without identifying gaps, you haven't done that.

**Fix:** End every section — and definitely the entire review — with a clear statement of what existing work cannot do and why your research is therefore needed.

---

## Mistake 4 — Writing Summaries Instead of Synthesis

**What it looks like:** Each paragraph summarises one paper in isolation.

**Why it fails:** Shows you can read papers, not that you can think across them.

**Fix:** Group papers by theme and write **comparative paragraphs** that show patterns, contradictions, and progress across studies.

---

## Quick Self-Check

Before submitting your literature review, ask:

- [ ] Does every cited paper connect directly to my research problem?
- [ ] Did I compare methods rather than just list them?
- [ ] Does the review end with a clear statement of the research gap?
- [ ] Are my paragraphs analytical (comparing) rather than descriptive (summarising)?
- [ ] Did I organise by theme rather than by paper?
`,
      },

      // ── Final Lesson ──────────────────────────────────────────────────
      {
        id: 'literature-review-workflow',
        title: 'The Literature Review Workflow',
        description:
          'A complete step-by-step workflow from defining your scope to writing the final review.',
        duration: '15 min',
        content: `## The Literature Review Workflow

This is the complete, practical workflow researchers follow when conducting and writing a literature review.

---

## The 7-Step Workflow

\`\`\`
1. Define research scope
        ↓
2. Search academic databases
        ↓
3. Select relevant papers
        ↓
4. Read and analyse studies
        ↓
5. Identify patterns and gaps
        ↓
6. Organise findings
        ↓
7. Write the literature review
\`\`\`

---

## Step-by-Step Guide

### Step 1 — Define Research Scope
Before searching, clarify:
- What is your research problem?
- What time period are you covering? (e.g. last 5 years, or foundational work too?)
- What fields or domains are relevant?

---

### Step 2 — Search Academic Databases
Use Google Scholar, arXiv, Semantic Scholar, and OpenAlex.

Build your search with:
- Core keywords from your problem
- Boolean operators (AND / OR / NOT)
- Synonyms and abbreviations

---

### Step 3 — Select Relevant Papers
From your search results:
- Apply Pass 1 (title + abstract) to screen for relevance
- Keep papers that directly address your problem or related methods
- Aim for **20–50 papers** for a typical literature review section

---

### Step 4 — Read and Analyse Studies
For each kept paper:
- Apply Pass 2 or Pass 3 as needed
- Record: problem, method, data, results, limitations, gap

Use a **reading notes spreadsheet** or reference manager to stay organised.

---

### Step 5 — Identify Patterns and Gaps
Look across your notes:
- What methods are dominant?
- What has improved over time?
- What do all existing methods fail at?
- Which gap appears most clearly and most frequently?

---

### Step 6 — Organise Findings
Group papers into **2–4 themes** (e.g. by method type, application domain, dataset).

Sketch an outline:
1. Introduction to area
2. Theme A
3. Theme B
4. Theme C
5. Research gaps and your positioning

---

### Step 7 — Write the Literature Review
Write theme by theme. For each section:
- Describe the general approach
- Compare specific papers
- Note limitations
- End with what the theme still cannot do

Close with a **gap paragraph** that directly motivates your research.

---

## Course Summary

| Skill | ✓ |
|---|---|
| Explain the purpose of a literature review | ✅ |
| Identify the four types of reviews | ✅ |
| Search academic databases effectively | ✅ |
| Read papers using the three-pass method | ✅ |
| Identify the four types of research gaps | ✅ |
| Synthesize multiple papers comparatively | ✅ |
| Structure and write a full literature review | ✅ |

---

## Final Exercise

Using the workflow above, complete a mini literature review:

1. Pick any topic you are studying or interested in
2. Find **5 relevant papers** using Google Scholar or arXiv
3. Read each with Pass 1 + Pass 2
4. Record the problem, method, results, and limitations for each
5. Group them into **2 themes**
6. Write **one synthesised paragraph per theme** (4–6 sentences)
7. Write a **gap paragraph** explaining what all five papers leave unresolved

> **You can now conduct, analyse, and write a literature review. The most intimidating section of any research paper is no longer a mystery.**
`,
      },
    ],
  },
];

/** Progress stored in Puter KV under this key */
export const PROGRESS_KV_KEY = 'learn_course_progress';

/**
 * Shape of the progress object stored in KV:
 * {
 *   [courseId]: {
 *     [lessonId]: boolean  // true = completed
 *   }
 * }
 */
export type CourseProgress = Record<string, Record<string, boolean>>;
