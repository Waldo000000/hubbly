'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useEffect } from 'react'

export default function CreateSessionPage() {
  const { data: session, status } = useSession()

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn('google')
    }
  }, [status])

  if (status === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1rem',
            color: '#333' 
          }}>
            Loading...
          </div>
          <div style={{ color: '#666' }}>
            Checking authentication status
          </div>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '1.5rem', 
            marginBottom: '1rem',
            color: '#333' 
          }}>
            Authentication Required
          </div>
          <div style={{ marginBottom: '2rem', color: '#666' }}>
            Please sign in with Google to create a Q&A session
          </div>
          <button
            onClick={() => signIn('google')}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.1rem',
              backgroundColor: '#4285f4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: '0 auto'
            }}
          >
            <span>🔐</span>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  // User is authenticated, show the create session page
  return (
    <main style={{ 
      padding: '2rem', 
      fontFamily: 'system-ui, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#333' }}>
          Create New Session
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#666' }}>
          Set up a Q&A session for your event or meeting
        </p>
      </div>

      {/* User info */}
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        padding: '1rem', 
        borderRadius: '8px',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {session?.user?.image && (
            <img 
              src={session?.user?.image} 
              alt="Profile" 
              style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%' 
              }} 
            />
          )}
          <div>
            <div style={{ fontWeight: 'bold', color: '#333' }}>
              {session?.user?.name}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {session?.user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9rem',
            backgroundColor: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>

      {/* Create session form */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '2rem', 
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Session Title *
            </label>
            <input
              type="text"
              placeholder="e.g., Weekly Team Meeting Q&A"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              fontWeight: 'bold',
              color: '#333'
            }}>
              Description (optional)
            </label>
            <textarea
              placeholder="Provide context for your audience about this Q&A session..."
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              backgroundColor: '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            🚀 Create Session
          </button>
        </form>
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '2rem',
        fontSize: '0.9rem',
        color: '#666'
      }}>
        ✨ NextAuth.js authentication is working!
      </div>
    </main>
  )
}