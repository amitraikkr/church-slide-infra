const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const userId = 'user_' + Date.now(); // Simple ID generation

        const item = {
            userId: body.email,                   // Primary key, unique identifier
            email: body.email,               // Secondary index for lookups
            name: body.name,      // Should be hashed in production!
            
            // Subscription related fields
            subscriptionStatus: 'FREE',      // Possible values: FREE, BASIC, PREMIUM, CANCELLED
            subscriptionTier: 'FREE',        // Possible values: FREE, BASIC, PREMIUM
            subscriptionStartDate: null,     // Will be set when user subscribes
            subscriptionEndDate: null,       // Will be set based on subscription period
            subscriptionAutoRenew: false,    // Boolean for auto-renewal status
            downloadCount: 0,
            accountStatus: 'ACTIVE',         // ACTIVE, SUSPENDED, DELETED
            
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            
        };


        await docClient.send(
            new PutCommand({
                TableName: process.env.USERS_TABLE_NAME,
                Item: item,
                // Ensure email is unique
                ConditionExpression: 'attribute_not_exists(email)',
            })
        );

        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: 'User created successfully',
                userId: userId
            })
        };
    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: error.name === 'ConditionalCheckFailedException' ? 409 : 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: error.name === 'ConditionalCheckFailedException' 
                    ? 'Email already exists' 
                    : 'Internal server error'
            })
        };
    }
};