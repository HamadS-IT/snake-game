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

# Always resolves to the latest Ubuntu 22.04 LTS AMI in the target region,
# instead of hardcoding an AMI ID that goes stale.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "snakegame" {
  name        = "snakegame-sg"
  description = "Snake game server: SSH (key-auth only), HTTP/HTTPS public, app ports for initial testing"

  # Open to the internet rather than just var.ssh_allowed_cidr: GitHub Actions'
  # hosted runners connect from GitHub's own dynamic IP ranges (not your IP),
  # so CI/CD deploy needs SSH reachable from anywhere. Security here relies on
  # key-only auth (no password auth) rather than IP allowlisting.
  ingress {
    description = "SSH (key auth only)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Temporary: direct access to the frontend/backend containers while testing,
  # before a reverse proxy on 80/443 is in front of them (see ansible README).
  ingress {
    description = "Frontend (temporary, admin IP only)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  ingress {
    description = "Backend API (temporary, admin IP only)"
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "snakegame-sg"
  }
}

resource "aws_instance" "snakegame" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.snakegame.id]

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
  }

  tags = {
    Name = "snakegame"
  }
}
