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
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    try {
        // First get the current user data
        const getUserCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId }
        });
        
        const userData = await docClient.send(getUserCommand);

        if (!userData.Item) {
            throw new Error('User not found');
        }

        // Initialize or clean up downloads array
        let downloads = userData.Item.downloads || [];
        
        // Remove downloads older than one month
        downloads = downloads.filter(download => 
            new Date(download.date) > oneMonthAgo
        );

        // Add new download
        downloads.push({
            date: now,
            timestamp: Date.now()
        });

        // Update user record
        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { userId },
            UpdateExpression: 'SET downloads = :downloads, updatedAt = :updatedAt',
            ExpressionAttributeValues: {
                ':downloads': downloads,
                ':updatedAt': now
            },
            ReturnValues: 'ALL_NEW'
        });

        const result = await docClient.send(updateCommand);

        // Calculate remaining downloads
        const downloadsThisMonth = downloads.length;
        const remainingDownloads = userData.Item.isSubscribed ? 
            'unlimited' : Math.max(0, 3 - downloadsThisMonth);

        return {
            statusCode: 200,
            body: {
                downloads: downloads,
                remainingDownloads,
                isSubscribed: userData.Item.isSubscribed,
                nextAvailableDate: downloadsThisMonth >= 3 ? 
                    new Date(downloads[0].date).toISOString() : null
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