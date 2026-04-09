/**
 * E2E 테스트용 DB seed.
 * Prisma client로 직접 데이터 삽입 (NextAuth 우회).
 * 실행: npx tsx tests/e2e/helpers/seed.ts
 */
import { PrismaClient } from '../../../apps/api/generated/prisma';
import { USERS } from '../fixtures/users';
import { TEAMS } from '../fixtures/teams';
import { SURVEY_TEMPLATES, USER_SURVEY_MAP } from '../fixtures/survey-answers';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data...');

  // 1. Clean existing data (역순 cascade)
  await prisma.ideaReaction.deleteMany();
  await prisma.ideaBuildOnEdge.deleteMany();
  await prisma.brainstormIdea.deleteMany();
  await prisma.brainstormSession.deleteMany();
  await prisma.kickoffReaction.deleteMany();
  await prisma.kickoffTopic.deleteMany();
  await prisma.kickoffTopicJob.deleteMany();
  await prisma.surveyResponse.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create 20 users
  for (const u of USERS) {
    await prisma.user.create({
      data: { id: u.id, email: u.email, name: u.name },
    });
  }
  console.log(`  ✓ ${USERS.length} users created`);

  // 3. Create 5 teams + memberships (with Team Context — KF-036~KF-040)
  for (const [key, team] of Object.entries(TEAMS)) {
    await prisma.team.create({
      data: {
        id: team.id,
        name: team.name,
        inviteCode: team.inviteCode,
        teamType: team.context.teamType,
        projectDuration: team.context.projectDuration,
        completionTarget: team.context.completionTarget,
        hasNonDeveloper: team.context.hasNonDeveloper,
        usesVibeCoding: team.context.usesVibeCoding,
        hasSkillGap: team.context.hasSkillGap,
        domainHints: team.context.domainHints as string[],
      },
    });

    // Leader
    await prisma.teamMembership.create({
      data: { teamId: team.id, userId: team.leader.id, role: 'leader' },
    });

    // Members
    for (const m of team.members) {
      await prisma.teamMembership.create({
        data: { teamId: team.id, userId: m.id, role: 'member' },
      });
    }

    // Observers
    for (const o of team.observers) {
      await prisma.teamMembership.create({
        data: { teamId: team.id, userId: o.id, role: 'observer' },
      });
    }

    console.log(`  ✓ Team ${key}: ${team.name} (${1 + team.members.length + team.observers.length} members)`);
  }

  // 4. Submit surveys for Team A (all non-observer members)
  const teamA = TEAMS.A;
  const teamAMembers = [teamA.leader, ...teamA.members];
  for (const m of teamAMembers) {
    const templateKey = USER_SURVEY_MAP[m.id];
    if (!templateKey) continue;
    const answers = SURVEY_TEMPLATES[templateKey];
    await prisma.surveyResponse.create({
      data: {
        teamId: teamA.id,
        userId: m.id,
        answers: answers as any,
        submitted: true,
        submittedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ Team A surveys submitted (${teamAMembers.length} responses)`);

  // 5. Submit surveys for Team B (all non-observer members)
  const teamB = TEAMS.B;
  const teamBMembers = [teamB.leader, ...teamB.members];
  for (const m of teamBMembers) {
    const templateKey = USER_SURVEY_MAP[m.id];
    if (!templateKey) continue;
    const answers = SURVEY_TEMPLATES[templateKey];
    await prisma.surveyResponse.create({
      data: {
        teamId: teamB.id,
        userId: m.id,
        answers: answers as any,
        submitted: true,
        submittedAt: new Date(),
      },
    });
  }
  console.log(`  ✓ Team B surveys submitted (${teamBMembers.length} responses)`);

  // 6. Create brainstorm session for Team A (phase: ideation)
  const session = await prisma.brainstormSession.create({
    data: {
      teamId: teamA.id,
      phase: 'ideation',
      startedAt: new Date(),
    },
  });

  // Create sample ideas for Team A
  const ideas = [
    { userId: teamA.leader.id, title: '실시간 코드 에디터', description: '브라우저 기반 코드 편집기' },
    { userId: teamA.members[0]!.id, title: 'AI 코드 리뷰 봇', description: 'PR 자동 리뷰 시스템' },
    { userId: teamA.members[1]!.id, title: '팀 매칭 플랫폼', description: '프로젝트 팀원 자동 매칭' },
  ];
  for (const idea of ideas) {
    await prisma.brainstormIdea.create({
      data: {
        sessionId: session.id,
        userId: idea.userId,
        title: idea.title,
        description: idea.description,
        type: 'original',
      },
    });
  }
  console.log(`  ✓ Team A brainstorm session + ${ideas.length} ideas`);

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
