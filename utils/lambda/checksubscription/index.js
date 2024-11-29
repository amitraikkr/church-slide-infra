const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
    DynamoDBDocumentClient, 
    GetCommand 
} = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.USERS_TABLE_NAME;

const checkDownloadEligibility = async (userId) => {
    try {
        // Get the user data
        const getUserCommand = new GetCommand({
            TableName: TABLE_NAME,
            Key: { userId }
        });
        
        const userData = await docClient.send(getUserCommand);
        
        // If user doesn't exist, they can download
        if (!userData.Item) {
            return true;
        }

        const { subscriptionStatus, downloadCount = 0, lastDownloadDate } = userData.Item;

        // If user is not on FREE plan, they can download
        if (subscriptionStatus !== 'FREE') {
            return true;
        }

        // If download count is less than 3, they can download
        if (downloadCount < 3) {
            return true;
        }

        // If no last download date, they can download
        if (!lastDownloadDate) {
            return true;
        }

        // Check if last download was within 30 days
        const lastDownloadTime = new Date(lastDownloadDate).getTime();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // If last download was more than 30 days ago, they can download
        if (lastDownloadTime < thirtyDaysAgo.getTime()) {
            return true;
        }

        // If we get here, user is on FREE plan, has 3+ downloads in last 30 days
        return false;
    } catch (error) {
        console.error('Error checking download eligibility:', error);
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

        const canDownload = await checkDownloadEligibility(userId);

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                canDownload,
                userId
            })
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