const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { userId } = event.pathParameters;

    const params = {
      TableName: process.env.USERS_TABLE_NAME,
      Key: { userId },
      ConditionExpression: 'attribute_exists(userId)',
      ReturnValues: 'ALL_OLD'
    };

    const result = await dynamoDB.delete(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'User deleted successfully',
        deletedUser: result.Attributes
      })
    };

  } catch (error) {
    console.error('Error deleting user:', error);

    if (error.code === 'ConditionalCheckFailedException') {
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
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Could not delete user' })
    };
  }
};