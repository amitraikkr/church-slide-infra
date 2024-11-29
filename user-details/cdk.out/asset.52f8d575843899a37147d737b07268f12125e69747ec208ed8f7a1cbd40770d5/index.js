const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        // Get userId (email) from path parameters
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

        // First, get the user to return their details in the response
        const { Item } = await docClient.send(
            new GetCommand({
                TableName: process.env.USERS_TABLE_NAME,
                Key: {
                    userId: userId
                }
            })
        );

        if (!Item) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                    message: 'User not found'
                })
            };
        }

        // Delete the user
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

        // Return the deleted user's data
        const deletedUserData = {
            userId: Item.userId,
            email: Item.email,
            name: Item.name,
            subscriptionStatus: Item.subscriptionStatus,
            subscriptionTier: Item.subscriptionTier,
            subscriptionStartDate: Item.subscriptionStartDate,
            subscriptionEndDate: Item.subscriptionEndDate,
            subscriptionAutoRenew: Item.subscriptionAutoRenew,
            downloadCount: Item.downloadCount,
            accountStatus: Item.accountStatus,
            createdAt: Item.createdAt,
            updatedAt: Item.updatedAt
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'User deleted successfully',
                deletedUser: deletedUserData
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