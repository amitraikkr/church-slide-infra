const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    UpdateCommand,
    GetCommand 
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USERS_TABLE_NAME;

const cancelSubscription = async (userId) => {
    try {
        // First check if user exists and is subscribed
        const getUserCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId }
        });
        
        const userData = await docClient.send(getUserCommand);

        if (!userData.Item) {
            throw new Error('User not found');
        }

        if (!userData.Item.isSubscribed) {
            throw new Error('User is not subscribed');
        }

        const now = new Date().toISOString();

        // Prepare subscription cancellation update
        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { userId },
            UpdateExpression: `
                SET subscriptionStatus = :status,
                    subscriptionTier = :tier,
                    subscriptionStartDate = :startDate,
                    subscriptionEndDate = :endDate,
                    subscriptionAutoRenew = :autoRenew,
                    isSubscribed = :isSubscribed,
                    updatedAt = :updatedAt,
                    cancellationDate = :cancellationDate
            `,
            ExpressionAttributeValues: {
                ':status': 'FREE',
                ':tier': 'FREE',
                ':startDate': null,
                ':endDate': null,
                ':autoRenew': false,
                ':isSubscribed': false,
                ':updatedAt': now,
                ':cancellationDate': now
            },
            ReturnValues: 'ALL_NEW'
        });

        const result = await docClient.send(updateCommand);

        return {
            statusCode: 200,
            body: {
                message: 'Subscription cancelled successfully',
                subscription: {
                    status: 'FREE',
                    tier: 'FREE',
                    startDate: null,
                    endDate: null,
                    autoRenew: false,
                    cancellationDate: now
                },
                userId: userId,
                updatedAt: now
            }
        };

    } catch (error) {
        console.error('Error cancelling subscription:', error);
        throw error;
    }
};

exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    try {
        // Basic validation
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing request body' })
            };
        }

        const { userId } = JSON.parse(event.body);
        
        if (!userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'userId is required' })
            };
        }

        const result = await cancelSubscription(userId);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(result.body)
        };

    } catch (error) {
        console.error('Lambda execution failed:', error);

        const errorResponse = {
            error: error.message || 'Internal server error',
            timestamp: new Date().toISOString()
        };

        // Handle specific error cases
        if (error.message === 'User not found') {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(errorResponse)
            };
        }

        if (error.message === 'User is not subscribed') {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(errorResponse)
            };
        }

        return {
            statusCode: error.statusCode || 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(errorResponse)
        };
    }
};