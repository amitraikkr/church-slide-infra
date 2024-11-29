from aws_cdk import (
    Stack,
    Duration,
    aws_lambda as _lambda,
    aws_apigateway as apigateway,
)
from constructs import Construct
import os

class OpenaiApiStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

         # Create Lambda function
        presentation_lambda = _lambda.Function(
            self,
            "PresentationGenerator",
            runtime=_lambda.Runtime.NODEJS_18_X,
            handler="index.handler",
            code=_lambda.Code.from_asset("lambda"),
            timeout=Duration.minutes(5),
            environment={
                "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", ""),
            }
        )

        # Create API Gateway
        api = apigateway.RestApi(
            self,
            "PresentationAPI",
            rest_api_name="Presentation Generator API",
            default_cors_preflight_options={
                "allow_origins": apigateway.Cors.ALL_ORIGINS,
                "allow_methods": apigateway.Cors.ALL_METHODS,
            }
        )

        # Add Lambda integration
        presentation = api.root.add_resource("presentation")
        presentation.add_method(
            "POST",
            apigateway.LambdaIntegration(presentation_lambda)
        )