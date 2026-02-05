const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test users
  console.log('👥 Creating users...')
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        email: 'alice@example.com',
        name: 'Alice Johnson'
      }
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        email: 'bob@example.com',
        name: 'Bob Smith'
      }
    }),
    prisma.user.upsert({
      where: { email: 'charlie@example.com' },
      update: {},
      create: {
        email: 'charlie@example.com',
        name: 'Charlie Brown'
      }
    })
  ])

  console.log('📋 Creating Q&A sessions...')
  const sessions = await Promise.all([
    prisma.qaSession.create({
      data: {
        title: 'Product Launch Q&A',
        description: 'Questions about our upcoming product launch',
        code: 'ABC123',
        hostId: users[0].id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    }),
    prisma.qaSession.create({
      data: {
        title: 'Team All Hands',
        description: 'Monthly team meeting questions',
        code: 'XYZ789',
        hostId: users[1].id,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 hours
      }
    }),
    prisma.qaSession.create({
      data: {
        title: 'Customer Feedback Session',
        description: 'Gathering customer feedback',
        code: 'DEF456',
        hostId: users[2].id,
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
      }
    })
  ])

  console.log('❓ Creating questions...')
  const questions = await Promise.all([
    prisma.question.create({
      data: {
        content: 'When will the new feature be available?',
        sessionId: sessions[0].id,
        authorName: 'Anonymous',
        voteCount: 5,
        status: 'pending'
      }
    }),
    prisma.question.create({
      data: {
        content: 'What are the pricing details?',
        sessionId: sessions[0].id,
        authorName: 'John Doe',
        voteCount: 12,
        status: 'approved'
      }
    }),
    prisma.question.create({
      data: {
        content: 'Will there be remote work options?',
        sessionId: sessions[1].id,
        authorName: 'Sarah Wilson',
        voteCount: 8,
        status: 'pending'
      }
    }),
    prisma.question.create({
      data: {
        content: 'What about the budget for next quarter?',
        sessionId: sessions[1].id,
        authorName: null, // Anonymous
        voteCount: 3,
        status: 'answered'
      }
    }),
    prisma.question.create({
      data: {
        content: 'How can we improve the user experience?',
        sessionId: sessions[2].id,
        authorName: 'Customer A',
        voteCount: 15,
        status: 'approved'
      }
    })
  ])

  console.log('🗳️  Creating votes...')
  await Promise.all([
    prisma.vote.create({
      data: {
        questionId: questions[0].id,
        participantId: 'participant-1'
      }
    }),
    prisma.vote.create({
      data: {
        questionId: questions[0].id,
        participantId: 'participant-2'
      }
    }),
    prisma.vote.create({
      data: {
        questionId: questions[1].id,
        participantId: 'participant-1'
      }
    }),
    prisma.vote.create({
      data: {
        questionId: questions[4].id,
        participantId: 'participant-3'
      }
    })
  ])

  // Verify seed data
  const counts = {
    users: await prisma.user.count(),
    sessions: await prisma.qaSession.count(),
    questions: await prisma.question.count(),
    votes: await prisma.vote.count()
  }

  console.log('✅ Seed data created successfully:')
  console.log(`   Users: ${counts.users}`)
  console.log(`   Sessions: ${counts.sessions}`)
  console.log(`   Questions: ${counts.questions}`)
  console.log(`   Votes: ${counts.votes}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })