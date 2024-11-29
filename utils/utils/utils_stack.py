from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_iam as iam,
    aws_dynamodb as dynamodb,
    Duration,
    RemovalPolicy,
    CfnOutput
)
from constructs import Construct

class UtilsStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Reference existing DynamoDB table
        existing_table_name = "UserDetailsStack-UsersTable9725E9C8-1ULUFCS7DFRJM"
        existing_table_arn = f"arn:aws:dynamodb:{self.region}:{self.account}:table/{existing_table_name}"
        
        users_table = dynamodb.Table.from_table_arn(
            self, "ExistingUsersTable",
            table_arn=existing_table_arn
        )

        # Create IAM policy for DynamoDB access
        dynamodb_policy = iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            resources=[existing_table_arn]
        )

        # Common Lambda configuration with specific table name
        lambda_config = {
            "runtime": _lambda.Runtime.NODEJS_18_X,
            "handler": "index.handler",
            "timeout": Duration.seconds(30),
            "memory_size": 256,
            "environment": {
                "USERS_TABLE_NAME": existing_table_name
            }
        }

        # Create Lambda functions with initial policies
        update_downloads_lambda = _lambda.Function(
            self, "UpdateDownloadsFunction",
            code=_lambda.Code.from_asset("lambda/updateownloads"),
            **lambda_config
        )
        update_downloads_lambda.add_to_role_policy(dynamodb_policy)

        update_subscription_lambda = _lambda.Function(
            self, "UpdateSubscriptionFunction",
            code=_lambda.Code.from_asset("lambda/addsubscription"),
            **lambda_config
        )
        update_subscription_lambda.add_to_role_policy(dynamodb_policy)

        cancel_subscription_lambda = _lambda.Function(
            self, "CancelSubscriptionFunction",
            code=_lambda.Code.from_asset("lambda/cancelSubscription"),
            **lambda_config
        )
        cancel_subscription_lambda.add_to_role_policy(dynamodb_policy)

        check_subscription_lambda = _lambda.Function(
            self, "CheckSubscriptionFunction",
            code=_lambda.Code.from_asset("lambda/checkSubscription"),
            **lambda_config
        )
        # Read-only policy for check subscription
        check_subscription_lambda.add_to_role_policy(iam.PolicyStatement(
            effect=iam.Effect.ALLOW,
            actions=[
                "dynamodb:GetItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            resources=[existing_table_arn]
        ))

        # Create API Gateway
        api = apigw.RestApi(
            self, "SubscriptionApi",
            rest_api_name="Subscription Service API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=apigw.Cors.ALL_METHODS,
                allow_headers=[
                    "Content-Type",
                    "Authorization",
                    "X-Amz-Date",
                    "X-Api-Key",
                    "X-Amz-Security-Token"
                ],
                max_age=Duration.days(1)
            )
        )

        # Create API resources and methods
        downloads = api.root.add_resource("downloads")
        subscription = api.root.add_resource("subscription")
        cancel = subscription.add_resource("cancel")
        check_subscription = api.root.add_resource("check-subscription")

        # Add methods with Lambda integrations
        downloads.add_method(
            "POST",
            apigw.LambdaIntegration(
                update_downloads_lambda,
                proxy=True,
                integration_responses=[{
                    "statusCode": "200",
                    "responseParameters": {
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    }
                }]
            ),
            method_responses=[{
                "statusCode": "200",
                "responseParameters": {
                    "method.response.header.Access-Control-Allow-Origin": True
                }
            }]
        )

        subscription.add_method(
            "POST",
            apigw.LambdaIntegration(
                update_subscription_lambda,
                proxy=True,
                integration_responses=[{
                    "statusCode": "200",
                    "responseParameters": {
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    }
                }]
            ),
            method_responses=[{
                "statusCode": "200",
                "responseParameters": {
                    "method.response.header.Access-Control-Allow-Origin": True
                }
            }]
        )

        cancel.add_method(
            "POST",
            apigw.LambdaIntegration(
                cancel_subscription_lambda,
                proxy=True,
                integration_responses=[{
                    "statusCode": "200",
                    "responseParameters": {
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    }
                }]
            ),
            method_responses=[{
                "statusCode": "200",
                "responseParameters": {
                    "method.response.header.Access-Control-Allow-Origin": True
                }
            }]
        )

        check_subscription.add_method(
            "POST",
            apigw.LambdaIntegration(
                check_subscription_lambda,
                proxy=True,
                integration_responses=[{
                    "statusCode": "200",
                    "responseParameters": {
                        "method.response.header.Access-Control-Allow-Origin": "'*'"
                    }
                }]
            ),
            method_responses=[{
                "statusCode": "200",
                "responseParameters": {
                    "method.response.header.Access-Control-Allow-Origin": True
                }
            }]
        )

        # Output the API URL
        CfnOutput(
            self, "ApiUrl",
            value=api.url,
            description="API Gateway endpoint URL"
        )