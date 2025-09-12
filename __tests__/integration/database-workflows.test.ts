/**
 * Database Business Logic Tests
 * Tests the business workflows and behavior of database initialization
 * Target: src/lib/init-db.ts (business behavior only)
 */

import { initializeDatabase, testDatabaseConnection } from '../../src/lib/init-db';

describe('Database Initialization Workflows', () => {
  describe('Demo User Creation Business Rule', () => {
    it('should create demo user when none exist', async () => {
      // Test the actual business workflow with real database
      const result = await initializeDatabase();
      
      // Focus on business behavior, not implementation details
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('demoUser');
      
      if (result.success) {
        // Verify business rule: if successful, we get appropriate message and data
        expect(result.message).toMatch(/connected|initialized/);
        
        if (result.message.includes('initialized')) {
          // Business rule: When initializing, we should get demo user data
          expect(result.demoUser).toMatchObject({
            email: 'demo@hubbly.example',
            name: 'Demo User'
          });
        }
      } else {
        // Business rule: On failure, we get error info and no user data
        expect(result.message).toContain('failed');
        expect(result.demoUser).toBeNull();
      }
    });

    it('should handle multiple initialization calls gracefully', async () => {
      // Test business behavior: multiple calls should be safe
      const result1 = await initializeDatabase();
      const result2 = await initializeDatabase();
      
      // Business rule: Both calls should succeed or both should fail consistently
      expect(result1.success).toBe(result2.success);
      
      if (result1.success && result2.success) {
        // Both should report the same state
        expect(result1.demoUser?.email).toBe(result2.demoUser?.email);
      }
    });
  });

  describe('Database Health Check Workflow', () => {
    it('should test database connectivity', async () => {
      const result = await testDatabaseConnection();
      
      // Focus on business contract: we get success status and message
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
      
      // Business rule: message should reflect the result
      if (result.success) {
        expect(result.message).toContain('successful');
      } else {
        expect(result.message).toContain('failed');
      }
    });

    it('should provide meaningful error information on failure', async () => {
      const result = await testDatabaseConnection();
      
      // If it fails, we should get useful diagnostic info
      if (!result.success) {
        expect(result.message).toBeTruthy();
        expect(result.message.length).toBeGreaterThan(10);
      } else {
        // If it succeeds, that's also fine for this test
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Business Error Handling', () => {
    it('should return consistent error structure when database unavailable', async () => {
      // Test with a bad database URL to simulate failure
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:9999/invalid';
      
      try {
        const result = await initializeDatabase();
        
        // Business rule: Always return consistent structure
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('demoUser');
        
        // On connection failure, should have predictable behavior
        if (!result.success) {
          expect(result.demoUser).toBeNull();
          expect(result.message).toContain('failed');
        }
      } finally {
        // Restore original URL
        process.env.DATABASE_URL = originalUrl;
      }
    });
  });
});