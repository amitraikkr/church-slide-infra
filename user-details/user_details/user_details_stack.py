from aws_cdk import (
    Stack,
    RemovalPolicy,
    CfnOutput,
    aws_dynamodb as dynamodb,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_iam as iam,
    Duration
)
from constructs import Construct

class UserDetailsStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create DynamoDB table
        users_table = dynamodb.Table(
            self, "UsersTable",
            partition_key=dynamodb.Attribute(
                name="userId",
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=RemovalPolicy.DESTROY,  # Change to RETAIN for production
            point_in_time_recovery=True
        )

        # Add GSI for email lookups
        users_table.add_global_secondary_index(
            index_name="email-index",
            partition_key=dynamodb.Attribute(
                name="email",
                type=dynamodb.AttributeType.STRING
            ),
            projection_type=dynamodb.ProjectionType.ALL
        )


        # Common Lambda configuration
        lambda_environment = {
            "USERS_TABLE_NAME": users_table.table_name
        }

        # CORS configuration for API Gateway
        cors_options = apigw.CorsOptions(
            allow_origins=['*'],  # Configure for your domains in production
            allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allow_headers=['Content-Type', 'Authorization', 'X-Amz-Date',
                         'X-Api-Key', 'X-Amz-Security-Token'],
            max_age=Duration.seconds(300)
        )

        # Create API Gateway
        api = apigw.RestApi(
            self, "UsersApi",
            rest_api_name="Users Service",
            description="API for managing users",
            default_cors_preflight_options=cors_options
        )

        # Create Lambda functions
        lambda_functions = {}
        for func_name in ["createUser", "updateUser", "getUser", "deleteUser"]:
            lambda_functions[func_name] = lambda_.Function(
                self, func_name,
                runtime=lambda_.Runtime.NODEJS_18_X,
                handler="index.handler",
                code=lambda_.Code.from_asset(f"lambda/{func_name}"),
                environment=lambda_environment,
                # layers=[shared_layer]
            )
            # Grant DynamoDB permissions
            users_table.grant_read_write_data(lambda_functions[func_name])

        # Create API Gateway resources and methods
        users_resource = api.root.add_resource("users")
        
        # POST /users (Create user)
        users_resource.add_method(
            "POST",
            apigw.LambdaIntegration(lambda_functions["createUser"])
        )

        # GET /users (List users)
        users_resource.add_method(
            "GET",
            apigw.LambdaIntegration(lambda_functions["getUser"])
        )

        # User-specific endpoints
        user_resource = users_resource.add_resource("{userId}")

        # GET /users/{userId}
        user_resource.add_method(
            "GET",
            apigw.LambdaIntegration(lambda_functions["getUser"])
        )

        # PUT /users/{userId}
        user_resource.add_method(
            "PUT",
            apigw.LambdaIntegration(lambda_functions["updateUser"])
        )

        # DELETE /users/{userId}
        user_resource.add_method(
            "DELETE",
            apigw.LambdaIntegration(lambda_functions["deleteUser"])
        )

        # Add CloudWatch logging role
        api.add_gateway_response(
            "DEFAULT_4XX",
            type=apigw.ResponseType.DEFAULT_4_XX,
            response_headers={
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            }
        )

        api.add_gateway_response(
            "DEFAULT_5XX",
            type=apigw.ResponseType.DEFAULT_5_XX,
            response_headers={
                'gatewayresponse.header.Access-Control-Allow-Origin': "'*'",
                'gatewayresponse.header.Access-Control-Allow-Headers': "'*'"
            }
        )

        # Stack Outputs
        CfnOutput(
            self, "ApiEndpoint",
            description="API Gateway endpoint URL",
            value=api.url
        )

        CfnOutput(
            self, "UsersTableName",
            description="DynamoDB table name",
            value=users_table.table_name
        )