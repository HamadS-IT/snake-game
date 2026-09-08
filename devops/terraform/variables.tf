variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 instance size"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of the AWS key pair to attach (must already exist in AWS — see README step 2)"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "Your IP, allowed to SSH in (x.x.x.x/32)"
  type        = string
}
