from aws_cdk import (
    Stack,
    aws_cognito as cognito,
    aws_iam as iam,
    CfnOutput,
)
from constructs import Construct

class AwsCognitoStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # The code that defines your stack goes here

        # Define User Pool
        user_pool = cognito.UserPool(
            self, "ChurchSlideUserPool",
            user_pool_name="ChurchSlideUserPool",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(
                email=True
            ),
            auto_verify=cognito.AutoVerifiedAttrs(
                email=True
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=False,
                require_uppercase=False,
                require_digits=False,
                require_symbols=False
            )
        )

        # Define User Pool Client
        user_pool_client_web = user_pool.add_client(
            "ChurchSlideUPClientWeb",
            user_pool_client_name="ChurchSlideUPClientWeb",
            auth_flows=cognito.AuthFlow(
                user_password=True
            ),
            prevent_user_existence_errors=True
        )


        # Define User Pool Client
        user_pool_client = user_pool.add_client(
            "ChurchSlideUPClient",
            user_pool_client_name="ChurchSlideUPClient",
            auth_flows=cognito.AuthFlow(
                user_password=True
            ),
            prevent_user_existence_errors=True,
            generate_secret=True
        )

        # Define IAM Role for Lambda (example role, adapt as needed)
        user_pool_client_role = iam.Role(
            self, "ChurchSlideUPClientRole",
            assumed_by=iam.ServicePrincipal("lambda.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name("service-role/AWSLambdaBasicExecutionRole")
            ]
        )

        # Outputs
        CfnOutput(
            self, "ChurchSlideUserPoolId",
            description="Id for the User Pool",
            value=user_pool.user_pool_id
        )
        CfnOutput(
            self, "ChurchSlideUserPoolArn",
            description="Arn for the User Pool",
            value=user_pool.user_pool_arn
        )
        CfnOutput(
            self, "ChurchSlideAppClientIDWeb",
            description="User Pool Client ID for Web",
            value=user_pool_client_web.user_pool_client_id
        )
        CfnOutput(
            self, "ChurchSlideAppClientID",
            description="User Pool Client ID",
            value=user_pool_client.user_pool_client_id
        )