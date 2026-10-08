output "vpc_id" {
  description = "Calculator VPC ID"
  value       = aws_vpc.calculator_vpc.id
}

output "public_subnet_1_id" {
  description = "Public Subnet 1 ID"
  value       = aws_subnet.public_subnet_1.id
}

output "public_subnet_2_id" {
  description = "Public Subnet 2 ID"
  value       = aws_subnet.public_subnet_2.id
}

output "ec2_1_public_ip" {
  description = "Public IP of Calculator EC2 1"
  value       = aws_instance.calculator_ec2_1.public_ip
}

output "ec2_2_public_ip" {
  description = "Public IP of Calculator EC2 2"
  value       = aws_instance.calculator_ec2_2.public_ip
}

output "calculator_url_ec2_1" {
  description = "Calculator URL for EC2 1"
  value       = "http://${aws_instance.calculator_ec2_1.public_ip}:8085"
}

output "calculator_url_ec2_2" {
  description = "Calculator URL for EC2 2"
  value       = "http://${aws_instance.calculator_ec2_2.public_ip}:8085"
}