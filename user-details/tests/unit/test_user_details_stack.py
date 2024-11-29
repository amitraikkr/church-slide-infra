import aws_cdk as core
import aws_cdk.assertions as assertions

from user_details.user_details_stack import UserDetailsStack

# example tests. To run these tests, uncomment this file along with the example
# resource in user_details/user_details_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = UserDetailsStack(app, "user-details")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
