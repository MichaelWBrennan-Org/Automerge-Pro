output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : aws_api_gateway_stage.main.invoke_url
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.main.id
}

output "lambda_function_names" {
  description = "Names of the Lambda functions"
  value = {
    main_api             = aws_lambda_function.main_api.function_name
    validate_license     = aws_lambda_function.validate_license.function_name
    analytics_processor  = aws_lambda_function.analytics_processor.function_name
    anomaly_detector     = var.enable_monitoring ? aws_lambda_function.anomaly_detector[0].function_name : null
  }
}

output "dynamodb_table_names" {
  description = "Names of the DynamoDB tables"
  value = {
    organizations   = aws_dynamodb_table.organizations.name
    repositories    = aws_dynamodb_table.repositories.name
    merge_rules     = aws_dynamodb_table.merge_rules.name
    pull_requests   = aws_dynamodb_table.pull_requests.name
    analytics_events = aws_dynamodb_table.analytics_events.name
    licenses        = aws_dynamodb_table.licenses.name
    support_tickets = aws_dynamodb_table.support_tickets.name
  }
}

output "secrets_manager_arns" {
  description = "ARNs of the Secrets Manager secrets"
  value = {
    github_private_key = aws_secretsmanager_secret.github_private_key.arn
    webhook_secret     = aws_secretsmanager_secret.webhook_secret.arn
    openai_api_key     = aws_secretsmanager_secret.openai_api_key.arn
    jwt_secret         = aws_secretsmanager_secret.jwt_secret.arn
    slack_webhook      = var.slack_webhook_url != "" ? aws_secretsmanager_secret.slack_webhook[0].arn : null
  }
}

output "sns_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard_url" {
  description = "URL of the CloudWatch dashboard"
  value       = var.enable_monitoring ? "https://console.aws.amazon.com/cloudwatch/home?region=${local.region}#dashboards:name=${aws_cloudwatch_dashboard.main[0].dashboard_name}" : null
}

output "vpc_id" {
  description = "ID of the VPC (if created)"
  value       = var.enable_vpc ? aws_vpc.main[0].id : null
}

output "private_subnet_ids" {
  description = "IDs of the private subnets (if VPC is enabled)"
  value       = var.enable_vpc ? aws_subnet.private[*].id : null
}

output "security_group_ids" {
  description = "Security group IDs"
  value = {
    lambda        = var.enable_vpc ? aws_security_group.lambda[0].id : null
    vpc_endpoints = var.enable_vpc ? aws_security_group.vpc_endpoints[0].id : null
  }
}

output "environment_variables" {
  description = "Environment variables for local development"
  value = {
    NODE_ENV                = var.environment
    GITHUB_APP_ID          = var.github_app_id
    GITHUB_PRIVATE_KEY_ARN = aws_secretsmanager_secret.github_private_key.arn
    WEBHOOK_SECRET_ARN     = aws_secretsmanager_secret.webhook_secret.arn
    OPENAI_API_KEY_ARN     = aws_secretsmanager_secret.openai_api_key.arn
    JWT_SECRET_ARN         = aws_secretsmanager_secret.jwt_secret.arn
    DYNAMODB_TABLE_PREFIX  = local.name_prefix
    SNS_ALERTS_TOPIC_ARN   = aws_sns_topic.alerts.arn
    API_GATEWAY_URL        = var.domain_name != "" ? "https://${var.domain_name}" : aws_api_gateway_stage.main.invoke_url
  }
  sensitive = true
}