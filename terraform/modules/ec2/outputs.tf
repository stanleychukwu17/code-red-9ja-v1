output "public_ip" {
  value       = aws_eip.app_eip.public_ip
  description = "The static Elastic IP address of the EC2 instance"
}

output "instance_id" {
  value       = aws_instance.app.id
  description = "The ID of the EC2 instance"
}

output "instance_arn" {
  value       = aws_instance.app.arn
  description = "The ARN of the EC2 instance"
}
