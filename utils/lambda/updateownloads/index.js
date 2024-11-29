const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    GetCommand, 
    UpdateCommand 
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USERS_TABLE_NAME;

const updateDownloadCount = async (userId) => {
    const now = new Date().toISOString();
    
    try {
        // First get the current user data
        const getUserCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId }
        });
        
        const userData = await docClient.send(getUserCommand);
        
        // Initialize default values if user doesn't exist
        const currentCount = userData.Item?.downloadCount || 0;
        const newCount = currentCount + 1;

        // Update or create user record
        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { userId },
            UpdateExpression: 'SET downloadCount = :count, lastDownloadDate = :date, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':count': newCount,
                ':date': now,
                ':updatedAt': now
            },
            ReturnValues: 'ALL_NEW'
        });

        const result = await docClient.send(updateCommand);

        return {
            statusCode: 200,
            body: {
                userId,
                downloadCount: newCount,
                lastDownloadDate: now
            }
        };

    } catch (error) {
        console.error('Error updating download count:', error);
        throw error;
    }
};

exports.handler = async (event) => {
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

        const result = await updateDownloadCount(userId);

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

        return {
            statusCode: error.statusCode || 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                error: error.message || 'Internal server error',
                timestamp: new Date().toISOString()
            })
        };
    }
};