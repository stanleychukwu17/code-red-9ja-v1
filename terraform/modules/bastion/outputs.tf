output "bastion_public_ip" {
  value       = length(aws_instance.bastion) > 0 ? aws_instance.bastion[0].public_ip : null
  description = "The public IP of the Bastion host"
}
