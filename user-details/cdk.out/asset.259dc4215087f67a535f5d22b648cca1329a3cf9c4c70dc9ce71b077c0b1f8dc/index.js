const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const userId = event.pathParameters.userId;
        const body = JSON.parse(event.body);

        if (!userId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'userId is required'
                })
            };
        }

        // Build update expression and attribute values dynamically
        const updateFields = {};
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        const updateExpressions = [];

        // Only include fields that are present in the request
        if (body.firstName) {
            updateFields.firstName = body.firstName;
            updateExpressions.push('#firstName = :firstName');
            expressionAttributeNames['#firstName'] = 'firstName';
            expressionAttributeValues[':firstName'] = body.firstName;
        }
        if (body.lastName) {
            updateFields.lastName = body.lastName;
            updateExpressions.push('#lastName = :lastName');
            expressionAttributeNames['#lastName'] = 'lastName';
            expressionAttributeValues[':lastName'] = body.lastName;
        }
        if (body.email) {
            updateFields.email = body.email;
            updateExpressions.push('#email = :email');
            expressionAttributeNames['#email'] = 'email';
            expressionAttributeValues[':email'] = body.email;
        }
        if (body.password) {
            updateFields.password = body.password; // In production, hash this password!
            updateExpressions.push('#password = :password');
            expressionAttributeNames['#password'] = 'password';
            expressionAttributeValues[':password'] = body.password;
        }

        if (Object.keys(updateFields).length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'No fields to update'
                })
            };
        }

        const updateExpression = 'SET ' + updateExpressions.join(', ');

        await docClient.send(
            new UpdateCommand({
                TableName: process.env.USERS_TABLE_NAME,
                Key: {
                    userId: userId
                },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ConditionExpression: 'attribute_exists(userId)',
                ReturnValues: 'ALL_NEW'
            })
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'User updated successfully',
                updatedFields: updateFields
            })
        };
    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: error.name === 'ConditionalCheckFailedException' ? 404 : 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: error.name === 'ConditionalCheckFailedException' 
                    ? 'User not found' 
                    : 'Internal server error'
            })
        };
    }
};