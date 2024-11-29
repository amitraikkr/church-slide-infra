const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

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

        // Return user data with all relevant fields
        const userData = {
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
            body: JSON.stringify(userData)
        };
    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'Internal server error'
            })
        };
    }
};