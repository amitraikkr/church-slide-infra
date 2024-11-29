const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  try {
    const { userId } = event.pathParameters;
    const updates = JSON.parse(event.body);
    
    // Build update expression
    let UpdateExpression = 'SET updatedAt = :updatedAt';
    const ExpressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };
    const ExpressionAttributeNames = {};

    // Dynamically add fields to update
    Object.keys(updates).forEach((key, index) => {
      if (key !== 'userId') { // Prevent updating userId
        UpdateExpression += `, #field${index} = :value${index}`;
        ExpressionAttributeNames[`#field${index}`] = key;
        ExpressionAttributeValues[`:value${index}`] = updates[key];
      }
    });

    const params = {
      TableName: process.env.USERS_TABLE_NAME,
      Key: { userId },
      UpdateExpression,
      ExpressionAttributeValues,
      ExpressionAttributeNames,
      ReturnValues: 'ALL_NEW',
      ConditionExpression: 'attribute_exists(userId)'
    };

    const result = await dynamoDB.update(params).promise();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'User updated successfully',
        user: result.Attributes
      })
    };

  } catch (error) {
    console.error('Error updating user:', error);

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
      body: JSON.stringify({ error: 'Could not update user' })
    };
  }
};