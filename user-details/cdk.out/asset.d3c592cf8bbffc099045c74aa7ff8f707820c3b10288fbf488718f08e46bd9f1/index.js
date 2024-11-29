const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    // Handle both single user and all users requests
    if (event.pathParameters && event.pathParameters.userId) {
      // Get single user
      const { userId } = event.pathParameters;
      
      const params = {
        TableName: process.env.USERS_TABLE_NAME,
        Key: { userId }
      };

      const result = await dynamoDB.get(params).promise();

      if (!result.Item) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(result.Item)
      };

    } else {
      // Get all users (with pagination)
      const limit = event.queryStringParameters?.limit || 50;
      const startKey = event.queryStringParameters?.startKey;

      const params = {
        TableName: process.env.USERS_TABLE_NAME,
        Limit: limit
      };

      if (startKey) {
        params.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey));
      }

      const result = await dynamoDB.scan(params).promise();

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          users: result.Items,
          lastEvaluatedKey: result.LastEvaluatedKey
        })
      };
    }

  } catch (error) {
    console.error('Error getting user(s):', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Could not retrieve user(s)' })
    };
  }
};