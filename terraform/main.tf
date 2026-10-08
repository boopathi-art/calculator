terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# =========================
# VPC
# =========================

resource "aws_vpc" "calculator_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "calculator-vpc"
  }
}

# =========================
# Internet Gateway
# =========================

resource "aws_internet_gateway" "calculator_igw" {
  vpc_id = aws_vpc.calculator_vpc.id

  tags = {
    Name = "calculator-igw"
  }
}

# =========================
# Public Subnet 1
# AZ: us-east-1a
# =========================

resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.calculator_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "calculator-public-subnet-1"
  }
}

# =========================
# Public Subnet 2
# AZ: us-east-1b
# =========================

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.calculator_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "us-east-1b"
  map_public_ip_on_launch = true

  tags = {
    Name = "calculator-public-subnet-2"
  }
}

# =========================
# Public Route Table
# =========================

resource "aws_route_table" "public_route_table" {
  vpc_id = aws_vpc.calculator_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.calculator_igw.id
  }

  tags = {
    Name = "calculator-public-route-table"
  }
}

# =========================
# Route Table Association 1
# =========================

resource "aws_route_table_association" "public_subnet_1_association" {
  subnet_id      = aws_subnet.public_subnet_1.id
  route_table_id = aws_route_table.public_route_table.id
}

# =========================
# Route Table Association 2
# =========================

resource "aws_route_table_association" "public_subnet_2_association" {
  subnet_id      = aws_subnet.public_subnet_2.id
  route_table_id = aws_route_table.public_route_table.id
}

# =========================
# Security Group
# =========================

resource "aws_security_group" "calculator_sg" {
  name        = "calculator-sg"
  description = "Security group for calculator EC2 instances"
  vpc_id      = aws_vpc.calculator_vpc.id

  # SSH
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Calculator application
  ingress {
    description = "Calculator application"
    from_port   = 8085
    to_port     = 8085
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "calculator-security-group"
  }
}

# =========================
# EC2 User Data
# =========================

locals {
  user_data = <<-EOF
    #!/bin/bash

    dnf update -y
    dnf install -y docker

    systemctl enable docker
    systemctl start docker

    # Login to GitHub Container Registry
    echo "${var.github_pat}" | docker login ghcr.io \
      -u "${var.github_username}" \
      --password-stdin

    # Pull calculator image from GHCR
    docker pull ghcr.io/boopathi-art/calculator:latest

    # Remove old container if it exists
    docker stop calculator-container || true
    docker rm calculator-container || true

    docker run -d \
  --name calculator-container \
  --restart unless-stopped \
  -p 8085:80 \
  ghcr.io/boopathi-art/calculator:latest
  EOF
}

# =========================
# EC2 Instance 1
# Public Subnet 1
# =========================

resource "aws_instance" "calculator_ec2_1" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public_subnet_1.id
  vpc_security_group_ids      = [aws_security_group.calculator_sg.id]
  associate_public_ip_address = true

  user_data = local.user_data

  tags = {
    Name = "calculator-ec2-1"
  }
}

# =========================
# EC2 Instance 2
# Public Subnet 2
# =========================

resource "aws_instance" "calculator_ec2_2" {
  ami                         = var.ami_id
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public_subnet_2.id
  vpc_security_group_ids      = [aws_security_group.calculator_sg.id]
  associate_public_ip_address = true

  user_data = local.user_data

  tags = {
    Name = "calculator-ec2-2"
  }
}