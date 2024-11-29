const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    UpdateCommand,
    GetCommand 
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USERS_TABLE_NAME;

const updateSubscription = async (userId, subscriptionDetails) => {
    try {
        // First check if user exists
        const getUserCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId }
        });
        
        const userData = await docClient.send(getUserCommand);

        if (!userData.Item) {
            throw new Error('User not found');
        }

        const now = new Date();
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setDate(now.getDate() + 30);

        // Prepare subscription update
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
                    updatedAt = :updatedAt
            `,
            ExpressionAttributeValues: {
                ':status': 'ACTIVE',
                ':tier': subscriptionDetails.tier || 'MONTHLY',
                ':startDate': now.toISOString(),
                ':endDate': subscriptionEndDate.toISOString(),
                ':autoRenew': true,
                ':isSubscribed': true,
                ':updatedAt': now.toISOString()
            },
            ReturnValues: 'ALL_NEW'
        });

        const result = await docClient.send(updateCommand);

        return {
            statusCode: 200,
            body: {
                message: 'Subscription updated successfully',
                subscription: {
                    status: 'ACTIVE',
                    tier: subscriptionDetails.tier || 'MONTHLY',
                    startDate: now.toISOString(),
                    endDate: subscriptionEndDate.toISOString(),
                    autoRenew: true
                },
                userId: userId,
                updatedAt: now.toISOString()
            }
        };

    } catch (error) {
        console.error('Error updating subscription:', error);
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

        const { userId, subscriptionDetails } = JSON.parse(event.body);
        
        if (!userId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'userId is required' })
            };
        }

        // Validate subscription details
        if (!subscriptionDetails) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'subscriptionDetails are required' })
            };
        }

        const result = await updateSubscription(userId, subscriptionDetails);

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