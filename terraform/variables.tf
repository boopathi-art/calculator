variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "ami_id" {
  description = "Amazon Linux 2023 AMI ID"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}
variable "github_username" {
  description = "GitHub username"
  type        = string
  default     = "boopathi-art"
  sensitive   = true
}

variable "github_pat" {
  description = "GitHub PAT for GHCR"
  type        = string
  sensitive   = true
}