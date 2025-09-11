import { prisma } from './db'

export async function initializeDatabase() {
  try {
    // Test database connection by creating a demo user if none exist
    const userCount = await prisma.user.count()
    
    if (userCount === 0) {
      const demoUser = await prisma.user.create({
        data: {
          email: 'demo@hubbly.example',
          name: 'Demo User',
          image: 'https://via.placeholder.com/100x100?text=Demo'
        }
      })
      
      console.log('✅ Database initialized with demo user:', demoUser.id)
      return { 
        success: true, 
        message: 'Database connected and initialized with demo data',
        demoUser 
      }
    }
    
    const demoUser = await prisma.user.findFirst({
      where: { email: 'demo@hubbly.example' }
    })
    
    console.log('✅ Database connection verified')
    return { 
      success: true, 
      message: 'Database connected successfully',
      demoUser 
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    return { 
      success: false, 
      message: `Database connection failed: ${error}`,
      demoUser: null 
    }
  }
}

export async function testDatabaseConnection() {
  try {
    await prisma.$connect()
    const result = await prisma.$queryRaw`SELECT 1 as test`
    await prisma.$disconnect()
    
    console.log('✅ Database connection test passed')
    return { success: true, message: 'Database connection successful' }
  } catch (error) {
    console.error('❌ Database connection test failed:', error)
    return { success: false, message: `Database connection failed: ${error}` }
  }
}