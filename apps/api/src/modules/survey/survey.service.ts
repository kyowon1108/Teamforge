import { Injectable, Logger } from "@nestjs/common";
import { Response } from "express";
import { Prisma } from "@prisma/client";
import OpenAI from "openai";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from "crypto";

@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);
  private readonly openai: OpenAI | null;

  // In-memory job store for Phase 1 MVP (replace with Redis/DB in production)
  private jobStore = new Map<
    string,
    { status: "processing" | "done" | "failed"; progress: number; result?: unknown; userId: string }
  >();

  constructor(private readonly prisma: PrismaService) {
    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
  }

  async saveDraft(
    userId: string,
    body: { teamId: string; section: number; answers: Record<string, unknown> }
  ) {
    const existing = await this.prisma.skillAssessment.findUnique({
      where: { userId_teamId: { userId, teamId: body.teamId } },
    });

    // Merge answers with existing
    const existingAnswers = (existing?.answers as Record<string, unknown>) ?? {};
    const mergedAnswers = { ...existingAnswers, ...body.answers };

    await this.prisma.skillAssessment.upsert({
      where: { userId_teamId: { userId, teamId: body.teamId } },
      create: {
        userId,
        teamId: body.teamId,
        answers: mergedAnswers as Prisma.InputJsonValue,
        status: "draft",
      },
      update: {
        answers: mergedAnswers as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    return { savedAt: new Date().toISOString() };
  }

  async saveResume(userId: string, teamId: string, file: Express.Multer.File) {
    const fs = await import("fs/promises");
    const path = await import("path");

    // Save to local uploads directory
    const uploadsDir = path.join(process.cwd(), "uploads", "resumes");
    await fs.mkdir(uploadsDir, { recursive: true });

    const filename = `${userId}_${teamId}_${Date.now()}.pdf`;
    const filepath = path.join(uploadsDir, filename);
    await fs.writeFile(filepath, file.buffer);

    // Upsert upload record (delete old ones for same user+team)
    await this.prisma.upload.deleteMany({
      where: { userId, teamId, uploadType: "resume" },
    });

    const upload = await this.prisma.upload.create({
      data: {
        userId,
        teamId,
        uploadType: "resume",
        storagePath: filepath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        deleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return { uploadId: upload.id, filename };
  }

  async submit(
    userId: string,
    body: { teamId: string; answers: Record<string, unknown> }
  ) {
    const jobId = crypto.randomUUID();
    this.jobStore.set(jobId, { status: "processing", progress: 0, userId });

    // Save final answers
    await this.prisma.skillAssessment.upsert({
      where: { userId_teamId: { userId, teamId: body.teamId } },
      create: {
        userId,
        teamId: body.teamId,
        answers: body.answers as Prisma.InputJsonValue,
        status: "submitted",
        submittedAt: new Date(),
      },
      update: {
        answers: body.answers as Prisma.InputJsonValue,
        status: "submitted",
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Process asynchronously
    this._processSubmission(jobId, userId, body.teamId, body.answers);

    return { jobId, estimatedMs: 3000 };
  }

  private async _processSubmission(
    jobId: string,
    userId: string,
    teamId: string,
    answers: Record<string, unknown>
  ) {
    try {
      this.jobStore.set(jobId, { status: "processing", progress: 20, userId });

      // Calculate skill vector from answers, then cross-validate
      const rawSkillVector = this._calculateSkillVector(answers);
      let skillVector = this._crossValidateSkillVector(rawSkillVector, answers);
      const experienceScore = this._calculateExperienceScore(answers);
      const reliabilityScore = this._calculateReliabilityScore(answers);

      this.jobStore.set(jobId, { status: "processing", progress: 40, userId });

      // Enrichment: Resume PDF analysis + GitHub profile (run in parallel, non-blocking)
      let resumeData: Record<string, unknown> | null = null;
      let githubData: Record<string, unknown> | null = null;

      try {
        const [resume, github] = await Promise.allSettled([
          this._analyzeResume(userId, teamId),
          this._enrichFromGitHub(answers.githubUrl as string | undefined),
        ]);
        if (resume.status === "fulfilled") resumeData = resume.value;
        if (github.status === "fulfilled") githubData = github.value;
      } catch (e) {
        this.logger.warn("Enrichment failed (non-critical):", e);
      }

      this.jobStore.set(jobId, { status: "processing", progress: 70, userId });

      // Merge enrichment data into skill vector
      skillVector = this._mergeEnrichmentIntoVector(skillVector, resumeData, githubData);

      // Store results — use raw SQL for pgvector column
      await this.prisma.skillAssessment.update({
        where: { userId_teamId: { userId, teamId } },
        data: {
          experienceScore,
          reliabilityScore,
          resumeData: resumeData as Prisma.InputJsonValue ?? Prisma.DbNull,
          githubData: githubData as Prisma.InputJsonValue ?? Prisma.DbNull,
          status: "completed",
          updatedAt: new Date(),
        },
      });

      // Update skill_vector via raw SQL (Unsupported type in Prisma)
      const sv = skillVector;
      const vectorStr = `[${sv.backend},${sv.frontend},${sv.database},${sv.devops},${sv.aiMl},${sv.design}]`;
      await this.prisma.$executeRaw`
        UPDATE skill_assessments
        SET skill_vector = ${vectorStr}::vector
        WHERE user_id = ${userId}::uuid AND team_id = ${teamId}::uuid
      `;

      const result = {
        userId,
        skillVector,
        experienceScore,
        reliabilityScore,
        recommendedRoles: this._recommendRoles(skillVector),
        positionPrediction: this._predictPosition(skillVector),
      };

      this.jobStore.set(jobId, { status: "done", progress: 100, result, userId });
    } catch (err) {
      this.logger.error("Survey processing error:", err);
      this.jobStore.set(jobId, { status: "failed", progress: 0, userId });
    }
  }

  async streamResultStatus(jobId: string, res: Response) {
    const send = (data: unknown) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const job = this.jobStore.get(jobId);

      if (!job) {
        send({ status: "failed", progress: 0 });
        clearInterval(interval);
        res.end();
        return;
      }

      // Don't leak userId in SSE response
      const { userId: _uid, ...safeJob } = job;
      send(safeJob);

      if (job.status === "done" || job.status === "failed") {
        clearInterval(interval);
        res.end();
        return;
      }

      if (attempts > 60) {
        // 60 second timeout
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    res.on("close", () => clearInterval(interval));
  }

  async getResult(userId: string, teamId: string) {
    const assessment = await this.prisma.skillAssessment.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });

    if (!assessment || assessment.status !== "completed") {
      return null;
    }

    const answers = (assessment.answers as Record<string, unknown>) ?? {};

    // Fetch skill_vector via raw SQL (Unsupported type)
    const rawResult = await this.prisma.$queryRaw<{ skill_vector: string }[]>`
      SELECT skill_vector::text FROM skill_assessments
      WHERE user_id = ${userId}::uuid AND team_id = ${teamId}::uuid
    `;
    const rawVector = rawResult[0]?.skill_vector;
    const skillVector = rawVector
      ? this._parseSkillVector(rawVector)
      : this._crossValidateSkillVector(this._calculateSkillVector(answers), answers);

    return {
      userId,
      skillVector,
      experienceScore: assessment.experienceScore ?? 0,
      reliabilityScore: assessment.reliabilityScore ?? 0,
      recommendedRoles: this._recommendRoles(skillVector),
      positionPrediction: this._predictPosition(skillVector),
    };
  }

  /**
   * Reliability score (0–100) based on:
   * - weeklyHours (Q12): higher commitment → higher reliability
   * - workArchetype (Q9): coordinator/documenter signal reliability
   * - workStyleVector (Q10): collaboration preference signals team reliability
   * - gitCollabLevel (Q8): higher git collab → more reliable in team settings
   */
  private _calculateReliabilityScore(answers: Record<string, unknown>): number {
    let score = 50; // Base score

    // Weekly hours commitment (0–25 points)
    const weeklyHours = (answers.weeklyHours as number) ?? 5;
    if (weeklyHours >= 30) score += 25;
    else if (weeklyHours >= 20) score += 20;
    else if (weeklyHours >= 10) score += 12;
    else score += 5;

    // Work archetype (0–15 points)
    const archetype = answers.workArchetype as string | undefined;
    const archetypeScores: Record<string, number> = {
      coordinator: 15, documenter: 13, executor: 10, architect: 8, initiator: 6,
    };
    score += archetypeScores[archetype ?? ""] ?? 5;

    // Collaboration preference from workStyleVector (0–10 points)
    // solo_vs_collab: higher = more collaborative
    const wsv = (answers.workStyleVector ?? [50, 50, 50]) as number[];
    const collabPref = wsv[0] ?? 50;
    score += Math.round(collabPref / 10); // 0–10

    // Git collaboration level Q8 (0–10 points, scales with team readiness)
    const gitLevel = (answers.gitCollabLevel as number) ?? 0;
    score += Math.min(gitLevel * 2.5, 10);

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private _calculateSkillVector(answers: Record<string, unknown>) {
    const skillRatings = (answers.skillRatings as Record<string, number>) ?? {};

    const backendTechs = ["NestJS", "Express", "Spring Boot", "Django", "FastAPI", "Go Fiber"];
    const frontendTechs = ["React", "Next.js", "Vue", "Svelte", "Flutter", "React Native"];
    const dbTechs = ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Firebase", "Supabase"];
    const devopsTechs = ["Docker", "GitHub Actions", "AWS", "GCP", "Vercel", "Kubernetes"];
    const aiTechs = ["PyTorch", "TensorFlow", "LangChain", "Pandas", "scikit-learn", "Hugging Face"];
    const designTechs = ["Figma", "Photoshop", "Blender", "Unity"];

    const avg = (techs: string[]) => {
      const vals = techs.map((t) => skillRatings[t]).filter(Boolean) as number[];
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };

    return {
      backend: avg(backendTechs),
      frontend: avg(frontendTechs),
      database: avg(dbTechs),
      devops: avg(devopsTechs),
      aiMl: avg(aiTechs),
      design: avg(designTechs),
    };
  }

  private _calculateExperienceScore(answers: Record<string, unknown>): number {
    const tier = (answers.experienceTier as number) ?? 1;
    const projectCount = (answers.projectCount as number) ?? 0;
    const gitLevel = (answers.gitCollabLevel as number) ?? 0;

    return tier * Math.log(projectCount + 1) * (gitLevel + 1);
  }

  /**
   * Cross-validate skill vector against other survey answers.
   * Adjusts scores downward when self-ratings are inconsistent with experience signals.
   * - High self-rating but no matching actual roles (Q7) → dampen
   * - High self-rating but low project count (Q6) → dampen
   * - topStrengths (Q5) boost matching domains slightly
   */
  private _crossValidateSkillVector(
    vector: Record<string, number>,
    answers: Record<string, unknown>
  ): Record<string, number> {
    const projectCount = (answers.projectCount as number) ?? 0;
    const actualRoles = (answers.actualRoles ?? []) as string[];
    const topStrengths = (answers.topStrengths ?? []) as string[];

    // Map actual roles to skill domains
    const roleDomainMap: Record<string, string[]> = {
      "API/서버 개발": ["backend"],
      "화면(UI) 구현": ["frontend"],
      "DB 스키마 설계": ["database"],
      "배포/인프라": ["devops"],
      "AI 모델": ["aiMl"],
      "디자인": ["design"],
      "PM/일정 관리": [],
      "테스트/QA": [],
    };

    // Map topStrengths labels to domains
    const strengthDomainMap: Record<string, string> = {
      "백엔드": "backend",
      "프론트엔드": "frontend",
      "데이터베이스": "database",
      "인프라/DevOps": "devops",
      "AI/ML": "aiMl",
      "디자인": "design",
    };

    const activeDomains = new Set<string>();
    for (const role of actualRoles) {
      for (const d of roleDomainMap[role] ?? []) activeDomains.add(d);
    }

    const strengthDomains = new Set(
      topStrengths.map((s) => strengthDomainMap[s]).filter(Boolean)
    );

    const adjusted = { ...vector };

    for (const [domain, score] of Object.entries(adjusted)) {
      if (score <= 1) continue; // Low scores don't need validation

      let factor = 1.0;

      // If user rates high (>=3) in a domain but has 0 projects, dampen
      if (score >= 3 && projectCount === 0) {
        factor *= 0.7;
      }

      // If user rates high (>=3) but never did that role in practice, slight dampen
      if (score >= 3 && projectCount >= 1 && !activeDomains.has(domain)) {
        factor *= 0.85;
      }

      // If domain matches topStrengths, slight boost (max 5.0)
      if (strengthDomains.has(domain)) {
        factor *= 1.1;
      }

      adjusted[domain] = Math.min(5, Math.round(score * factor * 100) / 100);
    }

    return adjusted;
  }

  private _parseSkillVector(raw: unknown): Record<string, number> {
    // pgvector returns as string "[0.5,1.0,...]" or array
    if (typeof raw === "string") {
      const nums = raw.replace(/[\[\]]/g, "").split(",").map(Number);
      return {
        backend: nums[0] ?? 0,
        frontend: nums[1] ?? 0,
        database: nums[2] ?? 0,
        devops: nums[3] ?? 0,
        aiMl: nums[4] ?? 0,
        design: nums[5] ?? 0,
      };
    }
    return raw as Record<string, number>;
  }

  private _recommendRoles(skillVector: Record<string, number>): string[] {
    const roles: { role: string; score: number }[] = [
      { role: "백엔드 개발자", score: skillVector.backend },
      { role: "프론트엔드 개발자", score: skillVector.frontend },
      { role: "풀스택 개발자", score: (skillVector.backend + skillVector.frontend) / 2 },
      { role: "DevOps 엔지니어", score: skillVector.devops },
      { role: "AI/ML 엔지니어", score: skillVector.aiMl },
      { role: "UI/UX 디자이너", score: skillVector.design },
    ];

    return roles
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .filter((r) => r.score > 0)
      .map((r) => r.role);
  }

  /**
   * Predict position using cosine similarity against role archetype vectors.
   * Each archetype is a 6-dim vector [backend, frontend, database, devops, aiMl, design].
   */
  private _predictPosition(skillVector: Record<string, number>): string {
    const userVec = [
      skillVector.backend, skillVector.frontend, skillVector.database,
      skillVector.devops, skillVector.aiMl, skillVector.design,
    ];

    // If all zeros, can't predict
    if (userVec.every((v) => v === 0)) return "풀스택 개발자";

    // Role archetype vectors (idealized skill distributions)
    const archetypes: { role: string; vec: number[] }[] = [
      { role: "백엔드 개발자",     vec: [5, 1, 3, 2, 0, 0] },
      { role: "프론트엔드 개발자", vec: [1, 5, 0, 1, 0, 2] },
      { role: "풀스택 개발자",     vec: [4, 4, 2, 2, 0, 1] },
      { role: "데이터 엔지니어",   vec: [2, 0, 5, 1, 3, 0] },
      { role: "DevOps 엔지니어",   vec: [2, 0, 2, 5, 0, 0] },
      { role: "AI 엔지니어",       vec: [2, 0, 2, 1, 5, 0] },
      { role: "디자이너",          vec: [0, 2, 0, 0, 0, 5] },
    ];

    let bestRole = "풀스택 개발자";
    let bestSim = -1;

    for (const { role, vec } of archetypes) {
      const sim = this._cosineSimilarity(userVec, vec);
      if (sim > bestSim) {
        bestSim = sim;
        bestRole = role;
      }
    }

    return bestRole;
  }

  private _cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ─── Resume PDF Analysis via Claude API ────────────────────────────

  /**
   * Fetch the user's latest uploaded resume and analyze via OpenAI gpt-4o-mini.
   * Returns extracted skill domains or null if no resume/no API key.
   */
  private async _analyzeResume(
    userId: string,
    teamId: string
  ): Promise<Record<string, unknown> | null> {
    if (!this.openai) return null;

    // Find the user's latest resume upload for this team
    const upload = await this.prisma.upload.findFirst({
      where: { userId, teamId, uploadType: "resume" },
      orderBy: { createdAt: "desc" },
    });
    if (!upload) return null;

    // Read file from local storage path
    const fs = await import("fs/promises");
    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(upload.storagePath);
    } catch {
      this.logger.warn(`Resume file not found: ${upload.storagePath}`);
      return null;
    }

    const base64 = fileBuffer.toString("base64");

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "file",
                file: { file_data: `data:application/pdf;base64,${base64}` },
              },
              {
                type: "text",
                text: `이력서를 분석하여 기술 역량을 JSON으로 추출하세요.

정확히 이 JSON 형태로 응답:
{
  "skills": ["기술1", "기술2", ...],
  "domains": {
    "backend": 0-5,
    "frontend": 0-5,
    "database": 0-5,
    "devops": 0-5,
    "aiMl": 0-5,
    "design": 0-5
  },
  "yearsExperience": number,
  "highlights": ["주요 경력/프로젝트 1줄 요약", ...]
}

규칙:
- 각 도메인 점수는 이력서에 나타난 기술의 깊이와 양을 기반으로 0-5 스케일
- 언급되지 않은 도메인은 0
- skills 배열은 최대 15개
- highlights는 최대 3개`,
              },
            ],
          },
        ],
      });

      const text = response.choices[0]?.message?.content ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch (err) {
      this.logger.warn("OpenAI resume analysis failed:", err);
      return null;
    }
  }

  // ─── GitHub Profile Enrichment ─────────────────────────────────────

  /**
   * Fetch public GitHub profile + repo languages to infer skill levels.
   */
  private async _enrichFromGitHub(
    githubUrl: string | undefined
  ): Promise<Record<string, unknown> | null> {
    if (!githubUrl) return null;

    // Extract username from URL
    const match = githubUrl.match(/github\.com\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const username = match[1];

    try {
      // Fetch user profile and repos in parallel
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "TeamForge/1.0",
      };

      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`, { headers }),
        fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`, { headers }),
      ]);

      if (!userRes.ok) return null;

      const user = (await userRes.json()) as {
        public_repos: number;
        followers: number;
        created_at: string;
      };
      const repos = reposRes.ok
        ? ((await reposRes.json()) as Array<{ language: string | null; stargazers_count: number; fork: boolean }>)
        : [];

      // Count languages across non-fork repos
      const langCounts: Record<string, number> = {};
      let totalStars = 0;
      for (const repo of repos) {
        if (repo.fork) continue;
        if (repo.language) {
          langCounts[repo.language] = (langCounts[repo.language] ?? 0) + 1;
        }
        totalStars += repo.stargazers_count;
      }

      // Map languages to skill domains
      const langDomainMap: Record<string, string[]> = {
        TypeScript: ["backend", "frontend"], JavaScript: ["backend", "frontend"],
        Python: ["backend", "aiMl"], Java: ["backend"], Kotlin: ["backend"],
        Go: ["backend", "devops"], Rust: ["backend"],
        HTML: ["frontend"], CSS: ["frontend"], SCSS: ["frontend"],
        Vue: ["frontend"], Svelte: ["frontend"],
        Dockerfile: ["devops"], Shell: ["devops"], HCL: ["devops"],
        Jupyter: ["aiMl"], R: ["aiMl"],
        Swift: ["frontend"], Dart: ["frontend"],
      };

      const domainScores: Record<string, number> = {
        backend: 0, frontend: 0, database: 0, devops: 0, aiMl: 0, design: 0,
      };

      const nonForkCount = repos.filter((r) => !r.fork).length;

      for (const [lang, count] of Object.entries(langCounts)) {
        const domains = langDomainMap[lang];
        if (!domains) continue;
        // Score: proportion of repos using this language, scaled to 0-3
        const proportion = count / Math.max(nonForkCount, 1);
        const score = Math.min(3, proportion * 5);
        for (const d of domains) domainScores[d] = Math.max(domainScores[d], score);
      }

      return {
        username,
        publicRepos: user.public_repos,
        followers: user.followers,
        totalStars,
        topLanguages: Object.entries(langCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([lang, count]) => ({ lang, count })),
        domainScores,
        accountAge: Math.floor(
          (Date.now() - new Date(user.created_at).getTime()) / (365.25 * 24 * 3600 * 1000)
        ),
      };
    } catch (err) {
      this.logger.warn("GitHub enrichment failed:", err);
      return null;
    }
  }

  // ─── Merge enrichment into skill vector ────────────────────────────

  /**
   * Blend resume and GitHub signals into the cross-validated skill vector.
   * Weight: survey 70%, resume 20%, GitHub 10%
   */
  private _mergeEnrichmentIntoVector(
    vector: Record<string, number>,
    resumeData: Record<string, unknown> | null,
    githubData: Record<string, unknown> | null
  ): Record<string, number> {
    const result = { ...vector };
    const DOMAINS = ["backend", "frontend", "database", "devops", "aiMl", "design"];

    const resumeDomains = (resumeData?.domains ?? null) as Record<string, number> | null;
    const githubDomains = (githubData?.domainScores ?? null) as Record<string, number> | null;

    for (const d of DOMAINS) {
      const survey = result[d] ?? 0;
      const resume = resumeDomains?.[d] ?? 0;
      const github = githubDomains?.[d] ?? 0;

      if (resume === 0 && github === 0) continue;

      // Weighted blend: survey gets at least 70% weight
      let blended: number;
      if (resume > 0 && github > 0) {
        blended = survey * 0.6 + resume * 0.25 + github * 0.15;
      } else if (resume > 0) {
        blended = survey * 0.7 + resume * 0.3;
      } else {
        blended = survey * 0.8 + github * 0.2;
      }

      result[d] = Math.min(5, Math.round(blended * 100) / 100);
    }

    return result;
  }
}
