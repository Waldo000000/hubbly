import { NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/init-db'

export async function GET() {
  try {
    // Test database connection and verify/initialize dummy data
    const dbResult = await initializeDatabase()
    
    if (dbResult.success) {
      return NextResponse.json({
        status: 'ok',
        nextjs: 'ok',
        database: {
          success: true,
          message: dbResult.message,
          demoUser: dbResult.demoUser ? {
            id: dbResult.demoUser.id,
            email: dbResult.demoUser.email,
            name: dbResult.demoUser.name
          } : null
        },
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        status: 'error',
        nextjs: 'ok',
        database: {
          success: false,
          message: dbResult.message
        },
        timestamp: new Date().toISOString()
      }, { status: 503 })
    }
  } catch (error) {
    console.error('Database health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      nextjs: 'ok',
      database: {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      timestamp: new Date().toISOString()
    }, { status: 503 })
  }
}