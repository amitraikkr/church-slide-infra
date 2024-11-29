from aws_cdk import (
    Stack,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_s3 as s3,
    aws_iam as iam,
    Duration,
    RemovalPolicy,
    aws_ecr_assets as ecr_assets
)
from constructs import Construct
from aws_cdk.aws_ecr_assets import Platform

class SlideGenerateStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Create S3 bucket for storing presentations
        ppt_bucket = s3.Bucket(
            self, 
            "ChurchFaithSlideAIPPTs",
            bucket_name="churchfaithslideai-pptsv2",
            removal_policy=RemovalPolicy.RETAIN,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT],
                    allowed_origins=["*"],  # Replace with your frontend domain in production
                    allowed_headers=["*"]
                )
            ]
        )

        # Create S3 bucket for templates
        templates_bucket = s3.Bucket(
            self,
            "SlideAITemplates",
            bucket_name="slideai-templates",
            removal_policy=RemovalPolicy.RETAIN,  # Keep the bucket when stack is destroyed
            versioned=True,  # Enable versioning for templates
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL  # Block all public access
        )

        # Create Docker image asset for Lambda
        docker_image = ecr_assets.DockerImageAsset(
            self,
            "PresentationLambdaImage",
            directory="./lambda",  # Directory containing Dockerfile and app.py
            platform=Platform.LINUX_AMD64
        )

        # Create Lambda function using the Docker image
        presentation_lambda = _lambda.DockerImageFunction(
            self,
            "PresentationGeneratorFunction",
            code=_lambda.DockerImageCode.from_ecr(
                docker_image.repository,
                tag_or_digest=docker_image.asset_hash
            ),
            timeout=Duration.seconds(120),
            memory_size=512,
            environment={
                "BUCKET_NAME": ppt_bucket.bucket_name,
                "TEMPLATE_BUCKET": templates_bucket.bucket_name  # Add template bucket name to environment
            }
        )

        # Grant S3 permissions to Lambda
        ppt_bucket.grant_read_write(presentation_lambda)
        templates_bucket.grant_read(presentation_lambda)  # Grant read-only access to templates bucket

        # Create API Gateway
        api = apigw.RestApi(
            self,
            "PresentationAPI",
            rest_api_name="Presentation Generator API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=["*"],
                allow_methods=["POST"],
                allow_headers=["Content-Type"]
            )
        )

        # Add Lambda integration
        presentation_integration = apigw.LambdaIntegration(presentation_lambda)
        
        # Add endpoint
        api.root.add_resource("presentation").add_method(
            "POST",
            presentation_integration
        )
