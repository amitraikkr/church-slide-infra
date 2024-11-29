const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        // Get userId from path parameters
        const userId = event.pathParameters.userId;

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

        await docClient.send(
            new DeleteCommand({
                TableName: process.env.USERS_TABLE_NAME,
                Key: {
                    userId: userId
                },
                // Ensure the item exists before deletion
                ConditionExpression: 'attribute_exists(userId)'
            })
        );

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'User deleted successfully'
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