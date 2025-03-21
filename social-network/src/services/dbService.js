import { Pool } from 'pg';

// PostgreSQL connection configuration
const pgConfig = {
  host: 'postgres-db-service', // Kubernetes service name
  port: 5432,
  database: 'social_network',
  user: 'postgres',
  password: 'password',
  // Additional connection settings
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Maximum idle time for connections
  connectionTimeoutMillis: 2000, // Connection timeout
  statement_timeout: 5000, // Query timeout
};

// Create connection pool
let pool;
try {
  pool = new Pool(pgConfig);
  console.log('PostgreSQL connection pool initialized');
} catch (error) {
  console.error('Failed to initialize PostgreSQL connection pool:', error);
  // Create an empty mock pool if initialization fails
  pool = {
    query: async () => { throw new Error('PostgreSQL connection not available'); },
    on: () => {}
  };
}

// Initialize connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('PostgreSQL connection error:', err);
});

// Maximum number of retries
const MAX_RETRIES = 3;

/**
 * Execute query with retry functionality
 * @param {string} queryText - SQL query
 * @param {Array} params - Query parameters
 * @param {number} retries - Current retry count
 * @returns {Promise<Object>} - Query result
 */
const executeQueryWithRetry = async (queryText, params, retries = 0) => {
  try {
    return await pool.query(queryText, params);
  } catch (error) {
    // If it's a connection error and we haven't reached the maximum retry count
    if ((error.code === 'ECONNREFUSED' || error.code === '57P01' || error.code === '08006') && retries < MAX_RETRIES) {
      console.log(`Retrying PostgreSQL query, attempt ${retries + 1}/${MAX_RETRIES}`);
      
      // Delay retry to avoid overloading the server
      await new Promise(resolve => setTimeout(resolve, 1000 * (retries + 1)));
      
      return executeQueryWithRetry(queryText, params, retries + 1);
    }
    
    // If max retries reached or it's another type of error, throw
    throw error;
  }
};

/**
 * Save user information to PostgreSQL database
 * @param {string} id - User ID (from Firebase Auth)
 * @param {string} email - User email
 * @returns {Promise<boolean>} - Whether the operation was successful
 */
export const saveUserToPostgres = async (id, email) => {
  if (!id || !email) {
    console.error('Invalid user data for PostgreSQL backup');
    return false;
  }

  try {
    console.log(`Saving user to PostgreSQL backup: ${id}`);
    
    // Check if user already exists
    const checkQuery = 'SELECT id FROM users WHERE id = $1';
    const checkResult = await executeQueryWithRetry(checkQuery, [id]);
    
    if (checkResult.rowCount > 0) {
      // User exists, update record
      const updateQuery = 'UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';
      await executeQueryWithRetry(updateQuery, [email, id]);
      console.log(`User updated in PostgreSQL backup: ${id}`);
    } else {
      // Create new user record
      const insertQuery = 'INSERT INTO users (id, email) VALUES ($1, $2)';
      await executeQueryWithRetry(insertQuery, [id, email]);
      console.log(`User created in PostgreSQL backup: ${id}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving user to PostgreSQL:', error);
    return false;
  }
};

/**
 * Get user information from PostgreSQL
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} - User data or null
 */
export const getUserFromPostgres = async (id) => {
  if (!id) {
    console.error('Invalid user ID for PostgreSQL lookup');
    return null;
  }
  
  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await executeQueryWithRetry(query, [id]);
    
    if (result.rowCount > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user from PostgreSQL:', error);
    return null;
  }
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} - User data or null
 */
export const findUserByEmail = async (email) => {
  if (!email) {
    console.error('Invalid email for PostgreSQL lookup');
    return null;
  }
  
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await executeQueryWithRetry(query, [email]);
    
    if (result.rowCount > 0) {
      return result.rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error finding user by email in PostgreSQL:', error);
    return null;
  }
};

/**
 * Check database connection status
 * @returns {Promise<boolean>} Whether connection is healthy
 */
export const checkDatabaseConnection = async () => {
  try {
    await executeQueryWithRetry('SELECT NOW()', []);
    return true;
  } catch (error) {
    console.error('PostgreSQL connection check failed:', error);
    return false;
  }
};

/**
 * Clean up connection pool
 * Call this before application exit to properly close all connections
 */
export const closeConnectionPool = async () => {
  try {
    console.log('Closing PostgreSQL connection pool');
    await pool.end();
    console.log('PostgreSQL connection pool closed successfully');
    return true;
  } catch (error) {
    console.error('Error closing PostgreSQL connection pool:', error);
    return false;
  }
};

/**
 * Bulk save user data
 * @param {Array<{id: string, email: string}>} users - Array of users
 * @returns {Promise<number>} - Number of successfully saved users
 */
export const bulkSaveUsers = async (users) => {
  if (!Array.isArray(users) || users.length === 0) {
    console.error('Invalid user array for bulk save');
    return 0;
  }
  
  let successCount = 0;
  
  try {
    // Use transaction for bulk insert/update
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const user of users) {
        if (!user.id || !user.email) continue;
        
        // Use ON CONFLICT for upsert operation
        const query = `
          INSERT INTO users (id, email) 
          VALUES ($1, $2)
          ON CONFLICT (id) 
          DO UPDATE SET 
            email = EXCLUDED.email,
            updated_at = CURRENT_TIMESTAMP
        `;
        
        await client.query(query, [user.id, user.email]);
        successCount++;
      }
      
      await client.query('COMMIT');
      console.log(`Bulk saved ${successCount}/${users.length} users to PostgreSQL`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error in bulk save transaction:', error);
      throw error;
    } finally {
      client.release();
    }
    
    return successCount;
  } catch (error) {
    console.error('Error in bulkSaveUsers:', error);
    return successCount;
  }
};

export default {
  pool,
  saveUserToPostgres,
  getUserFromPostgres,
  findUserByEmail,
  checkDatabaseConnection,
  closeConnectionPool,
  bulkSaveUsers
}; 