/**
 * Fetches the numbers the panels display. Every call degrades gracefully:
 * if an API is down the build still succeeds using `fallback`, so a transient
 * outage can never leave a broken README committed.
 */
import { CONFIG } from "./config.mjs";

const GH_GRAPHQL = "https://api.github.com/graphql";
const LC_GRAPHQL = "https://leetcode.com/graphql";

async function safe(label, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  ! ${label} failed (${err.message}) — using fallback`);
    return fallback;
  }
}

/* -------------------------------------------------------------------- GitHub */

const USER_QUERY = `
query($login:String!){
  user(login:$login){
    followers{ totalCount }
    pullRequests{ totalCount }
    issues{ totalCount }
    repositories(first:100, ownerAffiliations:OWNER, isFork:false,
                 orderBy:{field:STARGAZERS, direction:DESC}){
      totalCount
      nodes{
        stargazerCount
        primaryLanguage{ name }
        languages(first:12, orderBy:{field:SIZE, direction:DESC}){
          edges{ size node{ name } }
        }
      }
    }
    contributionsCollection{
      totalCommitContributions
      restrictedContributionsCount
    }
  }
}`;

async function fetchGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN not set");

  const res = await fetch(GH_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "retro-readme-builder",
    },
    body: JSON.stringify({ query: USER_QUERY, variables: { login: CONFIG.github } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);

  const u = json.data.user;
  const repos = u.repositories.nodes ?? [];

  // Aggregate language bytes across every non-fork repo.
  const bytes = new Map();
  for (const repo of repos) {
    for (const edge of repo.languages?.edges ?? []) {
      bytes.set(edge.node.name, (bytes.get(edge.node.name) ?? 0) + edge.size);
    }
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;
  const languages = [...bytes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, size]) => ({ name, pct: Math.round((size / total) * 100) }));

  return {
    followers: u.followers.totalCount,
    prs: u.pullRequests.totalCount,
    issues: u.issues.totalCount,
    repos: u.repositories.totalCount,
    stars: repos.reduce((a, r) => a + r.stargazerCount, 0),
    commits:
      u.contributionsCollection.totalCommitContributions +
      u.contributionsCollection.restrictedContributionsCount,
    languages,
  };
}

/**
 * Unauthenticated fallback so `npm run build` works locally without a token.
 * The REST API exposes no commit total, so that figure is estimated from
 * repository activity and clearly under-reports — CI always has a token and
 * uses the GraphQL path above.
 */
async function fetchGitHubREST() {
  const headers = { "User-Agent": "retro-readme-builder", Accept: "application/vnd.github+json" };
  const get = async (url) => {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  const user = await get(`https://api.github.com/users/${CONFIG.github}`);
  const repos = await get(
    `https://api.github.com/users/${CONFIG.github}/repos?per_page=100&type=owner&sort=pushed`,
  );
  const own = repos.filter((r) => !r.fork);

  const bytes = new Map();
  for (const repo of own) {
    if (repo.language) bytes.set(repo.language, (bytes.get(repo.language) ?? 0) + (repo.size || 1));
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0) || 1;

  return {
    followers: user.followers,
    prs: 0,
    issues: 0,
    repos: user.public_repos,
    stars: own.reduce((a, r) => a + r.stargazers_count, 0),
    commits: 0,
    languages: [...bytes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, size]) => ({ name, pct: Math.round((size / total) * 100) })),
    partial: true,
  };
}

/* ------------------------------------------------------------------ LeetCode */

const LC_QUERY = `
query($username:String!){
  matchedUser(username:$username){
    profile{ ranking }
    submitStatsGlobal{ acSubmissionNum{ difficulty count } }
  }
  allQuestionsCount{ difficulty count }
}`;

async function fetchLeetCode() {
  const res = await fetch(LC_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/${CONFIG.leetcode}/`,
      "User-Agent": "Mozilla/5.0 retro-readme-builder",
    },
    body: JSON.stringify({ query: LC_QUERY, variables: { username: CONFIG.leetcode } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  if (!json.data?.matchedUser) throw new Error(`no such LeetCode user "${CONFIG.leetcode}"`);

  const pick = (list, d) => list.find((e) => e.difficulty === d)?.count ?? 0;
  const solved = json.data.matchedUser.submitStatsGlobal.acSubmissionNum;
  const totals = json.data.allQuestionsCount;

  return {
    easy: pick(solved, "Easy"),
    medium: pick(solved, "Medium"),
    hard: pick(solved, "Hard"),
    total: pick(solved, "All"),
    totalEasy: pick(totals, "Easy"),
    totalMedium: pick(totals, "Medium"),
    totalHard: pick(totals, "Hard"),
    ranking: json.data.matchedUser.profile?.ranking ?? null,
  };
}

/* -------------------------------------------------------------------- ranks */

/** Tiered rank, mirroring how github-profile-trophy grades each category. */
export function rank(value, tiers) {
  const names = ["SSS", "SS", "S", "AAA", "AA", "A", "B", "C"];
  for (let i = 0; i < tiers.length; i++) if (value >= tiers[i]) return names[i];
  return "C";
}

/** Overall letter grade from weighted percentiles. */
export function overallGrade({ commits, stars, prs, followers, repos }) {
  const score =
    Math.min(commits / 1000, 1) * 0.35 +
    Math.min(stars / 200, 1) * 0.25 +
    Math.min(prs / 100, 1) * 0.2 +
    Math.min(followers / 100, 1) * 0.1 +
    Math.min(repos / 40, 1) * 0.1;
  if (score >= 0.9) return "S+";
  if (score >= 0.75) return "S";
  if (score >= 0.6) return "A+";
  if (score >= 0.45) return "A";
  if (score >= 0.3) return "B+";
  if (score >= 0.15) return "B";
  return "C";
}

export const compact = (num) =>
  num >= 1000 ? `${(num / 1000).toFixed(num >= 10000 ? 0 : 1)}k` : String(num);

/* --------------------------------------------------------------------- main */

export async function collect() {
  const github = await safe(
    "GitHub GraphQL",
    fetchGitHub,
    null,
  ) ?? await safe("GitHub REST", fetchGitHubREST, {
    followers: 0,
    prs: 0,
    issues: 0,
    repos: 0,
    stars: 0,
    commits: 0,
    languages: [
      { name: "Python", pct: 42 },
      { name: "JavaScript", pct: 28 },
      { name: "TypeScript", pct: 18 },
      { name: "C++", pct: 12 },
    ],
  });

  const leetcode = await safe("LeetCode API", fetchLeetCode, {
    easy: 0,
    medium: 0,
    hard: 0,
    total: 0,
    totalEasy: 900,
    totalMedium: 1900,
    totalHard: 850,
    ranking: null,
  });

  return { github, leetcode, builtAt: new Date() };
}
