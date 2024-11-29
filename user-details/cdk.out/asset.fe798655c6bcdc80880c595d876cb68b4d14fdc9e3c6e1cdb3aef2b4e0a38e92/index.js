const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    // Parse the incoming request body
    const user = JSON.parse(event.body);
    
    // Validate required fields
    if (!user.userId || !user.email) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*' // Configure for your domain
        },
        body: JSON.stringify({ error: 'userId and email are required' })
      };
    }

    const params = {
      TableName: process.env.USERS_TABLE_NAME,
      Item: {
        userId: user.userId,
        email: user.email,
        subscription: user.subscription || 'free',
        preferences: user.preferences || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Prevent overwriting existing user
      ConditionExpression: 'attribute_not_exists(userId)'
    };

    await dynamoDB.put(params).promise();

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        message: 'User created successfully',
        user: params.Item 
      })
    };

  } catch (error) {
    console.error('Error creating user:', error);

    if (error.code === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'User already exists' })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Could not create user' })
    };
  }
};