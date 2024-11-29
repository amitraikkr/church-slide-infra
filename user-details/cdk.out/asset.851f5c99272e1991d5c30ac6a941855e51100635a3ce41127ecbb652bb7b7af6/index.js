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

        // Only include fields that are present in the request and match our schema
        if (body.name) {
            updateFields.name = body.name;
            updateExpressions.push('#name = :name');
            expressionAttributeNames['#name'] = 'name';
            expressionAttributeValues[':name'] = body.name;
        }
        if (body.email) {
            updateFields.email = body.email;
            updateExpressions.push('#email = :email');
            expressionAttributeNames['#email'] = 'email';
            expressionAttributeValues[':email'] = body.email;
        }
        if (body.subscriptionStatus) {
            updateFields.subscriptionStatus = body.subscriptionStatus;
            updateExpressions.push('#subscriptionStatus = :subscriptionStatus');
            expressionAttributeNames['#subscriptionStatus'] = 'subscriptionStatus';
            expressionAttributeValues[':subscriptionStatus'] = body.subscriptionStatus;
        }
        if (body.subscriptionTier) {
            updateFields.subscriptionTier = body.subscriptionTier;
            updateExpressions.push('#subscriptionTier = :subscriptionTier');
            expressionAttributeNames['#subscriptionTier'] = 'subscriptionTier';
            expressionAttributeValues[':subscriptionTier'] = body.subscriptionTier;
        }
        if (body.subscriptionStartDate) {
            updateFields.subscriptionStartDate = body.subscriptionStartDate;
            updateExpressions.push('#subscriptionStartDate = :subscriptionStartDate');
            expressionAttributeNames['#subscriptionStartDate'] = 'subscriptionStartDate';
            expressionAttributeValues[':subscriptionStartDate'] = body.subscriptionStartDate;
        }
        if (body.subscriptionEndDate) {
            updateFields.subscriptionEndDate = body.subscriptionEndDate;
            updateExpressions.push('#subscriptionEndDate = :subscriptionEndDate');
            expressionAttributeNames['#subscriptionEndDate'] = 'subscriptionEndDate';
            expressionAttributeValues[':subscriptionEndDate'] = body.subscriptionEndDate;
        }
        if (body.subscriptionAutoRenew !== undefined) {
            updateFields.subscriptionAutoRenew = body.subscriptionAutoRenew;
            updateExpressions.push('#subscriptionAutoRenew = :subscriptionAutoRenew');
            expressionAttributeNames['#subscriptionAutoRenew'] = 'subscriptionAutoRenew';
            expressionAttributeValues[':subscriptionAutoRenew'] = body.subscriptionAutoRenew;
        }
        if (body.downloadCount !== undefined) {
            updateFields.downloadCount = body.downloadCount;
            updateExpressions.push('#downloadCount = :downloadCount');
            expressionAttributeNames['#downloadCount'] = 'downloadCount';
            expressionAttributeValues[':downloadCount'] = body.downloadCount;
        }
        if (body.accountStatus) {
            updateFields.accountStatus = body.accountStatus;
            updateExpressions.push('#accountStatus = :accountStatus');
            expressionAttributeNames['#accountStatus'] = 'accountStatus';
            expressionAttributeValues[':accountStatus'] = body.accountStatus;
        }

        // Always update the updatedAt timestamp
        updateFields.updatedAt = new Date().toISOString();
        updateExpressions.push('#updatedAt = :updatedAt');
        expressionAttributeNames['#updatedAt'] = 'updatedAt';
        expressionAttributeValues[':updatedAt'] = updateFields.updatedAt;

        if (Object.keys(updateFields).length === 1 && updateFields.updatedAt) {
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