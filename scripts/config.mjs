/**
 * Everything personal lives here. Edit this file, re-run `npm run build`,
 * and every panel updates. No SVG editing required.
 */
export const CONFIG = {
  github: "sudhanshu5669",
  leetcode: "sudhanshu_5669",

  name: "SUDHANSHU",
  tagline: "for GitHub",
  role: "DEVELOPER · CREATOR · EXPLORER",
  terminal: "> classic code. timeless builds._",

  /** Desktop icons in the SUDHANSHU.OS window. */
  apps: [
    { icon: "📁", label: "Backend" },
    { icon: "🤖", label: "AI / ML" },
    { icon: "🧠", label: "DSA" },
    { icon: "🎵", label: "Music" },
    { icon: "🎮", label: "Games" },
    { icon: "🎨", label: "Blender" },
  ],

  /** Rendered as about.yaml. `key: value`, or key + indented list. */
  about: [
    { key: "name", value: "Sudhanshu" },
    { key: "location", value: "India {IN}" },
    { key: "focus", value: "[ AI/ML, open-source, DSA ]" },
    { key: "stack", value: "[ Node.js, FastAPI ]" },
    {
      key: "lives",
      list: ["🎵 Music Producer (synthxx)", "🎮 Gamer · 🎬 Editor · ✍️ Writer", "🎨 3D / Blender Artist"],
    },
    { key: "motto", value: '"Build it, break it, learn."' },
  ],

  status: [
    { title: "🌱 LEARNING", body: "LangChain & LLM orchestration · ML fundamentals · System design" },
    { title: "🚀 BUILDING", body: "AI tools & agents · Full-stack web apps · Automated content pipelines" },
    { title: "🎯 2026 GOALS", body: "Master ML · Ship a fully automated content pipeline" },
  ],

  stack: [
    {
      label: "💻 LANGUAGES",
      items: ["JavaScript", "TypeScript", "Python", "C++", "C", "Java", "Dart"],
    },
    {
      label: "🌐 FRONTEND & MOBILE",
      items: ["React", "React Native", "Flutter", "Next.js", "Android", "HTML5", "CSS3"],
    },
    {
      label: "⚙️ BACKEND & DATABASES",
      items: ["Node.js", "Express", "FastAPI", "MongoDB", "PostgreSQL", "MySQL", "Redis"],
    },
    {
      label: "🤖 AI / ML",
      items: ["LangChain", "Gemini", "TensorFlow", "HuggingFace", "Colab", "Kaggle"],
    },
    {
      label: "🎨 CREATIVE & GAME DEV",
      items: ["Blender", "FL Studio", "Unity", "Unreal Engine"],
    },
    {
      label: "🔧 DEVOPS & TOOLS",
      items: ["Docker", "Git", "GitHub", "Postman", "Puppeteer", "VS Code", "Linux"],
    },
  ],

  dsaBlurb: "🧩 Arrays, trees, graphs, DP, tries — ask me anything. I live and breathe DSA.",

  /**
   * Featured project rows. Leave empty to auto-pick your top-starred repos,
   * or pin specific ones by name: ["my-repo", "another-repo"].
   */
  featuredRepos: [],
  maxProjects: 4,

  /** The SYNTHXX.AMP player panel. */
  music: {
    app: "SYNTHXX.AMP",
    status: "► NOW STREAMING ON YOUTUBE",
    track: "synthxx — synthwave · lofi · game OSTs · new drops every week",
    url: "https://www.youtube.com/c/synthxx",
  },

  /** Order matters: these render as the connect chips, left to right. */
  connect: [
    { icon: "𝕏", label: "@synthxxmusic", url: "https://twitter.com/synthxxmusic" },
    { icon: "▶", label: "YouTube synthxx", url: "https://www.youtube.com/c/synthxx" },
    { icon: "🟠", label: "LeetCode", url: "https://www.leetcode.com/sudhanshu_5669" },
    { icon: "✉", label: "Email", url: "mailto:bhartiyasudhanshu5669@gmail.com" },
  ],

  quote: {
    text: '"The best error message is the one that never shows up."',
    author: "— Thomas Fuchs",
  },

  notification: {
    title: "Profile loaded",
    body: "readme.md · made with ♥ from India {IN}",
  },

  statusBar: { left: "RETRO OS · README EDITION", right: "CLASSIC LOOK · TIMELESS FEEL" },
};

/** Canvas geometry, matching the source design's 940px card. */
export const LAYOUT = {
  width: 940,
  pad: 22, // desktop padding inside the GitHub card
  gap: 14, // gap between panels
  get content() {
    return this.width - this.pad * 2;
  },
  get half() {
    return (this.content - this.gap) / 2;
  },
};
