import { Injectable } from "@nestjs/common";
import { Response } from "express";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import * as crypto from "crypto";

@Injectable()
export class SurveyService {
  // In-memory job store for Phase 1 MVP (replace with Redis/DB in production)
  private jobStore = new Map<
    string,
    { status: "processing" | "done" | "failed"; progress: number; result?: unknown; userId: string }
  >();

  constructor(private readonly prisma: PrismaService) {}

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
      this.jobStore.set(jobId, { status: "processing", progress: 30, userId });

      // Calculate skill vector from answers
      const skillVector = this._calculateSkillVector(answers);
      const experienceScore = this._calculateExperienceScore(answers);

      this.jobStore.set(jobId, { status: "processing", progress: 70, userId });

      // Store results — use raw SQL for pgvector column
      await this.prisma.skillAssessment.update({
        where: { userId_teamId: { userId, teamId } },
        data: {
          experienceScore,
          reliabilityScore: 75,
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
        reliabilityScore: 75,
        recommendedRoles: this._recommendRoles(skillVector),
        positionPrediction: this._predictPosition(skillVector),
      };

      this.jobStore.set(jobId, { status: "done", progress: 100, result, userId });
    } catch (err) {
      console.error("Survey processing error:", err);
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
      : this._calculateSkillVector(answers);

    return {
      userId,
      skillVector,
      experienceScore: assessment.experienceScore ?? 0,
      reliabilityScore: assessment.reliabilityScore ?? 0,
      recommendedRoles: this._recommendRoles(skillVector),
      positionPrediction: this._predictPosition(skillVector),
    };
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

  private _predictPosition(skillVector: Record<string, number>): string {
    const positionMap: Record<string, string> = {
      backend: "백엔드 개발자",
      frontend: "프론트엔드 개발자",
      database: "데이터 엔지니어",
      devops: "DevOps 엔지니어",
      aiMl: "AI 엔지니어",
      design: "디자이너",
    };

    const entries = Object.entries(skillVector).filter(([, v]) => v > 0);
    if (entries.length === 0) return "풀스택 개발자";

    const maxScore = Math.max(...entries.map(([, v]) => v));
    const topEntries = entries.filter(([, v]) => v === maxScore);

    // Multiple top scores → 풀스택
    if (topEntries.length >= 3) return "풀스택 개발자";

    // Two top scores → check if backend+frontend combo
    if (topEntries.length === 2) {
      const keys = topEntries.map(([k]) => k).sort();
      if (keys.includes("backend") && keys.includes("frontend")) {
        return "풀스택 개발자";
      }
    }

    return positionMap[topEntries[0][0]] ?? "풀스택 개발자";
  }
}
